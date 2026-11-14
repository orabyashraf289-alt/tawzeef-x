import type { Company } from "@/hooks/useCompanies";
import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { JobOffer } from "@/hooks/useOffers";
import type { DateRange } from "./DateRangeFilter";
import {
  type AiScoreRangeItem,
  type BranchComparisonItem,
  type CostStatItem,
  type DepartmentStatItem,
  FALLBACK_SOURCE_COLORS,
  type FunnelStageItem,
  type InterviewerPerfItem,
  type InterviewRow,
  type MonthlyComparisonData,
  type MonthlyTrendItem,
  type OfferStatsSummary,
  type QualityRadarItem,
  type ReportHeaderSummaryKpis,
  type ReportsDocumentPayload,
  SOURCE_COLORS,
  type SourceDistributionItem,
  type SourcePerformanceItem,
  type SourceQualityDetailItem,
  type StageTimeItem,
  type TimeToHireJobItem,
  type WeeklyActivityItem,
} from "./reportTypes";

const AVG_ESTIMATED_COST_PER_HIRE = 2500;
const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function diffDaysAtLeastOne(endDate: string | undefined, startDate: string): number {
  const endMs = new Date(endDate || startDate).getTime();
  const startMs = new Date(startDate).getTime();
  return Math.max(Math.floor((endMs - startMs) / 86400000), 1);
}

export function isDateInRange(dateStr: string, dateRange: DateRange): boolean {
  if (!dateRange.from && !dateRange.to) return true;
  const d = new Date(dateStr);
  if (dateRange.from) {
    const startOfDay = new Date(dateRange.from);
    startOfDay.setHours(0, 0, 0, 0);
    if (d < startOfDay) return false;
  }
  if (dateRange.to) {
    const endOfDay = new Date(dateRange.to);
    endOfDay.setHours(23, 59, 59, 999);
    if (d > endOfDay) return false;
  }
  return true;
}

export function computeBranchesComparison(
  activeCompany: Company | null,
  branches: Company[],
  jobs: JobRow[],
  candidates: CandidateRow[],
  interviews: InterviewRow[],
): BranchComparisonItem[] {
  if (!activeCompany) return [];

  const companiesList = [activeCompany, ...branches];

  return companiesList.map((company) => {
    const compJobs = jobs.filter((j) => j.company_id === company.id);
    const compJobIds = compJobs.map((j) => j.id);

    const compCandidates = candidates.filter(
      (cand) => cand.company_id === company.id || compJobIds.includes(cand.job_id),
    );
    const compInterviews = interviews.filter((i) =>
      compCandidates.some((cand) => cand.id === i.candidate_id),
    );
    const hired = compCandidates.filter((cand) => cand.status === "مقبول");

    const avgDays =
      hired.length > 0
        ? Math.round(
            hired.reduce((sum, cand) => sum + diffDaysAtLeastOne(cand.updated_at, cand.created_at), 0) /
              hired.length,
          )
        : null;

    const totalCandidates = compCandidates.length;
    const hiredCount = hired.length;
    const conversionRate =
      totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;

    return {
      id: company.id,
      name: company.name || (company.parent_company_id ? "فرع بدون اسم" : "الشركة الرئيسية"),
      isBranch: !!company.parent_company_id,
      jobsCount: compJobs.length,
      candidatesCount: totalCandidates,
      interviewsCount: compInterviews.length,
      hiredCount,
      conversionRate,
      avgDaysToHire: avgDays,
    };
  });
}

export function computeSourceDistribution(
  candidates: CandidateRow[],
  locale: string,
): SourceDistributionItem[] {
  const map: Record<string, number> = {};
  candidates.forEach((c) => {
    const src = c.source || (locale === "en" ? "Other" : "أخرى");
    map[src] = (map[src] || 0) + 1;
  });
  const total = candidates.length || 1;
  return Object.entries(map).map(([name, count], idx) => ({
    name,
    value: Math.round((count / total) * 100),
    count,
    color: SOURCE_COLORS[name] || FALLBACK_SOURCE_COLORS[idx % FALLBACK_SOURCE_COLORS.length],
  }));
}

export function computeSourcePerformanceSummary(
  candidates: CandidateRow[],
  locale: string,
): SourcePerformanceItem[] {
  const srcQuality: Record<string, { total: number; hired: number }> = {};
  candidates.forEach((c) => {
    const src = c.source || (locale === "en" ? "Other" : "أخرى");
    if (!srcQuality[src]) srcQuality[src] = { total: 0, hired: 0 };
    srcQuality[src].total++;
    if (c.status === "مقبول") srcQuality[src].hired++;
  });
  return Object.entries(srcQuality).map(([name, data]) => ({
    name,
    total: data.total,
    hired: data.hired,
    rate: data.total > 0 ? Math.round((data.hired / data.total) * 100) : 0,
  }));
}

export function computeFunnelData(
  candidates: CandidateRow[],
  stageKeys: string[],
  displayStages: string[],
): FunnelStageItem[] {
  const stageCounts: Record<string, number> = {};
  stageKeys.forEach((s) => {
    stageCounts[s] = 0;
  });

  candidates.forEach((c) => {
    const stage = c.stage || stageKeys[0];
    const idx = stageKeys.indexOf(stage);
    for (let i = 0; i <= Math.max(idx, 0); i++) {
      stageCounts[stageKeys[i]] = (stageCounts[stageKeys[i]] || 0) + 1;
    }
  });

  const total = stageCounts[stageKeys[0]] || 1;
  return stageKeys.map((stage, i) => ({
    stage,
    displayStage: displayStages[i] || stage,
    count: stageCounts[stage],
    rate: `${Math.round((stageCounts[stage] / total) * 100)}%`,
  }));
}

export function computeDepartmentStats(
  jobs: JobRow[],
  candidates: CandidateRow[],
  locale: string,
): DepartmentStatItem[] {
  const deptMap: Record<string, { jobs: number; candidates: number; hired: number }> = {};
  jobs.forEach((j) => {
    if (!deptMap[j.department]) deptMap[j.department] = { jobs: 0, candidates: 0, hired: 0 };
    deptMap[j.department].jobs++;
  });
  candidates.forEach((c) => {
    const job = jobs.find((j) => j.id === c.job_id);
    const dept = job?.department || (locale === "en" ? "Unspecified" : "غير محدد");
    if (!deptMap[dept]) deptMap[dept] = { jobs: 0, candidates: 0, hired: 0 };
    deptMap[dept].candidates++;
    if (c.status === "مقبول") deptMap[dept].hired++;
  });
  return Object.entries(deptMap).map(([name, data]) => ({ name, ...data }));
}

export function computeMonthlyTrends(
  candidates: CandidateRow[],
  interviews: InterviewRow[],
  locale: string,
): MonthlyTrendItem[] {
  const months: Record<string, { applied: number; interviews: number; hired: number }> = {};
  const monthNames = locale === "en" ? MONTH_NAMES_EN : MONTH_NAMES_AR;

  candidates.forEach((c) => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!months[key]) months[key] = { applied: 0, interviews: 0, hired: 0 };
    months[key].applied++;
    if (c.status === "مقبول") months[key].hired++;
  });
  interviews.forEach((i) => {
    const d = new Date(i.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!months[key]) months[key] = { applied: 0, interviews: 0, hired: 0 };
    months[key].interviews++;
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const [, m] = key.split("-");
      return { month: monthNames[parseInt(m, 10)], ...data };
    });
}

export function computeCostStats(departmentData: DepartmentStatItem[]): CostStatItem[] {
  return departmentData.map((d) => ({
    name: d.name,
    cost: d.hired * AVG_ESTIMATED_COST_PER_HIRE,
    hires: d.hired,
    costPerHire: d.hired > 0 ? AVG_ESTIMATED_COST_PER_HIRE : 0,
  }));
}

export function computeAiScoreDistribution(candidates: CandidateRow[]): AiScoreRangeItem[] {
  const ranges: AiScoreRangeItem[] = [
    { label: "90-100%", min: 90, max: 100, count: 0 },
    { label: "70-89%", min: 70, max: 89, count: 0 },
    { label: "50-69%", min: 50, max: 69, count: 0 },
    { label: "0-49%", min: 0, max: 49, count: 0 },
  ];
  candidates.forEach((c) => {
    const score = c.ai_score;
    if (score != null) {
      const range = ranges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    }
  });
  return ranges;
}

export function computeAvgTimeToHire(candidates: CandidateRow[], dayLabel: string): string {
  const hiredCandidates = candidates.filter((c) => c.status === "مقبول");
  if (hiredCandidates.length === 0) return "—";
  const totalDays = hiredCandidates.reduce(
    (sum, c) => sum + diffDaysAtLeastOne(c.updated_at, c.created_at),
    0,
  );
  const avg = Math.round(totalDays / hiredCandidates.length);
  return `${avg} ${dayLabel}`;
}

export function computeTimeToHirePerJob(
  jobs: JobRow[],
  candidates: CandidateRow[],
): TimeToHireJobItem[] {
  return jobs
    .map((job) => {
      const jobCands = candidates.filter((c) => c.job_id === job.id);
      const hired = jobCands.filter((c) => c.status === "مقبول");
      const avgDays =
        hired.length > 0
          ? Math.round(
              hired.reduce((sum, c) => sum + diffDaysAtLeastOne(c.updated_at, c.created_at), 0) /
                hired.length,
            )
          : null;
      return {
        title: job.title,
        department: job.department,
        candidates: jobCands.length,
        hired: hired.length,
        avgDays,
        status: job.status,
      };
    })
    .filter((j) => j.candidates > 0)
    .sort((a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999));
}

export function computeOfferAcceptanceRate(offers: JobOffer[]): string {
  const responded = offers.filter((o) => o.status === "accepted" || o.status === "rejected");
  if (responded.length === 0) return "—";
  const accepted = responded.filter((o) => o.status === "accepted").length;
  return `${Math.round((accepted / responded.length) * 100)}%`;
}

export function computeOfferStats(offers: JobOffer[]): OfferStatsSummary {
  const total = offers.length;
  const sent = offers.filter((o) => o.status === "sent").length;
  const accepted = offers.filter((o) => o.status === "accepted").length;
  const rejected = offers.filter((o) => o.status === "rejected").length;
  const pending = offers.filter(
    (o) => o.status === "draft" || o.status === "sent" || o.status === "viewed",
  ).length;
  const avgResponseDays = (() => {
    const responded = offers.filter((o) => o.response_date && o.sent_at);
    if (responded.length === 0) return null;
    const totalDays = responded.reduce(
      (sum, o) => sum + diffDaysAtLeastOne(o.response_date!, o.sent_at!),
      0,
    );
    return Math.round(totalDays / responded.length);
  })();
  return { total, sent, accepted, rejected, pending, avgResponseDays };
}

export function computeStageTimeData(
  candidates: CandidateRow[],
  stageKeys: string[],
  displayStages: string[],
): StageTimeItem[] {
  const stageTimeSums: Record<string, { totalDays: number; count: number }> = {};
  stageKeys.forEach((s) => {
    stageTimeSums[s] = { totalDays: 0, count: 0 };
  });

  candidates.forEach((c) => {
    const stage = c.stage || stageKeys[0];
    const days = diffDaysAtLeastOne(c.updated_at, c.created_at);
    if (stageTimeSums[stage]) {
      stageTimeSums[stage].totalDays += days;
      stageTimeSums[stage].count++;
    }
  });

  return stageKeys.map((stage, i) => ({
    stage,
    displayStage: displayStages[i] || stage,
    avgDays:
      stageTimeSums[stage].count > 0
        ? Math.round(stageTimeSums[stage].totalDays / stageTimeSums[stage].count)
        : 0,
    count: stageTimeSums[stage].count,
  }));
}

export function computeInterviewerPerformance(
  interviews: InterviewRow[],
  locale: string,
): InterviewerPerfItem[] {
  const map: Record<
    string,
    { total: number; completed: number; totalRating: number; ratedCount: number }
  > = {};
  interviews.forEach((i) => {
    const name = i.interviewer || (locale === "en" ? "Unassigned" : "غير محدد");
    if (!map[name]) map[name] = { total: 0, completed: 0, totalRating: 0, ratedCount: 0 };
    map[name].total++;
    if (i.status === "مكتملة") {
      map[name].completed++;
      if (i.rating) {
        map[name].totalRating += i.rating;
        map[name].ratedCount++;
      }
    }
  });
  return Object.entries(map)
    .map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgRating: data.ratedCount > 0 ? +(data.totalRating / data.ratedCount).toFixed(1) : 0,
    }))
    .sort((a, b) => b.completed - a.completed);
}

export function computeSourceQualityDetailed(
  candidates: CandidateRow[],
  locale: string,
): SourceQualityDetailItem[] {
  const map: Record<
    string,
    {
      total: number;
      hired: number;
      avgScore: number;
      scoreCount: number;
      avgDays: number;
      daysCount: number;
    }
  > = {};
  candidates.forEach((c) => {
    const src = c.source || (locale === "en" ? "Other" : "أخرى");
    if (!map[src])
      map[src] = { total: 0, hired: 0, avgScore: 0, scoreCount: 0, avgDays: 0, daysCount: 0 };
    map[src].total++;
    if (c.status === "مقبول") {
      map[src].hired++;
      map[src].avgDays += diffDaysAtLeastOne(c.updated_at, c.created_at);
      map[src].daysCount++;
    }
    if (c.ai_score != null) {
      map[src].avgScore += c.ai_score;
      map[src].scoreCount++;
    }
  });
  return Object.entries(map)
    .map(([name, d]) => ({
      name,
      total: d.total,
      hired: d.hired,
      conversionRate: d.total > 0 ? Math.round((d.hired / d.total) * 100) : 0,
      avgAiScore: d.scoreCount > 0 ? Math.round(d.avgScore / d.scoreCount) : 0,
      avgDaysToHire: d.daysCount > 0 ? Math.round(d.avgDays / d.daysCount) : null,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeMonthlyComparison(
  candidates: CandidateRow[],
  interviews: InterviewRow[],
  offers: JobOffer[],
  locale: string,
): MonthlyComparisonData {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const mNames = locale === "en" ? MONTH_NAMES_EN : MONTH_NAMES_AR;

  const isInMonth = (dateStr: string, month: number, year: number) => {
    const d = new Date(dateStr);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const currentCandidates = candidates.filter((c) =>
    isInMonth(c.created_at, currentMonth, currentYear),
  );
  const prevCandidates = candidates.filter((c) => isInMonth(c.created_at, prevMonth, prevYear));
  const currentInterviews = interviews.filter((i) => isInMonth(i.date, currentMonth, currentYear));
  const prevInterviews = interviews.filter((i) => isInMonth(i.date, prevMonth, prevYear));
  const currentHired = currentCandidates.filter((c) => c.status === "مقبول").length;
  const prevHired = prevCandidates.filter((c) => c.status === "مقبول").length;
  const currentOffers = offers.filter(
    (o) => o.created_at && isInMonth(o.created_at, currentMonth, currentYear),
  );
  const prevOffers = offers.filter(
    (o) => o.created_at && isInMonth(o.created_at, prevMonth, prevYear),
  );

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const metrics = [
    {
      label: locale === "en" ? "Candidates" : "مرشحين",
      current: currentCandidates.length,
      previous: prevCandidates.length,
    },
    {
      label: locale === "en" ? "Interviews" : "مقابلات",
      current: currentInterviews.length,
      previous: prevInterviews.length,
    },
    {
      label: locale === "en" ? "Hired" : "توظيف",
      current: currentHired,
      previous: prevHired,
    },
    {
      label: locale === "en" ? "Offers" : "عروض",
      current: currentOffers.length,
      previous: prevOffers.length,
    },
  ].map((m) => ({ ...m, change: calcChange(m.current, m.previous) }));

  return {
    currentMonthName: mNames[currentMonth],
    prevMonthName: mNames[prevMonth],
    metrics,
    chartData: metrics.map((m) => ({
      name: m.label,
      [mNames[currentMonth]]: m.current,
      [mNames[prevMonth]]: m.previous,
    })),
  };
}

export function computeWeeklyActivity(
  candidates: CandidateRow[],
  interviews: InterviewRow[],
  locale: string,
): WeeklyActivityItem[] {
  const dayNames =
    locale === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const dayMap: Record<number, { applications: number; interviews: number; hires: number }> = {};
  for (let i = 0; i < 7; i++) dayMap[i] = { applications: 0, interviews: 0, hires: 0 };

  candidates.forEach((c) => {
    const day = new Date(c.created_at).getDay();
    dayMap[day].applications++;
    if (c.status === "مقبول") dayMap[day].hires++;
  });
  interviews.forEach((iv) => {
    const day = new Date(iv.date).getDay();
    dayMap[day].interviews++;
  });

  return Object.entries(dayMap).map(([day, data]) => ({
    day: dayNames[parseInt(day, 10)],
    ...data,
  }));
}

export function computeQualityRadar(
  candidates: CandidateRow[],
  interviews: InterviewRow[],
  locale: string,
): QualityRadarItem[] {
  const scored = candidates.filter((c) => c.ai_score != null);
  const total = candidates.length || 1;
  const hiredCount = candidates.filter((c) => c.status === "مقبول").length;
  const withResume = candidates.filter((c) => c.resume_url).length;
  const completedInterviews = interviews.filter((i) => i.status === "مكتملة").length;
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, c) => s + (c.ai_score || 0), 0) / scored.length)
      : 0;

  const labels =
    locale === "en"
      ? ["AI Score", "Conversion", "Resume Rate", "Interview Completion", "Source Diversity"]
      : ["تقييم AI", "معدل التحويل", "نسبة السير الذاتية", "إتمام المقابلات", "تنوع المصادر"];

  const sources = new Set(candidates.map((c) => c.source || "أخرى"));
  const sourceDiversity = Math.min((sources.size / 5) * 100, 100);

  return labels.map((label, i) => ({
    metric: label,
    value: [
      avgScore,
      total > 0 ? Math.round((hiredCount / total) * 100) : 0,
      total > 0 ? Math.round((withResume / total) * 100) : 0,
      interviews.length > 0 ? Math.round((completedInterviews / interviews.length) * 100) : 0,
      Math.round(sourceDiversity),
    ][i],
    fullMark: 100,
  }));
}

export function computeHeaderSummaryKpis({
  candidates,
  offers,
  offerStats,
  avgTimeToHire,
  offerAcceptanceRate,
}: {
  candidates: CandidateRow[];
  offers: JobOffer[];
  offerStats: OfferStatsSummary;
  avgTimeToHire: string;
  offerAcceptanceRate: string;
}): ReportHeaderSummaryKpis {
  const totalCandidates = candidates.length;
  const hired = candidates.filter((c) => c.status === "مقبول").length;
  const conversionRate = totalCandidates > 0 ? ((hired / totalCandidates) * 100).toFixed(1) : "0";
  const scored = candidates.filter((c) => c.ai_score != null);
  const avgAiScore =
    scored.length === 0
      ? "—"
      : `${Math.round(scored.reduce((sum, c) => sum + (c.ai_score || 0), 0) / scored.length)}%`;
  const totalCostNum = (hired * AVG_ESTIMATED_COST_PER_HIRE).toLocaleString();

  void offers;

  return {
    totalCandidates,
    hired,
    conversionRate,
    avgAiScore,
    avgTimeToHire,
    totalCostNum,
    offerAcceptanceRate,
    avgOfferResponseDays: offerStats.avgResponseDays,
  };
}

export function computeReportDocumentPayload({
  jobs,
  allCandidates,
  allJobs,
  allInterviews,
  allOffers,
  activeCompany,
  branchesComparisonData,
  funnelData,
  departmentData,
  sourceData,
  qualityRadarData,
  dateRange,
  locale,
}: {
  jobs: JobRow[];
  allCandidates: CandidateRow[];
  allJobs: JobRow[];
  allInterviews: InterviewRow[];
  allOffers: JobOffer[];
  activeCompany: Company | null;
  branchesComparisonData: BranchComparisonItem[];
  funnelData: FunnelStageItem[];
  departmentData: DepartmentStatItem[];
  sourceData: SourceDistributionItem[];
  qualityRadarData: QualityRadarItem[];
  dateRange: DateRange;
  locale: string;
}): ReportsDocumentPayload {
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === "نشطة").length;
  const totalCandidates = allCandidates.length;
  const shortlistedCandidates = allCandidates.filter(
    (c) => c.stage && c.stage !== "تقديم الطلب",
  ).length;
  const totalInterviews = allInterviews.length;
  const completedInterviews = allInterviews.filter((i) => i.status === "مكتملة").length;
  const totalOffers = allOffers.length;
  const acceptedOffers = allOffers.filter((o) => o.status === "accepted").length;
  const rejectedOffers = allOffers.filter((o) => o.status === "rejected").length;
  const respondedOffers = acceptedOffers + rejectedOffers;
  const acceptanceRate =
    respondedOffers > 0 ? Math.round((acceptedOffers / respondedOffers) * 100) : 0;

  const hiredCandidates = allCandidates.filter((c) => c.status === "مقبول");
  const avgDaysToHire =
    hiredCandidates.length > 0
      ? Math.round(
          hiredCandidates.reduce((sum, c) => sum + diffDaysAtLeastOne(c.updated_at, c.created_at), 0) /
            hiredCandidates.length,
        )
      : 14;

  const totalHiringCost = hiredCandidates.length * AVG_ESTIMATED_COST_PER_HIRE;

  let dateRangeText = "";
  if (dateRange.from && dateRange.to) {
    dateRangeText = `${new Date(dateRange.from).toLocaleDateString(
      locale === "en" ? "en-US" : "ar-SA",
    )} - ${new Date(dateRange.to).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}`;
  } else if (dateRange.from) {
    dateRangeText = `من ${new Date(dateRange.from).toLocaleDateString(
      locale === "en" ? "en-US" : "ar-SA",
    )}`;
  }

  return {
    companyName:
      activeCompany?.name || (locale === "en" ? "TawzeefX Platform" : "منصة توظيف إكس"),
    dateRangeText,
    activeCompany,
    branchesData: branchesComparisonData,
    allCandidates,
    allJobs,
    allInterviews,
    allOffers,
    funnelData,
    departmentData,
    sourceData,
    qualityRadarData,
    kpis: {
      totalJobs,
      activeJobs,
      totalCandidates,
      shortlistedCandidates,
      totalInterviews,
      completedInterviews,
      totalOffers,
      acceptedOffers,
      rejectedOffers,
      acceptanceRate,
      avgDaysToHire,
      estimatedCostPerHire: AVG_ESTIMATED_COST_PER_HIRE,
      totalHiringCost,
    },
  };
}
