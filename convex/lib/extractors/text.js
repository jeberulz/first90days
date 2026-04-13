/**
 * Plain-text and markdown extractor. No deps — just decode UTF-8 and
 * normalize line endings. Markdown is passed through unchanged: the
 * enrichment LLM understands markdown natively and the chunker (when it
 * lands in Priority 1) will use heading markers to segment.
 */

export async function extractPlainText(blob) {
  try {
    const text = await blob.text();
    // Normalize line endings + trim trailing whitespace per line.
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, ""))
      .join("\n")
      .trim();
  } catch (err) {
    console.warn("[extractors/text] failed", err?.message);
    return "";
  }
}
