import jsPDF from "jspdf";

interface PhaseData {
  title: string;
  timeline: string;
  sections: {
    title: string;
    tasks: { title: string; done: boolean }[];
  }[];
}

interface RoadmapPdfOptions {
  phases: PhaseData[];
  maintenanceTasks: { title: string; done: boolean }[];
  locale: string;
  overallStats: { total: number; done: number; percent: number };
}

export function generateRoadmapPdf({ phases, maintenanceTasks, locale, overallStats }: RoadmapPdfOptions) {
  const isAr = locale !== "en";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 16;

  const primary: [number, number, number] = [20, 131, 88]; // #148358
  const dark: [number, number, number] = [31, 41, 55];
  const gray: [number, number, number] = [107, 114, 128];
  const green: [number, number, number] = [16, 185, 129];
  const white: [number, number, number] = [255, 255, 255];

  const phaseColors: [number, number, number][] = [
    [16, 185, 129],  // emerald
    [59, 130, 246],  // blue
    [139, 92, 246],  // purple
    [245, 158, 11],  // amber
    [244, 63, 94],   // rose
  ];

  function checkPage(needed: number) {
    if (y + needed > 280) { doc.addPage(); y = 16; }
  }

  // ── Header ──
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, contentW, 16, 3, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(18);
  doc.text(isAr ? "خطة تطوير النظام" : "Development Roadmap", pageW / 2, y + 11, { align: "center" });
  y += 22;

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(
    `${isAr ? "تاريخ التصدير:" : "Exported:"} ${new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}`,
    pageW / 2, y, { align: "center" }
  );
  y += 8;

  // ── Overall Stats Cards ──
  const statCards = [
    { label: isAr ? "إجمالي المهام" : "Total Tasks", value: String(overallStats.total) },
    { label: isAr ? "مهام مكتملة" : "Completed", value: String(overallStats.done) },
    { label: isAr ? "مهام متبقية" : "Remaining", value: String(overallStats.total - overallStats.done) },
    { label: isAr ? "نسبة الإنجاز" : "Progress", value: `${overallStats.percent}%` },
  ];

  const cardW = (contentW - 9) / 4;
  const cardH = 18;
  statCards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(card.label, x + cardW / 2, y + 7, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(card.value, x + cardW / 2, y + 15, { align: "center" });
  });
  y += cardH + 6;

  // ── Timeline Chart ──
  checkPage(40);
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text(isAr ? "المخطط الزمني" : "Timeline Chart", pageW / 2, y, { align: "center" });
  y += 6;

  const tlLeft = margin + 2;
  const tlWidth = contentW - 4;
  const tlBarH = 6;

  // Month labels
  const months = ["Jun'25", "Sep'25", "Dec'25", "Mar'26", "Jun'26", "Sep'26", "Dec'26", "Mar'27"];
  const totalMonths = 22;
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  months.forEach((m, i) => {
    const pct = (i * 3) / totalMonths;
    doc.text(m, tlLeft + pct * tlWidth, y + 3, { align: "center" });
  });
  y += 5;

  // Axis line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(tlLeft, y, tlLeft + tlWidth, y);

  // Today marker
  const now = new Date();
  const currentOffset = (now.getFullYear() - 2025) * 12 + now.getMonth() - 5;
  const todayPct = Math.max(0, Math.min(1, currentOffset / totalMonths));
  doc.setFillColor(...primary);
  doc.circle(tlLeft + todayPct * tlWidth, y, 1.5, "F");
  y += 4;

  // Phase bars
  const phaseTimeline = [
    { start: 0, end: 10 },   // Jun25-Mar26
    { start: 10, end: 13 },  // Apr26-Jun26
    { start: 13, end: 16 },  // Jul26-Sep26
    { start: 16, end: 19 },  // Oct26-Dec26
    { start: 19, end: 22 },  // Jan27-Mar27
  ];

  phases.forEach((phase, i) => {
    const pt = phaseTimeline[i];
    const startPct = pt.start / totalMonths;
    const widthPct = (pt.end - pt.start) / totalMonths;
    const barX = tlLeft + startPct * tlWidth;
    const barW = widthPct * tlWidth;
    const phaseTasks = phase.sections.flatMap(s => s.tasks);
    const phaseDone = phaseTasks.filter(t => t.done).length;
    const progressPct = phaseTasks.length ? phaseDone / phaseTasks.length : 0;

    // Background
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(barX, y, barW, tlBarH, 1, 1, "F");

    // Progress fill
    if (progressPct > 0) {
      doc.setFillColor(...phaseColors[i]);
      doc.roundedRect(barX, y, barW * progressPct, tlBarH, 1, 1, "F");
    }

    // Label
    doc.setFontSize(6);
    doc.setTextColor(...dark);
    const label = phase.title.length > 20 ? phase.title.slice(0, 20) + "…" : phase.title;
    doc.text(label, barX + 2, y + tlBarH - 1.5);

    // Percent
    doc.setTextColor(...gray);
    doc.text(`${Math.round(progressPct * 100)}%`, barX + barW - 2, y + tlBarH - 1.5, { align: "right" });

    y += tlBarH + 2;
  });

  y += 6;

  // ── Phase Details ──
  phases.forEach((phase, pi) => {
    checkPage(20);

    // Phase header
    doc.setFillColor(...phaseColors[pi]);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.text(phase.title, margin + 4, y + 7);
    doc.setFontSize(8);
    doc.text(phase.timeline, margin + contentW - 4, y + 7, { align: "right" });
    y += 13;

    // Phase progress
    const phaseTasks = phase.sections.flatMap(s => s.tasks);
    const phaseDone = phaseTasks.filter(t => t.done).length;
    const phasePct = phaseTasks.length ? Math.round((phaseDone / phaseTasks.length) * 100) : 0;

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`${phaseDone}/${phaseTasks.length} (${phasePct}%)`, margin + 4, y + 1);

    // Progress bar
    const pbX = margin + 40;
    const pbW = contentW - 44;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(pbX, y - 3, pbW, 3, 1, 1, "F");
    if (phasePct > 0) {
      doc.setFillColor(...phaseColors[pi]);
      doc.roundedRect(pbX, y - 3, pbW * (phasePct / 100), 3, 1, 1, "F");
    }
    y += 5;

    // Sections and tasks
    phase.sections.forEach(section => {
      checkPage(12);
      doc.setFontSize(9);
      doc.setTextColor(...primary);
      doc.text(`● ${section.title}`, margin + 4, y + 3);
      y += 6;

      section.tasks.forEach(task => {
        checkPage(6);
        doc.setFontSize(8);
        const icon = task.done ? "✓" : "○";
        doc.setTextColor(task.done ? green[0] : 180, task.done ? green[1] : 180, task.done ? green[2] : 180);
        doc.text(icon, margin + 8, y + 2);
        doc.setTextColor(task.done ? gray[0] : dark[0], task.done ? gray[1] : dark[1], task.done ? gray[2] : dark[2]);
        doc.text(task.title, margin + 14, y + 2);
        y += 5;
      });
      y += 2;
    });
    y += 4;
  });

  // ── Maintenance ──
  checkPage(20);
  doc.setFillColor(100, 116, 139);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.text(isAr ? "مهام الصيانة المستمرة" : "Ongoing Maintenance", margin + 4, y + 7);
  y += 13;

  maintenanceTasks.forEach(task => {
    checkPage(6);
    const icon = task.done ? "✓" : "○";
    doc.setFontSize(8);
    doc.setTextColor(task.done ? green[0] : 180, task.done ? green[1] : 180, task.done ? green[2] : 180);
    doc.text(icon, margin + 8, y + 2);
    doc.setTextColor(task.done ? gray[0] : dark[0], task.done ? gray[1] : dark[1], task.done ? gray[2] : dark[2]);
    doc.text(task.title, margin + 14, y + 2);
    y += 5;
  });

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(
      isAr ? "تقرير صادر إلكترونياً عبر منصة توظيف-X" : "Generated by Tawzeef-X Platform",
      pageW / 2, 290, { align: "center" }
    );
    doc.text(`${p}/${totalPages}`, pageW - margin, 290, { align: "right" });
  }

  doc.save(isAr ? "خطة-تطوير-النظام.pdf" : "development-roadmap.pdf");
}
