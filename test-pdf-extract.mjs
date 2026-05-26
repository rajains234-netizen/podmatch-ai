import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

const pdfPath =
  "test-packets/01-good-ready-to-bill-multiple-invoices/01_rate_confirmation_PM-GOOD-1001.pdf";

const buffer = await readFile(pdfPath);

console.log({
  pdfPath,
  bufferSize: buffer.length,
  startsWithPdfHeader: buffer.subarray(0, 5).toString(),
});

const parser = new PDFParse({ data: buffer });

try {
  const result = await parser.getText();

  console.log({
    textLength: result.text.length,
    preview: result.text.slice(0, 1000),
  });
} catch (error) {
  console.error("PDF extraction failed:", error);
} finally {
  await parser.destroy();
}