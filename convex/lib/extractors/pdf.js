/**
 * PDF → plain text via pdf-parse (v2).
 *
 * pdf-parse v2 is a class-based API built on top of pdfjs-dist. Typical
 * usage:
 *
 *     import { PDFParse } from "pdf-parse";
 *     const parser = new PDFParse({ data: uint8Array });
 *     const result = await parser.getText();
 *     // result.text is the full document text
 *     await parser.destroy();
 *
 * This only runs inside convex/kbExtract.js which is a "use node" action,
 * so Buffer and the Node runtime are both available. We use a dynamic
 * import so the dep is only loaded when a PDF actually arrives — any
 * bundling/runtime failure surfaces as a per-doc extraction error rather
 * than a module-load crash that breaks unrelated actions.
 *
 * Failure modes:
 *   - Image-only (scanned) PDFs return empty text. Caller treats "" as
 *     "unsupported content" and surfaces a user-facing error.
 *   - Password-protected PDFs throw — we catch and return "".
 */

export async function extractPdf(blob) {
  let parser = null;
  try {
    const mod = await import("pdf-parse");
    const PDFParse = mod.PDFParse || mod.default?.PDFParse;
    if (!PDFParse) {
      console.warn("[extractors/pdf] PDFParse class not found in module");
      return "";
    }

    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    parser = new PDFParse({ data });
    const result = await parser.getText();

    const text = (result?.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
  } catch (err) {
    console.warn("[extractors/pdf] failed", err?.message);
    return "";
  } finally {
    if (parser && typeof parser.destroy === "function") {
      try {
        await parser.destroy();
      } catch {
        /* ignore */
      }
    }
  }
}
