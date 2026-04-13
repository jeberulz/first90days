/**
 * Minimal HTML → plain text extractor.
 *
 * No external deps (cheerio / turndown add ~500KB and aren't needed for
 * onboarding-doc fidelity). The goal is "index the prose, not the markup".
 *
 * Rules:
 *  - Drop <script>, <style>, and HTML comments outright.
 *  - Turn closing block tags into newlines so paragraph structure survives.
 *  - Strip remaining tags.
 *  - Decode the common named + numeric entities.
 *  - Collapse runs of whitespace but preserve paragraph gaps.
 *
 * When Priority 1 chunking lands we'll revisit this to preserve heading
 * hierarchy for chunk metadata.
 */

const NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
};

export async function extractHtml(blob) {
  try {
    let html = await blob.text();

    // 1. Remove content we never want to see
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<!--[\s\S]*?-->/g, "");

    // 2. Preserve paragraph / line structure
    html = html.replace(/<br\s*\/?>/gi, "\n");
    html = html.replace(
      /<\/(p|div|section|article|header|footer|li|h[1-6]|tr|pre|blockquote|ul|ol|table|td)>/gi,
      "\n"
    );

    // 3. Strip remaining tags
    html = html.replace(/<[^>]+>/g, "");

    // 4. Decode entities
    html = html.replace(/&(amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash|hellip|[rl]squo|[rl]dquo);/g, (m) => NAMED_ENTITIES[m] ?? " ");
    html = html.replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : " ";
    });
    html = html.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const n = parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : " ";
    });

    // 5. Collapse whitespace, preserving paragraph breaks
    html = html
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return html;
  } catch (err) {
    console.warn("[extractors/html] failed", err?.message);
    return "";
  }
}
