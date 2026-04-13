/**
 * Extractor registry. Each extractor converts a Blob into a plain-text
 * string. They're called only from convex/kbExtract.js, which is a
 * "use node" action.
 *
 * Design rules for extractors:
 *  - Must not throw for malformed input. Return "" and let the caller
 *    decide how to surface the failure.
 *  - Must return UTF-8 text with newlines as the only line separator.
 *  - Must be cheap to import (no side effects at module load).
 *
 * Adding a new format:
 *  1. Create convex/lib/extractors/<format>.js
 *  2. Register it in both maps below
 *  3. Add its mime type to SUPPORTED_UPLOAD_MIME_TYPES in kbRetrievalConfig.js
 */

import { extractPdf } from "./pdf.js";
import { extractPlainText } from "./text.js";
import { extractHtml } from "./html.js";

const EXTRACTORS_BY_MIME = {
  "application/pdf": extractPdf,
  "text/plain": extractPlainText,
  "text/markdown": extractPlainText,
  "text/x-markdown": extractPlainText,
  "text/html": extractHtml,
  "application/xhtml+xml": extractHtml,
};

const EXTRACTORS_BY_EXTENSION = {
  pdf: extractPdf,
  txt: extractPlainText,
  md: extractPlainText,
  markdown: extractPlainText,
  html: extractHtml,
  htm: extractHtml,
};

/**
 * Resolve the correct extractor for a document. Mime type wins if set;
 * otherwise we fall back to the filename extension.
 *
 * Returns null when no extractor is registered for the format. The caller
 * should mark the document's ingestionStatus as "failed" with a clear
 * error message.
 */
export function resolveExtractor({ mimeType, filename }) {
  if (mimeType) {
    const normalized = mimeType.toLowerCase().split(";")[0].trim();
    const byMime = EXTRACTORS_BY_MIME[normalized];
    if (byMime) return byMime;
  }
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext && EXTRACTORS_BY_EXTENSION[ext]) {
      return EXTRACTORS_BY_EXTENSION[ext];
    }
  }
  return null;
}

export { extractPdf, extractPlainText, extractHtml };
