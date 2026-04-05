import mammoth from "mammoth";
import * as XLSX from "xlsx";

/**
 * Extract text content from various document formats.
 * Returns the extracted text for RAG indexing.
 */
export async function extractText(
  buffer: Buffer,
  contentType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  // PDF
  if (contentType === "application/pdf" || ext === "pdf") {
    return extractPdf(buffer);
  }

  // DOCX
  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return extractDocx(buffer);
  }

  // PPTX
  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    return extractPptx(buffer);
  }

  // XLSX
  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    return extractXlsx(buffer);
  }

  // Images — return empty, will use Vision API separately
  if (contentType.startsWith("image/")) {
    return "";
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPptx(buffer: Buffer): Promise<string> {
  // PPTX is a ZIP with XML slides — use xlsx to parse the ZIP structure
  // and extract text from slide XML
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const texts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort();

  for (const slideFile of slideFiles) {
    const slideXml = await zip.files[slideFile].async("text");
    // Extract text from <a:t> tags
    const matches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
    if (matches) {
      const slideText = matches
        .map((m) => m.replace(/<\/?a:t>/g, ""))
        .join(" ");
      const slideNum = slideFile.match(/slide(\d+)/)?.[1] || "?";
      texts.push(`[Slide ${slideNum}] ${slideText}`);
    }
  }

  return texts.join("\n\n");
}

function extractXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const texts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: " | ", RS: "\n" });
    if (csv.trim()) {
      texts.push(`[Feuille: ${sheetName}]\n${csv}`);
    }
  }

  return texts.join("\n\n");
}
