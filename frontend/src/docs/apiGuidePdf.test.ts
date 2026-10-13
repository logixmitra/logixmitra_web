import { describe, it, expect } from "vitest";
import pdfMake from "pdfmake/build/pdfmake";
import { buildApiGuideDoc, downloadApiGuidePdf } from "./apiGuidePdf";

describe("apiGuidePdf", () => {
  it("builds a pdfmake doc-definition object (not a bare array)", () => {
    const doc = buildApiGuideDoc() as any;

    // pdfmake's createPdf() rejects arrays with
    // "Parameter 'docDefinition' has an invalid type. Object expected."
    expect(doc).toBeTypeOf("object");
    expect(Array.isArray(doc)).toBe(false);
    expect(Array.isArray(doc.content)).toBe(true);
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.pageSize).toBe("A4");
    expect(doc.defaultStyle?.font).toBe("Roboto");
  });

  it("renders the full guide to a valid PDF (incl. Courier code blocks)", async () => {
    const doc = buildApiGuideDoc() as any;

    // The guide uses font: "Courier" for code blocks — this fails with
    // "Font 'Courier' ... is not defined in the font section" unless the
    // standard font container is registered by apiGuidePdf. Code blocks are
    // wrapped in a { stack: [label, monoBlock] } helper, so search nested.
    const usesCourier = JSON.stringify(doc.content).includes('"font":"Courier"');
    expect(usesCourier).toBe(true);

    const buffer = (await (pdfMake as any).createPdf(doc).getBuffer()) as Uint8Array;
    const header = String.fromCharCode(...Array.from(buffer.slice(0, 4)));

    expect(header).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(5000);
  }, 60000);

  it("returns a promise from downloadApiGuidePdf so callers can catch failures", async () => {
    const result = downloadApiGuidePdf();
    expect(result).toBeInstanceOf(Promise);
    // file-saver/saveAs may be unavailable under jsdom — only the PDF build
    // errors matter here, and rendering itself is covered by the test above.
    await (result as Promise<void>).catch(() => undefined);
  }, 60000);
});
