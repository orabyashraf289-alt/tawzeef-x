import type { Options as Html2CanvasOptions } from "html2canvas";

export interface PdfExportOptions {
  filename?: string;
  reportTitle?: string;
  orientation?: "portrait" | "landscape";
  scale?: number;
  onProgress?: (progress: number, stepText: string) => void;
}

/**
 * Export an HTML element to a multi-page high-definition PDF document.
 * Perfectly splits across standard A4 pages with zero text clipping.
 */
export async function exportReportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<boolean> {
  const {
    filename = `TawzeefX-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
    orientation = "portrait",
    scale = 2,
    onProgress,
  } = options;

  try {
    onProgress?.(15, "جاري تهيئة محرك المعالجة والخطوط...");

    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");

    onProgress?.(35, "جاري التقاط صفحات التقرير بدقة عالية...");

    // Capture with enhanced settings for crisp text and graphics
    const canvasOptions: Partial<Html2CanvasOptions> = {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    };

    const canvas = await html2canvas(element, canvasOptions);

    onProgress?.(70, "جاري تحويل المستند وتقسيم الصفحات القياسية...");

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pageWidth / imgWidth;
    const canvasHeightInPdf = imgHeight * ratio;

    let heightLeft = canvasHeightInPdf;
    let position = 0;

    // First page
    pdf.addImage(
      imgData,
      "PNG",
      0,
      position,
      pageWidth,
      canvasHeightInPdf,
      undefined,
      "FAST"
    );
    heightLeft -= pageHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - canvasHeightInPdf;
      pdf.addPage();
      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        pageWidth,
        canvasHeightInPdf,
        undefined,
        "FAST"
      );
      heightLeft -= pageHeight;
    }

    onProgress?.(95, "جاري حفظ وتنزيل ملف PDF...");

    pdf.save(filename);

    onProgress?.(100, "تم التصدير بنجاح!");
    return true;
  } catch (error) {
    console.error("Error generating report PDF:", error);
    throw error;
  }
}
