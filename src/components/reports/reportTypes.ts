import type { CSSProperties } from "react";
import type { Company } from "@/hooks/useCompanies";
import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { JobOffer } from "@/hooks/useOffers";
import type { Tables } from "@/integrations/supabase/types";

export type InterviewRow = Tables<"interviews">;

export const SOURCE_COLORS: Record<string, string> = {
  LinkedIn: "hsl(222, 65%, 46%)",
  "الموقع": "hsl(174, 62%, 40%)",
  "إحالات": "hsl(36, 90%, 48%)",
  "أخرى": "hsl(220, 14%, 65%)",
};

export const FALLBACK_SOURCE_COLORS: readonly string[] = [
  "hsl(262, 60%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(340, 65%, 47%)",
  "hsl(152, 56%, 40%)",
  "hsl(24, 85%, 52%)",
];

export const REPORT_TOOLTIP_STYLE: CSSProperties = {
  borderRadius: "12px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border) / 0.5)",
  backgroundColor: "hsl(var(--card) / 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
};

export interface BranchComparisonItem {
  id: string;
  name: string;
  isBranch: boolean;
  jobsCount: number;
  candidatesCount: number;
  interviewsCount: number;
  hiredCount: number;
  conversionRate: number;
  avgDaysToHire: number | null;
}

export interface SourceDistributionItem {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface SourcePerformanceItem {
  name: string;
  total: number;
  hired: number;
  rate: number;
}

export interface FunnelStageItem {
  stage: string;
  displayStage: string;
  count: number;
  rate: string;
}

export interface DepartmentStatItem {
  name: string;
  jobs: number;
  candidates: number;
  hired: number;
}

export interface MonthlyTrendItem {
  month: string;
  applied: number;
  interviews: number;
  hired: number;
}

export interface CostStatItem {
  name: string;
  cost: number;
  hires: number;
  costPerHire: number;
}

export interface AiScoreRangeItem {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface TimeToHireJobItem {
  title: string;
  department: string;
  candidates: number;
  hired: number;
  avgDays: number | null;
  status: string;
}

export interface OfferStatsSummary {
  total: number;
  sent: number;
  accepted: number;
  rejected: number;
  pending: number;
  avgResponseDays: number | null;
}

export interface StageTimeItem {
  stage: string;
  displayStage: string;
  avgDays: number;
  count: number;
}

export interface InterviewerPerfItem {
  name: string;
  total: number;
  completed: number;
  completionRate: number;
  avgRating: number;
}

export interface SourceQualityDetailItem {
  name: string;
  total: number;
  hired: number;
  conversionRate: number;
  avgAiScore: number;
  avgDaysToHire: number | null;
}

export interface MonthlyComparisonMetric {
  label: string;
  current: number;
  previous: number;
  change: number;
}

export type MonthlyComparisonChartDatum = Record<string, string | number>;

export interface MonthlyComparisonData {
  currentMonthName: string;
  prevMonthName: string;
  metrics: MonthlyComparisonMetric[];
  chartData: MonthlyComparisonChartDatum[];
}

export interface WeeklyActivityItem {
  day: string;
  applications: number;
  interviews: number;
  hires: number;
}

export interface QualityRadarItem {
  metric: string;
  value: number;
  fullMark: number;
}

export interface ReportKpisDocumentData {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  shortlistedCandidates: number;
  totalInterviews: number;
  completedInterviews: number;
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  acceptanceRate: number;
  avgDaysToHire: number | null;
  estimatedCostPerHire: number;
  totalHiringCost: number;
}

export interface ReportHeaderSummaryKpis {
  totalCandidates: number;
  hired: number;
  conversionRate: string;
  avgAiScore: string;
  avgTimeToHire: string;
  totalCostNum: string;
  offerAcceptanceRate: string;
  avgOfferResponseDays: number | null;
}

export interface ReportsDocumentPayload {
  companyName: string;
  dateRangeText: string;
  activeCompany: Company | null;
  branchesData: BranchComparisonItem[];
  allCandidates: CandidateRow[];
  allJobs: JobRow[];
  allInterviews: InterviewRow[];
  allOffers: JobOffer[];
  funnelData: FunnelStageItem[];
  departmentData: DepartmentStatItem[];
  sourceData: SourceDistributionItem[];
  qualityRadarData: QualityRadarItem[];
  kpis: ReportKpisDocumentData;
}
