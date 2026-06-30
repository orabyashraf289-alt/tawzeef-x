import html2canvas from "html2canvas";
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
  company_name?: string;
  company_logo?: string;
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

export async function generateOfferPdf(offer: OfferForPdf) {
  // Create dynamic print container
  const container = document.createElement("div");
  container.dir = "rtl";
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "794px"; // Standard A4 pixel width at 96 DPI (approx)
  container.style.padding = "40px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1f2937";
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";
  container.style.boxSizing = "border-box";

  // Parse salary breakdown & GOSI if present
  const breakdown = parseSalaryBreakdown(offer.additional_terms);
  let cleanTerms = offer.additional_terms || "";
  const breakdownIdx = cleanTerms.search(/تفصيل الراتب:|Salary Breakdown:/);
  if (breakdownIdx !== -1) {
    const lines = cleanTerms.substring(breakdownIdx).split("\n");
    let endIdx = 1;
    for (; endIdx < lines.length; endIdx++) {
      if (!lines[endIdx].trim()) { endIdx++; break; }
    }
    cleanTerms = (cleanTerms.substring(0, breakdownIdx) + cleanTerms.substring(breakdownIdx).split("\n").slice(endIdx).join("\n")).trim();
  }

  // Get GOSI and Net details from breakdown
  const gosiItem = breakdown?.find(b => b.label.includes("التأمينات") || b.label.toLowerCase().includes("gosi"));
  const netItem = breakdown?.find(b => b.label.includes("صافي") || b.label.toLowerCase().includes("net"));
  const totalItem = breakdown?.find(b => b.label === "الإجمالي" || b.label === "Total");
  const detailItems = breakdown?.filter(b => b !== gosiItem && b !== netItem && b !== totalItem) || [];

  // Build HTML Structure
  container.innerHTML = `
    <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 40px; background: #ffffff; position: relative; box-sizing: border-box;">
      <!-- Header Border Accent -->
      <div style="height: 6px; background: linear-gradient(to left, #6366f1, #4f46e5); border-radius: 6px 6px 0 0; position: absolute; top: 0; left: 0; right: 0;"></div>
      
      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${offer.company_logo || tawzeefLogo}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px;" />
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #4f46e5; margin: 0; letter-spacing: -0.5px;">${offer.company_name || "Tawzeef-X"}</h1>
            <p style="font-size: 10px; color: #6b7280; margin: 2px 0 0 0;">${offer.company_name ? "عرض وظيفي رسمي" : "منصة التوظيف الذكية"}</p>
          </div>
        </div>
        <div style="text-align: left; font-size: 12px; color: #6b7280; line-height: 1.6;">
          <div>التاريخ: ${new Date().toLocaleDateString("ar-SA")}</div>
          <div>مرجع العرض: OFF-${offer.position.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}</div>
        </div>
      </div>

      <!-- Document Title -->
      <div style="text-align: center; margin-bottom: 35px;">
        <span style="background: #f0f3ff; color: #4f46e5; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; border: 1px solid #e0e7ff; display: inline-block;">عرض عمل رسمي موحد</span>
        <h2 style="font-size: 24px; font-weight: 800; color: #111827; margin: 15px 0 5px 0;">خطاب عرض العمل الرسمي</h2>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">تم إعداد هذا العرض بموجب أنظمة وقوانين وزارة الموارد البشرية والعمل بالمملكة العربية السعودية</p>
      </div>

      <!-- Introduction -->
      <div style="margin-bottom: 30px; font-size: 14px; line-height: 1.8; color: #374151; text-align: right;">
        <p>يسرنا أن نتقدم لكم بهذا العرض الوظيفي للانضمام إلى فريق عملنا، متمنين لكم مسيرة مهنية حافلة بالنجاح والإنجازات المشتركة. فيما يلي تفاصيل وبنود العرض:</p>
      </div>

      <!-- Info Grid (Flex Layout for HTML2Canvas safety) -->
      <div style="display: flex; flex-wrap: wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: right; box-sizing: border-box;">
        <div style="width: 50%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; box-sizing: border-box; padding-left: 10px;">
          <div style="font-size: 12px; color: #6b7280;">المسمى الوظيفي</div>
          <div style="font-size: 14px; font-weight: 700; color: #111827;">${offer.position}</div>
        </div>
        <div style="width: 50%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; box-sizing: border-box; padding-left: 10px;">
          <div style="font-size: 12px; color: #6b7280;">القسم / الإدارة</div>
          <div style="font-size: 14px; font-weight: 700; color: #111827;">${offer.department || "غير محدد"}</div>
        </div>
        <div style="width: 50%; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; padding-left: 10px;">
          <div style="font-size: 12px; color: #6b7280;">نوع التعاقد</div>
          <div style="font-size: 14px; font-weight: 700; color: #111827;">${OFFER_TYPE_AR[offer.offer_type] || offer.offer_type}</div>
        </div>
        <div style="width: 50%; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; padding-left: 10px;">
          <div style="font-size: 12px; color: #6b7280;">تاريخ البدء المتوقع</div>
          <div style="font-size: 14px; font-weight: 700; color: #111827;">${offer.start_date ? new Date(offer.start_date).toLocaleDateString("ar-SA") : "غير محدد"}</div>
        </div>
      </div>

      <!-- Salary & GOSI Table -->
      <div style="margin-bottom: 30px; text-align: right;">
        <h3 style="font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 12px 0; border-right: 3px solid #4f46e5; padding-right: 8px;">تفاصيل المزايا المالية والراتب</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px 12px; font-weight: 700; color: #374151; text-align: right;">بند الراتب / البدل</th>
              <th style="padding: 10px 12px; font-weight: 700; color: #374151; text-align: left;">القيمة شهرياً (${offer.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${detailItems.length > 0 
              ? detailItems.map(item => `
                  <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 12px; color: #4b5563; text-align: right;">${item.label}</td>
                    <td style="padding: 10px 12px; color: #111827; font-weight: 600; text-align: left;">${item.amount}</td>
                  </tr>
                `).join("")
              : `
                  <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 12px; color: #4b5563; text-align: right;">الراتب الأساسي</td>
                    <td style="padding: 10px 12px; color: #111827; font-weight: 600; text-align: left;">${new Intl.NumberFormat("ar-SA").format(offer.salary)}</td>
                  </tr>
                `
            }
            <!-- Subtotal -->
            <tr style="border-top: 2px solid #e5e7eb; background: #fafafa;">
              <td style="padding: 12px 12px; font-weight: 700; color: #111827; text-align: right;">إجمالي الراتب الإجمالي (Gross)</td>
              <td style="padding: 12px 12px; font-weight: 700; color: #4f46e5; font-size: 15px; text-align: left;">
                ${totalItem ? totalItem.amount : `${new Intl.NumberFormat("ar-SA").format(offer.salary)} ${offer.currency}`}
              </td>
            </tr>
            <!-- GOSI Deduction if exists -->
            ${gosiItem ? `
              <tr style="border-bottom: 1px solid #f3f4f6; color: #dc2626;">
                <td style="padding: 10px 12px; font-weight: 600; text-align: right;">${gosiItem.label}</td>
                <td style="padding: 10px 12px; font-weight: 700; text-align: left;">${gosiItem.amount}</td>
              </tr>
            ` : ""}
            <!-- Net Take Home if exists -->
            ${netItem ? `
              <tr style="background: #f5f6ff; border-top: 2px solid #e0e7ff;">
                <td style="padding: 12px 12px; font-weight: 800; color: #4f46e5; text-align: right;">${netItem.label}</td>
                <td style="padding: 12px 12px; font-weight: 800; color: #4f46e5; font-size: 16px; text-align: left;">${netItem.amount}</td>
              </tr>
            ` : ""}
          </tbody>
        </table>
      </div>

      <!-- Benefits & Additional Terms -->
      ${offer.benefits && offer.benefits.length > 0 
        ? `
          <div style="margin-bottom: 30px; text-align: right;">
            <h3 style="font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 10px 0; border-right: 3px solid #4f46e5; padding-right: 8px;">المزايا الإضافية والتأمين</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; color: #4b5563; box-sizing: border-box;">
              ${offer.benefits.map(b => `<div style="width: 48%; display: flex; align-items: center; gap: 6px; box-sizing: border-box;">• ${b}</div>`).join("")}
            </div>
          </div>
        ` 
        : ""
      }

      ${cleanTerms 
        ? `
          <div style="margin-bottom: 30px; text-align: right;">
            <h3 style="font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 10px 0; border-right: 3px solid #4f46e5; padding-right: 8px;">شروط وأحكام العمل الإضافية</h3>
            <p style="font-size: 13px; color: #4b5563; line-height: 1.8; margin: 0; white-space: pre-wrap;">${cleanTerms}</p>
          </div>
        ` 
        : ""
      }

      <!-- Standard Clauses (probation period, annual leave) -->
      <div style="margin-bottom: 35px; border-top: 1px solid #f3f4f6; padding-top: 20px; font-size: 12px; color: #6b7280; line-height: 1.7; display: flex; flex-direction: column; gap: 6px; text-align: right;">
        <div>* يخضع هذا العرض لفترة تجربة مدتها (90) يوماً تبدأ من تاريخ مباشرة العمل الفعلي بموجب المادة 53 من نظام العمل السعودي.</div>
        <div>* يستحق الموظف إجازة سنوية مدفوعة الأجر لا تقل عن (30) يوماً بموجب المادة 109 من نظام العمل السعودي.</div>
        <div>* يلتزم الطرفان بالسرية التامة والمحافظة على أسرار العمل وحماية الملكية الفكرية طوال فترة التعاقد وبعدها.</div>
      </div>

      <!-- Signatures Block -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; border-top: 2px solid #f3f4f6; padding-top: 30px;">
        <div style="text-align: center; width: 45%;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">جهة العمل (المدير المسؤول)</div>
          <div style="height: 40px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #9ca3af; font-size: 14px;">${offer.company_name || "Tawzeef-X"} HR Team</div>
          <div style="border-top: 1px dashed #d1d5db; padding-top: 6px; font-size: 13px; font-weight: 700; color: #374151;">فريق الموارد البشرية</div>
        </div>
        <div style="text-align: center; width: 45%;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">الموافقة والتوقيع الرقمي للمرشح</div>
          <div style="height: 40px; display: flex; align-items: center; justify-content: center;">
            ${offer.signature_url 
              ? `<img src="${offer.signature_url}" style="max-height: 40px; max-width: 150px; object-contain;" />` 
              : `<span style="font-size: 12px; color: #9ca3af; font-style: italic;">بانتظار توقيع المرشح</span>`
            }
          </div>
          <div style="border-top: 1px dashed #d1d5db; padding-top: 6px; font-size: 13px; font-weight: 700; color: #374151;">توقيع المرشح</div>
        </div>
      </div>

      <!-- Footer Branding -->
      <div style="text-align: center; font-size: 10px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 15px;">
        هذا خطاب عرض وظيفي إلكتروني رسمي وموثق رقمياً وصادر عبر منصة Tawzeef-X.
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Generate high-resolution canvas using html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const canvasHeightInPdf = imgHeight * ratio;

    let heightLeft = canvasHeightInPdf;
    let position = 0;
    const pageHeight = pdfHeight;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, canvasHeightInPdf, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - canvasHeightInPdf;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, canvasHeightInPdf, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save(`عرض-وظيفي-${offer.position}.pdf`);
  } catch (error) {
    console.error("Error generating offer PDF:", error);
  } finally {
    document.body.removeChild(container);
  }
}
