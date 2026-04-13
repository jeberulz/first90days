/**
 * Heading-aware recursive chunker for KB documents.
 *
 * Goal: split a source document into semantically coherent chunks while
 * preserving heading context so retrieval can surface "the section about X"
 * instead of the middle of a random paragraph.
 *
 * Algorithm (in rough priority order):
 *   1. Docs at or below CHUNK_SINGLE_CHUNK_CEILING return a single chunk
 *      with no heading path. Keeps the hot path fast and avoids bloating
 *      kbChunks with one-row entries for every short note.
 *   2. Parse markdown-style ATX headings (`# `, `## `, `### `). Build a
 *      heading stack so every content line carries the full breadcrumb.
 *   3. Segment into sections by heading boundaries. A section = the body
 *      text that lives under a given heading stack.
 *   4. Inside a section, greedily pack paragraphs into chunks of up to
 *      ~CHUNK_TARGET_CHARS, carrying CHUNK_OVERLAP_CHARS of tail context
 *      between adjacent chunks from the same section. Overlap is only
 *      carried within a section so we don't smear heading boundaries.
 *   5. Paragraphs bigger than targetChars get split on sentence boundaries.
 *      Sentences bigger than targetChars are left alone (rare; downstream
 *      embed model has ~8k token headroom anyway).
 *
 * Char offsets are tracked relative to the ORIGINAL input `content` so the
 * UI can later highlight a chunk back onto the source text if needed.
 *
 * Non-goals:
 *   - HTML / PDF post-extraction structure (we rely on the extractors to
 *     emit something resembling markdown or plain prose).
 *   - Setext-style headings (===/---). Uncommon in practice, not worth
 *     the complexity.
 *   - Token-accurate splitting. We use char budgets; 1 token ≈ 4 chars is
 *     a fine heuristic for text-embedding-3-small.
 */

import {
  CHUNK_TARGET_CHARS,
  CHUNK_OVERLAP_CHARS,
  CHUNK_SINGLE_CHUNK_CEILING,
} from "./kbRetrievalConfig.js";

/**
 * Cheap FNV-1a — same algorithm used elsewhere in the pipeline so chunk
 * content hashes are comparable across writes.
 */
function fnvHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function chunkContentHash(text) {
  return `fnv1a:${fnvHash(text || "")}:${(text || "").length}`;
}

function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

/**
 * Parse content into heading-delimited sections.
 * Returns Array<{ headingPath: string[], text: string, charStart, charEnd }>.
 * Sections have their heading LINE stripped; text is just the body that
 * lives under the heading stack.
 */
function parseSections(content) {
  const text = content || "";
  const sections = [];
  const stack = []; // [{ level, title }]
  let cursor = 0;
  let bodyStart = 0;
  let body = "";

  const flush = (endOffset) => {
    if (body.trim()) {
      sections.push({
        headingPath: stack.map((s) => s.title),
        text: body.replace(/\n+$/, ""),
        charStart: bodyStart,
        charEnd: endOffset,
      });
    }
  };

  // Iterate line-by-line but preserve exact char offsets including newlines.
  // split("\n") drops the newline — we add 1 back per line except possibly
  // the last. We normalize CRLF upstream so this is safe.
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasNewline = i < lines.length - 1;
    const lineLen = line.length + (hasNewline ? 1 : 0);
    const headingMatch = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      // Close previous section
      flush(cursor);
      const level = headingMatch[1].length;
      // Pop the stack to the level of this heading (exclusive).
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack.push({ level, title: headingMatch[2].trim() });
      bodyStart = cursor + lineLen;
      body = "";
    } else {
      body += line + (hasNewline ? "\n" : "");
    }
    cursor += lineLen;
  }
  flush(cursor);

  // If the doc has no headings at all, parseSections returns a single
  // section with empty headingPath and the full body. Callers rely on this.
  if (sections.length === 0 && text.trim()) {
    sections.push({
      headingPath: [],
      text: text.replace(/\n+$/, ""),
      charStart: 0,
      charEnd: text.length,
    });
  }
  return sections;
}

/**
 * Pack a section's text into chunks of ~targetChars, carrying overlap
 * between adjacent chunks. Returns Array<{text, start, end}> where
 * start/end are offsets WITHIN the section text (not the full doc).
 */
function packSectionText(sectionText, targetChars, overlapChars) {
  const text = sectionText;
  if (text.length <= targetChars) {
    return [{ text: text.trim(), start: 0, end: text.length }];
  }

  // Split into paragraphs, tracking each paragraph's offsets.
  const paragraphs = [];
  const paraRegex = /\n\s*\n+/g;
  let lastIdx = 0;
  let m;
  while ((m = paraRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      paragraphs.push({
        text: text.slice(lastIdx, m.index),
        start: lastIdx,
        end: m.index,
      });
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    paragraphs.push({
      text: text.slice(lastIdx),
      start: lastIdx,
      end: text.length,
    });
  }

  // Greedy pack paragraphs into chunks.
  const chunks = [];
  let current = null; // { text, start, end }
  for (const p of paragraphs) {
    if (!p.text.trim()) continue;
    // Paragraph is itself larger than targetChars → split it on sentence
    // boundaries first. Sentences stay intact; oversize sentences pass
    // through unchanged.
    if (p.text.length > targetChars) {
      if (current) {
        chunks.push(current);
        current = null;
      }
      for (const sc of splitOversizedParagraph(p, targetChars)) {
        chunks.push(sc);
      }
      continue;
    }
    if (!current) {
      current = { text: p.text, start: p.start, end: p.end };
      continue;
    }
    const joined = current.text.length + 2 + p.text.length;
    if (joined <= targetChars) {
      current.text += "\n\n" + p.text;
      current.end = p.end;
    } else {
      chunks.push(current);
      // Start next chunk with trailing-overlap from the one we just closed.
      const overlapStart = Math.max(current.end - overlapChars, current.start);
      const overlapText = text.slice(overlapStart, current.end);
      current = {
        text: overlapText ? overlapText + "\n\n" + p.text : p.text,
        start: overlapStart,
        end: p.end,
      };
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c) => ({
    text: c.text.trim(),
    start: c.start,
    end: c.end,
  }));
}

/**
 * Split a paragraph that exceeds targetChars on sentence boundaries.
 * Char offsets are approximated by walking from p.start forward.
 */
function splitOversizedParagraph(p, targetChars) {
  // Very simple sentence splitter — good enough for English prose. Uses
  // lookbehind for `[.!?]` followed by whitespace.
  const sentences = p.text.split(/(?<=[.!?])\s+/);
  const out = [];
  let cursor = p.start;
  let buf = "";
  let bufStart = cursor;
  for (const s of sentences) {
    if (!s) continue;
    const addLen = (buf ? 1 : 0) + s.length;
    if (buf.length === 0) {
      buf = s;
      bufStart = cursor;
    } else if (buf.length + addLen <= targetChars) {
      buf += " " + s;
    } else {
      out.push({ text: buf, start: bufStart, end: bufStart + buf.length });
      buf = s;
      bufStart = cursor;
    }
    cursor += s.length + 1; // +1 for the whitespace we split on
  }
  if (buf) out.push({ text: buf, start: bufStart, end: bufStart + buf.length });
  return out;
}

/**
 * Top-level chunker. Callers pass the document's full content and receive
 * an ordered list of chunks annotated with heading path + char offsets.
 *
 * @param {Object} args
 * @param {string} args.content
 * @param {number} [args.targetChars=CHUNK_TARGET_CHARS]
 * @param {number} [args.overlapChars=CHUNK_OVERLAP_CHARS]
 * @param {number} [args.singleChunkCeiling=CHUNK_SINGLE_CHUNK_CEILING]
 * @returns {Array<{
 *   chunkIndex: number,
 *   text: string,
 *   charStart: number,
 *   charEnd: number,
 *   headingPath: string[],
 *   tokenEstimate: number,
 *   contentHash: string
 * }>}
 */
export function chunkDocument({
  content,
  targetChars = CHUNK_TARGET_CHARS,
  overlapChars = CHUNK_OVERLAP_CHARS,
  singleChunkCeiling = CHUNK_SINGLE_CHUNK_CEILING,
} = {}) {
  const text = (content || "").replace(/\r\n/g, "\n");
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Fast path: short docs become a single chunk with no heading parsing.
  if (text.length <= singleChunkCeiling) {
    return [
      {
        chunkIndex: 0,
        text: trimmed,
        charStart: 0,
        charEnd: text.length,
        headingPath: [],
        tokenEstimate: estimateTokens(trimmed),
        contentHash: chunkContentHash(trimmed),
      },
    ];
  }

  const sections = parseSections(text);
  const chunks = [];
  let nextIndex = 0;
  for (const section of sections) {
    const packed = packSectionText(section.text, targetChars, overlapChars);
    for (const p of packed) {
      if (!p.text) continue;
      const charStart = section.charStart + p.start;
      const charEnd = section.charStart + p.end;
      chunks.push({
        chunkIndex: nextIndex++,
        text: p.text,
        charStart,
        charEnd,
        headingPath: section.headingPath,
        tokenEstimate: estimateTokens(p.text),
        contentHash: chunkContentHash(p.text),
      });
    }
  }

  // Edge case: a document with only whitespace between headings would
  // produce zero sections. Fall back to a single chunk over the full text
  // so we never silently drop content.
  if (chunks.length === 0) {
    chunks.push({
      chunkIndex: 0,
      text: trimmed,
      charStart: 0,
      charEnd: text.length,
      headingPath: [],
      tokenEstimate: estimateTokens(trimmed),
      contentHash: chunkContentHash(trimmed),
    });
  }
  return chunks;
}

/**
 * Render a chunk's heading path as a `>`-delimited breadcrumb. Used in
 * prompt context blocks so the LLM can disambiguate sections.
 */
export function formatHeadingPath(headingPath) {
  if (!headingPath || headingPath.length === 0) return "";
  return headingPath.join(" › ");
}
