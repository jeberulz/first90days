import { describe, it, expect } from "vitest";
import { extractPlainText } from "./extractors/text.js";
import { extractHtml } from "./extractors/html.js";
import { resolveExtractor } from "./extractors/index.js";

/**
 * Unit tests for KB file extractors.
 *
 * The PDF extractor isn't tested here because pdf-parse v2 pulls in the
 * full pdfjs-dist worker which doesn't load cleanly inside the edge
 * runtime vitest uses. It's covered manually end-to-end via the upload
 * flow. If we add a Node-runtime test target we can bring PDF tests back.
 */

function blobFromString(text, type = "text/plain") {
  return new Blob([text], { type });
}

describe("extractPlainText", () => {
  it("passes plain text through unchanged modulo whitespace normalization", async () => {
    const out = await extractPlainText(
      blobFromString("hello\r\nworld\r\n   trailing   \n")
    );
    expect(out).toBe("hello\nworld\n   trailing");
  });

  it("returns empty string on a Blob that throws during .text()", async () => {
    const broken = {
      text: async () => {
        throw new Error("boom");
      },
    };
    const out = await extractPlainText(broken);
    expect(out).toBe("");
  });
});

describe("extractHtml", () => {
  it("strips tags and decodes common entities", async () => {
    const html =
      "<html><body><h1>Title &amp; subtitle</h1><p>Body &quot;line&quot;</p></body></html>";
    const out = await extractHtml(blobFromString(html, "text/html"));
    expect(out).toContain("Title & subtitle");
    expect(out).toContain('Body "line"');
    expect(out).not.toContain("<");
  });

  it("drops script and style content entirely", async () => {
    const html = `
      <html>
        <head>
          <style>body{color:red}</style>
          <script>alert('pwn')</script>
        </head>
        <body><p>Visible</p></body>
      </html>
    `;
    const out = await extractHtml(blobFromString(html, "text/html"));
    expect(out).toContain("Visible");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("color:red");
  });

  it("preserves paragraph breaks from block-level tags", async () => {
    const html = "<div>one</div><div>two</div><div>three</div>";
    const out = await extractHtml(blobFromString(html, "text/html"));
    expect(out.split("\n").filter(Boolean)).toEqual(["one", "two", "three"]);
  });

  it("handles numeric character references", async () => {
    const html = "<p>em&#8212;dash</p>";
    const out = await extractHtml(blobFromString(html, "text/html"));
    expect(out).toContain("em—dash");
  });

  it("returns empty string on unreadable input", async () => {
    const broken = {
      text: async () => {
        throw new Error("nope");
      },
    };
    expect(await extractHtml(broken)).toBe("");
  });
});

describe("resolveExtractor", () => {
  it("resolves by mime type first", () => {
    const fn = resolveExtractor({
      mimeType: "text/html",
      filename: "notes.pdf",
    });
    // HTML extractor wins over filename extension
    expect(fn).toBe(
      resolveExtractor({ mimeType: "text/html", filename: "other.html" })
    );
  });

  it("falls back to filename extension when mime type is missing", () => {
    const fn = resolveExtractor({ mimeType: undefined, filename: "README.md" });
    expect(typeof fn).toBe("function");
  });

  it("normalizes mime type parameters (application/pdf; charset=...)", () => {
    const fn = resolveExtractor({
      mimeType: "application/pdf; charset=binary",
      filename: "spec.pdf",
    });
    expect(typeof fn).toBe("function");
  });

  it("returns null for unsupported formats", () => {
    const fn = resolveExtractor({
      mimeType: "image/png",
      filename: "chart.png",
    });
    expect(fn).toBeNull();
  });

  it("returns null when both mime and filename are missing", () => {
    expect(resolveExtractor({})).toBeNull();
  });
});
