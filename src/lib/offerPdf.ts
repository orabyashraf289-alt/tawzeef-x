import jsPDF from "jspdf";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";

interface OfferForPdf {
  position: string;
  department: string | null;
  salary: number;
  currency: string;
  start_date: string | null;
  offer_type: string;
  benefits: string[] | null;
  additional_terms: string | null;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  signature_url: string | null;
}

const OFFER_TYPE_AR: Record<string, string> = {
  "full-time": "دوام كامل",
  "part-time": "دوام جزئي",
  "contract": "عقد مؤقت",
};

function parseSalaryBreakdown(terms: string | null) {
  if (!terms) return null;
  const match = terms.match(/تفصيل الراتب:|Salary Breakdown:/);
  if (!match) return null;
  const lines = terms.split("\n");
  const startIdx = lines.findIndex(l => l.includes("تفصيل الراتب:") || l.includes("Salary Breakdown:"));
  if (startIdx === -1) return null;
  const items: { label: string; amount: string }[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) break;
    const parts = line.split(":");
    if (parts.length >= 2) {
      items.push({ label: parts[0].trim(), amount: parts.slice(1).join(":").trim() });
    }
  }
  return items.length > 0 ? items : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateOfferPdf(offer: OfferForPdf) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  // Colors
  const primary: [number, number, number] = [99, 102, 241];
  const gray: [number, number, number] = [107, 114, 128];
  const dark: [number, number, number] = [31, 41, 55];

  // Load logo
  try {
    const logoImg = await loadImage(tawzeefLogo);
    doc.addImage(logoImg, "PNG", pageW / 2 - 8, y, 16, 16);
    y += 22;
  } catch { y += 5; }

  // Header bar
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("عرض وظيفي", pageW / 2, y + 9.5, { align: "center" });
  y += 22;

  // Position
  doc.setTextColor(...dark);
  doc.setFontSize(18);
  doc.text(offer.position, pageW / 2, y, { align: "center" });
  y += 8;

  if (offer.department) {
    doc.setFontSize(11);
    doc.setTextColor(...gray);
    doc.text(`القسم: ${offer.department}`, pageW / 2, y, { align: "center" });
    y += 8;
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Salary Section
  const breakdown = parseSalaryBreakdown(offer.additional_terms);
  doc.setFontSize(13);
  doc.setTextColor(...primary);
  doc.text("تفاصيل الراتب", pageW - margin, y, { align: "right" });
  y += 8;

  if (breakdown && breakdown.length > 0) {
    const totalItem = breakdown.find(b => b.label === "الإجمالي" || b.label === "Total");
    const details = breakdown.filter(b => b.label !== "الإجمالي" && b.label !== "Total");

    // Table header
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text("البند", pageW - margin - 5, y + 5.5, { align: "right" });
    doc.text("المبلغ (ر.س)", margin + 5, y + 5.5, { align: "left" });
    y += 11;

    details.forEach((item) => {
      doc.setTextColor(...dark);
      doc.setFontSize(10);
      doc.text(item.label, pageW - margin - 5, y, { align: "right" });
      doc.text(item.amount, margin + 5, y, { align: "left" });
      y += 7;
    });

    // Total row
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.8);
    doc.line(margin, y - 2, pageW - margin, y - 2);
    y += 3;
    doc.setFontSize(12);
    doc.setTextColor(...primary);
    doc.text("الإجمالي", pageW - margin - 5, y, { align: "right" });
    const formattedTotal = new Intl.NumberFormat("ar-SA").format(offer.salary);
    doc.text(`${formattedTotal} ر.س`, margin + 5, y, { align: "left" });
    y += 10;
  } else {
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    const formattedSalary = new Intl.NumberFormat("ar-SA").format(offer.salary);
    doc.text(`${formattedSalary} ${offer.currency === "SAR" ? "ر.س" : offer.currency}`, pageW / 2, y, { align: "center" });
    y += 10;
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Info grid
  doc.setFontSize(13);
  doc.setTextColor(...primary);
  doc.text("معلومات العرض", pageW - margin, y, { align: "right" });
  y += 8;

  const infoItems: [string, string][] = [];
  infoItems.push(["نوع العمل", OFFER_TYPE_AR[offer.offer_type] || offer.offer_type]);
  if (offer.start_date) {
    infoItems.push(["تاريخ البدء", new Date(offer.start_date).toLocaleDateString("ar-SA")]);
  }
  if (offer.expires_at) {
    infoItems.push(["صلاحية العرض", new Date(offer.expires_at).toLocaleDateString("ar-SA")]);
  }
  if (offer.sent_at) {
    infoItems.push(["تاريخ الإرسال", new Date(offer.sent_at).toLocaleDateString("ar-SA")]);
  }

  infoItems.forEach(([label, value]) => {
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text(label, pageW - margin - 5, y, { align: "right" });
    doc.setTextColor(...dark);
    doc.text(value, margin + 5, y, { align: "left" });
    y += 7;
  });
  y += 3;

  // Benefits
  if (offer.benefits && offer.benefits.length > 0) {
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text("المزايا والفوائد", pageW - margin, y, { align: "right" });
    y += 8;

    offer.benefits.forEach((b) => {
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(`• ${b}`, pageW - margin - 5, y, { align: "right" });
      y += 6;
    });
    y += 3;
  }

  // Additional terms (excluding the salary breakdown part)
  if (offer.additional_terms) {
    let termsText = offer.additional_terms;
    const breakdownIdx = termsText.search(/تفصيل الراتب:|Salary Breakdown:/);
    if (breakdownIdx !== -1) {
      termsText = termsText.substring(0, breakdownIdx).trim();
    }
    if (termsText) {
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
      doc.setFontSize(13);
      doc.setTextColor(...primary);
      doc.text("شروط إضافية", pageW - margin, y, { align: "right" });
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      const lines = doc.splitTextToSize(termsText, contentW - 10);
      doc.text(lines, pageW - margin - 5, y, { align: "right" });
      y += lines.length * 5 + 5;
    }
  }

  // Signature
  if (offer.signature_url) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text("التوقيع الإلكتروني", pageW - margin, y, { align: "right" });
    y += 5;

    try {
      const sigImg = await loadImage(offer.signature_url);
      const sigW = 60;
      const sigH = 25;
      doc.addImage(sigImg, "PNG", pageW / 2 - sigW / 2, y, sigW, sigH);
      y += sigH + 5;
    } catch { /* skip */ }
  }

  // Status badge
  y += 5;
  const statusMap: Record<string, { label: string; color: [number, number, number] }> = {
    accepted: { label: "مقبول ✅", color: [16, 185, 129] },
    rejected: { label: "مرفوض ❌", color: [239, 68, 68] },
    sent: { label: "مرسل", color: [59, 130, 246] },
    viewed: { label: "تم الاطلاع", color: [245, 158, 11] },
    draft: { label: "مسودة", color: [156, 163, 175] },
  };
  const st = statusMap[offer.status] || { label: offer.status, color: gray };
  doc.setFillColor(...st.color);
  doc.roundedRect(pageW / 2 - 20, y, 40, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(st.label, pageW / 2, y + 5.5, { align: "center" });

  // Footer
  const footerY = 285;
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("هذا المستند صادر إلكترونياً عبر منصة توظيف-X", pageW / 2, footerY, { align: "center" });

  doc.save(`عرض-وظيفي-${offer.position}.pdf`);
}
