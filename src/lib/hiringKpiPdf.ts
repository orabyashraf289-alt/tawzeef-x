import jsPDF from "jspdf";

interface KpiData {
  candidates: any[];
  jobs: any[];
  offers: any[];
  locale: string;
}

const AVG_COST_PER_HIRE = 2500;

export function generateHiringKpiPdf({ candidates, jobs, offers, locale }: KpiData) {
  const isAr = locale !== "en";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 18;

  const primary: [number, number, number] = [99, 102, 241];
  const dark: [number, number, number] = [31, 41, 55];
  const gray: [number, number, number] = [107, 114, 128];
  const green: [number, number, number] = [16, 185, 129];
  const orange: [number, number, number] = [245, 158, 11];
  const red: [number, number, number] = [239, 68, 68];

  // Header
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(isAr ? "تقرير مؤشرات التوظيف" : "Hiring KPI Report", pageW / 2, y + 9.5, { align: "center" });
  y += 20;

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`${isAr ? "تاريخ التصدير:" : "Exported:"} ${new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}`, pageW / 2, y, { align: "center" });
  y += 10;

  // Compute KPIs
  const totalHired = candidates.filter(c => c.status === "مقبول").length;
  const totalCost = totalHired * AVG_COST_PER_HIRE;
  const avgCostPerHire = totalHired > 0 ? Math.round(totalCost / totalHired) : 0;

  const hiredCandidates = candidates.filter(c => c.status === "مقبول");
  const overallTimeToFill = hiredCandidates.length > 0
    ? Math.round(hiredCandidates.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hiredCandidates.length)
    : 0;

  const respondedOffers = offers.filter(o => o.status === "accepted" || o.status === "rejected");
  const offerAcceptRate = respondedOffers.length > 0
    ? Math.round((respondedOffers.filter(o => o.status === "accepted").length / respondedOffers.length) * 100)
    : 0;

  // KPI Cards
  const kpis = [
    { label: isAr ? "تكلفة التوظيف الإجمالية" : "Total Hiring Cost", value: `${new Intl.NumberFormat("ar-SA").format(totalCost)} ${isAr ? "ر.س" : "SAR"}` },
    { label: isAr ? "متوسط تكلفة التعيين" : "Avg Cost per Hire", value: `${new Intl.NumberFormat("ar-SA").format(avgCostPerHire)} ${isAr ? "ر.س" : "SAR"}` },
    { label: isAr ? "متوسط وقت التوظيف" : "Avg Time to Fill", value: `${overallTimeToFill} ${isAr ? "يوم" : "days"}` },
    { label: isAr ? "معدل قبول العروض" : "Offer Accept Rate", value: `${offerAcceptRate}%` },
  ];

  const cardW = (contentW - 6) / 2;
  const cardH = 18;
  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardW + 6);
    const cy = y + row * (cardH + 4);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(kpi.label, x + cardW / 2, cy + 7, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(...dark);
    doc.text(kpi.value, x + cardW / 2, cy + 14, { align: "center" });
  });
  y += (cardH + 4) * 2 + 8;

  // Cost per Hire by Department
  const deptMap: Record<string, { hired: number; candidates: number }> = {};
  candidates.forEach(c => {
    const job = jobs.find(j => j.id === c.job_id);
    const dept = job?.department || (isAr ? "غير محدد" : "Unspecified");
    if (!deptMap[dept]) deptMap[dept] = { hired: 0, candidates: 0 };
    deptMap[dept].candidates++;
    if (c.status === "مقبول") deptMap[dept].hired++;
  });
  const deptData = Object.entries(deptMap)
    .map(([dept, d]) => ({ dept, costPerHire: d.hired > 0 ? d.hired * AVG_COST_PER_HIRE / d.hired : 0, hired: d.hired, candidates: d.candidates, efficiency: d.candidates > 0 ? Math.round((d.hired / d.candidates) * 100) : 0 }))
    .filter(d => d.hired > 0)
    .sort((a, b) => b.hired - a.hired);

  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text(isAr ? "تكلفة التعيين حسب القسم" : "Cost per Hire by Department", pageW / 2, y, { align: "center" });
  y += 8;

  if (deptData.length > 0) {
    // Table header
    doc.setFillColor(...primary);
    doc.roundedRect(margin, y, contentW, 8, 1, 1, "F");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const cols = isAr
      ? ["القسم", "المعينون", "المرشحون", "الكفاءة %", "التكلفة (ر.س)"]
      : ["Department", "Hired", "Candidates", "Efficiency %", "Cost (SAR)"];
    const colW = contentW / cols.length;
    cols.forEach((col, i) => {
      doc.text(col, margin + colW * i + colW / 2, y + 5.5, { align: "center" });
    });
    y += 10;

    deptData.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      const vals = [row.dept, String(row.hired), String(row.candidates), `${row.efficiency}%`, new Intl.NumberFormat("ar-SA").format(row.costPerHire)];
      vals.forEach((v, i) => {
        doc.text(v, margin + colW * i + colW / 2, y + 1, { align: "center" });
      });
      y += 7;
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text(isAr ? "لا توجد بيانات" : "No data", pageW / 2, y, { align: "center" });
    y += 8;
  }
  y += 8;

  // Time to Fill per Job
  if (y > 240) { doc.addPage(); y = 18; }
  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text(isAr ? "وقت التوظيف لكل وظيفة" : "Time to Fill per Job", pageW / 2, y, { align: "center" });
  y += 8;

  const timeToFill = jobs.map(job => {
    const jobCands = candidates.filter(c => c.job_id === job.id);
    const hired = jobCands.filter(c => c.status === "مقبول");
    const avgDays = hired.length > 0
      ? Math.round(hired.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hired.length)
      : null;
    return { title: job.title, dept: job.department, avgDays, hired: hired.length };
  }).filter(j => j.avgDays !== null).sort((a, b) => (a.avgDays ?? 0) - (b.avgDays ?? 0));

  if (timeToFill.length > 0) {
    const maxDays = Math.max(...timeToFill.map(t => t.avgDays ?? 0), 1);
    timeToFill.forEach(item => {
      if (y > 275) { doc.addPage(); y = 18; }
      const barW = Math.max(((item.avgDays ?? 0) / maxDays) * (contentW - 60), 2);
      const color: [number, number, number] = (item.avgDays ?? 0) > 30 ? red : (item.avgDays ?? 0) > 14 ? orange : green;

      doc.setFontSize(8);
      doc.setTextColor(...dark);
      const label = item.title.length > 25 ? item.title.slice(0, 25) + "…" : item.title;
      doc.text(label, margin, y + 3);
      doc.setFillColor(...color);
      doc.roundedRect(margin + 55, y, barW, 5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(`${item.avgDays} ${isAr ? "يوم" : "d"}`, margin + 57 + barW, y + 3.5);
      y += 8;
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text(isAr ? "لا توجد وظائف مكتملة" : "No completed hires", pageW / 2, y, { align: "center" });
    y += 8;
  }
  y += 6;

  // Stage Bottleneck Analysis
  if (y > 230) { doc.addPage(); y = 18; }
  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text(isAr ? "تحليل الاختناقات (وقت المرحلة)" : "Bottleneck Analysis (Stage Time)", pageW / 2, y, { align: "center" });
  y += 8;

  const stageMap: Record<string, { totalDays: number; count: number }> = {};
  candidates.forEach(c => {
    const stage = c.stage || "تقديم الطلب";
    if (!stageMap[stage]) stageMap[stage] = { totalDays: 0, count: 0 };
    stageMap[stage].totalDays += Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1);
    stageMap[stage].count++;
  });
  const stageTime = Object.entries(stageMap)
    .map(([stage, d]) => ({ stage, avgDays: d.count > 0 ? Math.round(d.totalDays / d.count) : 0, count: d.count }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.avgDays - a.avgDays);

  if (stageTime.length > 0) {
    const maxStageDays = stageTime[0]?.avgDays || 1;
    stageTime.forEach(item => {
      if (y > 275) { doc.addPage(); y = 18; }
      const barW = Math.max((item.avgDays / maxStageDays) * (contentW - 70), 2);
      const color: [number, number, number] = item.avgDays > 14 ? red : item.avgDays > 7 ? orange : green;

      doc.setFontSize(8);
      doc.setTextColor(...dark);
      doc.text(item.stage, margin, y + 3);
      doc.setFillColor(...color);
      doc.roundedRect(margin + 50, y, barW, 5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(`${item.avgDays} ${isAr ? "يوم" : "d"} (${item.count})`, margin + 52 + barW, y + 3.5);
      y += 8;
    });
  }

  // Footer
  const footerY = 285;
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(isAr ? "تقرير صادر إلكترونياً عبر منصة توظيف-X" : "Generated by Tawzeef-X Platform", pageW / 2, footerY, { align: "center" });

  doc.save(isAr ? "تقرير-مؤشرات-التوظيف.pdf" : "hiring-kpi-report.pdf");
}
