/**
 * Extracts plain text from a selectable PDF file.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const arrayBuffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdf = await task.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => "str" in item ? item.str : "")
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } finally {
    await task.destroy();
  }
}

/**
 * Extracts plain text from a DOCX file.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
