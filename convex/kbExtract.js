"use node";

/**
 * M0 — File extraction stage of the KB pipeline.
 *
 * Sits upstream of embedding (M1) and enrichment (M2). Invoked by
 * kbPipeline.run when a document has a storageId set and its
 * ingestionStatus is "pending". After a successful extract the doc's
 * content is populated, ingestionStatus flips to "ready", and the
 * pipeline is re-kicked so embed + enrich can run against the real text.
 *
 * Lives in its own file because:
 *   1. It needs Node.js built-ins (Buffer) for pdf-parse.
 *   2. Bundling a Node-only dep (pdf-parse) into the V8 runtime would
 *      break unrelated mutations at module load time.
 *
 * Failure handling:
 *   - Extractors never throw; they return "" on parse failure.
 *   - An empty extraction result is treated as a hard failure and the
 *     doc is marked ingestionStatus: "failed" with a user-visible error
 *     so the front-end upload UI can surface "we couldn't read that file".
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { resolveExtractor } from "./lib/extractors/index.js";
import { EXTRACTED_TEXT_MAX_CHARS } from "./lib/kbRetrievalConfig.js";

export const runExtract = internalAction({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    // 1. Find the extract_text job row (may or may not exist — pipeline
    //    inserts one when needed, but retries may skip this).
    const job = await ctx.runQuery(internal.kbInternal.findJobInternal, {
      documentId,
      kind: "extract_text",
    });
    if (job) {
      await ctx.runMutation(internal.kbInternal.markJobStarted, {
        jobId: job._id,
      });
    }

    // 2. Flip ingestion status so the UI can show an "extracting" state.
    await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
      documentId,
      ingestionStatus: "extracting",
    });

    try {
      // 3. Load the doc + fetch its file blob from Convex storage.
      const doc = await ctx.runQuery(
        internal.kbInternal.getDocumentInternal,
        { documentId }
      );
      if (!doc) throw new Error(`document ${documentId} not found`);
      if (!doc.storageId) {
        throw new Error(`document ${documentId} has no storageId`);
      }

      const blob = await ctx.storage.get(doc.storageId);
      if (!blob) {
        throw new Error(
          `storage object ${doc.storageId} not found (may have been deleted)`
        );
      }

      // 4. Resolve an extractor by mime type first, filename as fallback.
      const extractor = resolveExtractor({
        mimeType: doc.mimeType,
        filename: doc.title,
      });
      if (!extractor) {
        throw new Error(
          `Unsupported file type (mime=${doc.mimeType ?? "unknown"})`
        );
      }

      // 5. Run the extractor. Extractors never throw; "" means "couldn't
      //    read any text" (e.g. image-only PDF).
      let text = await extractor(blob);
      if (!text || !text.trim()) {
        throw new Error(
          "No text could be extracted (the file may be image-only or corrupted)"
        );
      }

      // 6. Cap length. Anything past EXTRACTED_TEXT_MAX_CHARS is almost
      //    certainly noise from a reference doc the user wouldn't want
      //    embedded whole anyway.
      if (text.length > EXTRACTED_TEXT_MAX_CHARS) {
        text = text.slice(0, EXTRACTED_TEXT_MAX_CHARS);
      }

      // 7. Persist the extracted content. This mutation also rehashes
      //    the doc so embed/enrich dedup logic works against the real
      //    content, not the empty placeholder.
      await ctx.runMutation(internal.kbInternal.setExtractedContent, {
        documentId,
        content: text,
      });

      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "done",
        });
      }

      // 8. Re-kick the pipeline. kbPipeline.run sees ingestionStatus:
      //    "ready" + non-empty content and enqueues embed + enrich.
      await ctx.scheduler.runAfter(0, internal.kbPipeline.run, {
        documentId,
      });
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error(`[kbExtract.runExtract] ${documentId}: ${msg}`);
      await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
        documentId,
        ingestionStatus: "failed",
        lastError: msg,
      });
      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "failed",
          error: msg,
        });
      }
      // Intentionally do NOT rethrow — workpool retries won't help when
      // the file is unsupported or empty. The job is marked failed and
      // the user can re-upload.
    }
  },
});
