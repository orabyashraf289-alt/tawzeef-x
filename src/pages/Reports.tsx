import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import { ReportsSkeleton } from "@/components/Skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { useCandidates, useInterviews, useJobs } from "@/hooks/useJobs";
import { useOffers } from "@/hooks/useOffers";
import { useActiveStages } from "@/hooks/usePipelineStages";
import type { DateRange } from "@/components/reports/DateRangeFilter";
import { BranchComparisonTab } from "@/components/reports/BranchComparisonTab";
import { CostsAnalysisTab } from "@/components/reports/CostsAnalysisTab";
import { DepartmentsTableTab } from "@/components/reports/DepartmentsTableTab";
import HiringKPIReport from "@/components/reports/HiringKPIReport";
import ExecutiveKpiHub from "@/components/reports/ExecutiveKpiHub";
import ComplianceLicensingTab from "@/components/reports/ComplianceLicensingTab";
import AIInterviewAnalyticsTab from "@/components/reports/AIInterviewAnalyticsTab";
import { InterviewersPerfTab } from "@/components/reports/InterviewersPerfTab";
import { MonthlyComparisonTab } from "@/components/reports/MonthlyComparisonTab";
import { OverviewChartsTab } from "@/components/reports/OverviewChartsTab";
import { PerformanceChartsTab } from "@/components/reports/PerformanceChartsTab";
import { PipelineFunnelTab } from "@/components/reports/PipelineFunnelTab";
import { QualityRadarTab } from "@/components/reports/QualityRadarTab";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import ReportReviewModal from "@/components/reports/ReportReviewModal";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { SourceDetailTableTab } from "@/components/reports/SourceDetailTableTab";
import { SourcesOverviewTab } from "@/components/reports/SourcesOverviewTab";
import { TimeToHireTableTab } from "@/components/reports/TimeToHireTableTab";
import { WeeklyActivityTab } from "@/components/reports/WeeklyActivityTab";
import { exportReportsToExcel } from "@/components/reports/reportExports";
import {
  computeAiScoreDistribution,
  computeAvgTimeToHire,
  computeBranchesComparison,
  computeCostStats,
  computeDepartmentStats,
  computeFunnelData,
  computeHeaderSummaryKpis,
  computeInterviewerPerformance,
  computeMonthlyComparison,
  computeMonthlyTrends,
  computeOfferAcceptanceRate,
  computeOfferStats,
  computeQualityRadar,
  computeReportDocumentPayload,
  computeSourceDistribution,
  computeSourcePerformanceSummary,
  computeSourceQualityDetailed,
  computeStageTimeData,
  computeTimeToHirePerJob,
  computeWeeklyActivity,
  isDateInRange,
} from "@/components/reports/reportMetrics";

const DEFAULT_STAGE_KEYS = [
  "تقديم الطلب",
  "مراجعة السيرة",
  "فحص هاتفي",
  "مقابلة تقنية",
  "مقابلة نهائية",
  "العرض الوظيفي",
];

const TAB_TRIGGER_CLASS =
  "text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200";

export default function Reports() {
  const { toast } = useToast();
  const { activeCompany, companyBranches: branches } = useCompanyContext();
  const {
    data: candidates,
    isLoading: loadingCand,
    isError: errorCand,
    refetch: refetchCand,
  } = useCandidates(activeCompany?.id);
  const {
    data: jobs,
    isLoading: loadingJobs,
    isError: errorJobs,
    refetch: refetchJobs,
  } = useJobs(activeCompany?.id);
  const {
    data: interviews,
    isError: errorInterviews,
    refetch: refetchInterviews,
  } = useInterviews(activeCompany?.id);
  const {
    data: offers,
    isError: errorOffers,
    refetch: refetchOffers,
  } = useOffers(activeCompany?.id);
  const dynamicStages = useActiveStages();

  const reportRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { t, locale, dir } = useI18n();

  const displayStages = useMemo(
    () =>
      dynamicStages.length > 0
        ? dynamicStages.map((s) => s.name)
        : [
            t("stage.application"),
            t("stage.review"),
            t("stage.phoneScreen"),
            t("stage.technicalInterview"),
            t("stage.finalInterview"),
            t("stage.offer"),
          ],
    [dynamicStages, t],
  );

  const stageKeys = useMemo(
    () => (dynamicStages.length > 0 ? dynamicStages.map((s) => s.name) : DEFAULT_STAGE_KEYS),
    [dynamicStages],
  );

  const allJobs = useMemo(() => jobs || [], [jobs]);

  const jobMap = useMemo(() => {
    const map = new Map<string, (typeof allJobs)[0]>();
    allJobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [allJobs]);

  const departmentList = useMemo(() => {
    const depts = new Set<string>();
    allJobs.forEach((j) => {
      if (j.department && j.department.trim()) depts.add(j.department.trim());
    });
    return Array.from(depts);
  }, [allJobs]);

  const allOffers = useMemo(
    () =>
      (offers || []).filter((o) => {
        if (!isDateInRange(o.created_at, dateRange)) return false;
        if (selectedJobId !== "all" && o.job_id && o.job_id !== selectedJobId) return false;
        if (selectedDepartment !== "all") {
          const matchedJob = o.job_id ? jobMap.get(o.job_id) : undefined;
          if (matchedJob && matchedJob.department !== selectedDepartment) return false;
        }
        return true;
      }),
    [offers, dateRange, selectedJobId, selectedDepartment, jobMap],
  );

  const allCandidates = useMemo(
    () =>
      (candidates || []).filter((c) => {
        if (!isDateInRange(c.created_at, dateRange)) return false;
        if (selectedJobId !== "all" && c.job_id !== selectedJobId) return false;
        if (selectedDepartment !== "all") {
          const matchedJob = c.job_id ? jobMap.get(c.job_id) : undefined;
          if (matchedJob && matchedJob.department !== selectedDepartment) return false;
        }
        return true;
      }),
    [candidates, dateRange, selectedJobId, selectedDepartment, jobMap],
  );

  const allInterviews = useMemo(
    () =>
      (interviews || []).filter((i) => {
        if (!isDateInRange(i.date, dateRange)) return false;
        if (selectedJobId !== "all" && i.job_id && i.job_id !== selectedJobId) return false;
        if (selectedDepartment !== "all") {
          const matchedJob = i.job_id ? jobMap.get(i.job_id) : undefined;
          if (matchedJob && matchedJob.department !== selectedDepartment) return false;
        }
        return true;
      }),
    [interviews, dateRange, selectedJobId, selectedDepartment, jobMap],
  );

  const branchesComparisonData = useMemo(
    () =>
      computeBranchesComparison(
        activeCompany,
        branches,
        jobs || [],
        candidates || [],
        interviews || [],
      ),
    [activeCompany, branches, jobs, candidates, interviews],
  );

  const sourceData = useMemo(
    () => computeSourceDistribution(allCandidates, locale),
    [allCandidates, locale],
  );

  const sourcePerformance = useMemo(
    () => computeSourcePerformanceSummary(allCandidates, locale),
    [allCandidates, locale],
  );

  const funnelData = useMemo(
    () => computeFunnelData(allCandidates, stageKeys, displayStages),
    [allCandidates, stageKeys, displayStages],
  );

  const departmentData = useMemo(
    () => computeDepartmentStats(allJobs, allCandidates, locale),
    [allJobs, allCandidates, locale],
  );

  const monthlyData = useMemo(
    () => computeMonthlyTrends(allCandidates, allInterviews, locale),
    [allCandidates, allInterviews, locale],
  );

  const costData = useMemo(() => computeCostStats(departmentData), [departmentData]);

  const aiScoreData = useMemo(() => computeAiScoreDistribution(allCandidates), [allCandidates]);

  const dayLabel = t("reports.day");
  const avgTimeToHire = useMemo(
    () => computeAvgTimeToHire(allCandidates, dayLabel),
    [allCandidates, dayLabel],
  );

  const timeToHirePerJob = useMemo(
    () => computeTimeToHirePerJob(allJobs, allCandidates),
    [allJobs, allCandidates],
  );

  const offerAcceptanceRate = useMemo(() => computeOfferAcceptanceRate(allOffers), [allOffers]);

  const offerStats = useMemo(() => computeOfferStats(allOffers), [allOffers]);

  const stageTimeData = useMemo(
    () => computeStageTimeData(allCandidates, stageKeys, displayStages),
    [allCandidates, stageKeys, displayStages],
  );

  const interviewerPerformance = useMemo(
    () => computeInterviewerPerformance(allInterviews, locale),
    [allInterviews, locale],
  );

  const sourceQualityDetailed = useMemo(
    () => computeSourceQualityDetailed(allCandidates, locale),
    [allCandidates, locale],
  );

  const monthlyComparison = useMemo(
    () => computeMonthlyComparison(candidates || [], interviews || [], offers || [], locale),
    [candidates, interviews, offers, locale],
  );

  const weeklyActivityData = useMemo(
    () => computeWeeklyActivity(allCandidates, allInterviews, locale),
    [allCandidates, allInterviews, locale],
  );

  const qualityRadarData = useMemo(
    () => computeQualityRadar(allCandidates, allInterviews, locale),
    [allCandidates, allInterviews, locale],
  );

  const headerKpis = useMemo(
    () =>
      computeHeaderSummaryKpis({
        candidates: allCandidates,
        offers: allOffers,
        offerStats,
        avgTimeToHire,
        offerAcceptanceRate,
      }),
    [allCandidates, allOffers, offerStats, avgTimeToHire, offerAcceptanceRate],
  );

  const reportDocumentData = useMemo(
    () =>
      computeReportDocumentPayload({
        jobs: jobs || [],
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
      }),
    [
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
    ],
  );

  const handleExportExcel = useCallback(async () => {
    try {
      await exportReportsToExcel({
        candidates: allCandidates,
        jobs: allJobs,
        interviews: allInterviews,
        offers: allOffers,
        locale,
        t,
      });
      toast({
        title: t("reports.excelExported"),
        description: t("reports.excelDownloaded"),
      });
    } catch {
      toast({
        title: locale === "en" ? "Export failed" : "فشل التصدير",
        description:
          locale === "en"
            ? "Could not generate Excel report. Please try again."
            : "تعذر إنشاء ملف Excel. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  }, [allCandidates, allJobs, allInterviews, allOffers, locale, t, toast]);

  const handleRetryAll = useCallback(() => {
    void refetchCand();
    void refetchJobs();
    void refetchInterviews();
    void refetchOffers();
  }, [refetchCand, refetchJobs, refetchInterviews, refetchOffers]);

  if (loadingCand || loadingJobs) {
    return (
      <DashboardLayout>
        <ReportsSkeleton />
      </DashboardLayout>
    );
  }

  if (errorCand || errorJobs) {
    return (
      <DashboardLayout>
        <AnimatedDashboardBackground />
        <div className="p-4 lg:p-8 relative z-10">
          <Alert variant="destructive" className="max-w-xl mx-auto mt-10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {locale === "en" ? "Failed to load reports data" : "تعذر تحميل بيانات التقارير"}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-xs">
                {locale === "en"
                  ? "An error occurred while fetching candidates or jobs data for this company."
                  : "حدث خطأ أثناء جلب بيانات المرشحين أو الوظائف لهذه الشركة."}
              </p>
              <Button size="sm" variant="outline" onClick={handleRetryAll} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                {locale === "en" ? "Retry" : "إعادة المحاولة"}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="p-4 lg:p-8 space-y-6 relative z-10" ref={reportRef} dir={dir}>
        {(errorInterviews || errorOffers) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2 text-xs">
              <span>
                {locale === "en"
                  ? "Some secondary metrics (interviews or offers) failed to load and may be incomplete."
                  : "تعذر تحميل بعض المؤشرات الفرعية (المقابلات أو العروض)، قد تكون الأرقام غير مكتملة."}
              </span>
              <Button size="sm" variant="outline" onClick={handleRetryAll} className="h-7 text-xs">
                {locale === "en" ? "Retry" : "إعادة المحاولة"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <ReportsHeader
          title={t("reports.title")}
          subtitle={t("reports.subtitle")}
          exportExcelLabel={t("reports.exportExcel")}
          locale={locale}
          dir={dir}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          jobs={allJobs}
          selectedJobId={selectedJobId}
          onJobChange={setSelectedJobId}
          departments={departmentList}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          onResetAllFilters={() => {
            setDateRange({ from: undefined, to: undefined });
            setSelectedJobId("all");
            setSelectedDepartment("all");
          }}
          onOpenReviewModal={() => setReviewModalOpen(true)}
          onExportExcel={handleExportExcel}
        />

        <ReportKpiGrid kpis={headerKpis} t={t} />

        <Tabs defaultValue="executive" dir={dir}>
          <TabsList className="bg-md-surface-container border border-md-outline-variant p-1.5 rounded-md3-2xl flex-wrap gap-1.5 h-auto shadow-xs">
            <TabsTrigger value="executive" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Executive KPI Hub" : "المؤشرات التنفيذية للقيادة 📊"}
            </TabsTrigger>
            <TabsTrigger value="compliance" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Compliance & ETEC" : "الامتثال والتراخيص المهنية (ETEC) 🛡️"}
            </TabsTrigger>
            <TabsTrigger value="aiAnalytics" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "AI Analytics" : "تحليلات الذكاء الاصطناعي 🤖"}
            </TabsTrigger>
            <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
              {t("reports.overview")}
            </TabsTrigger>
            <TabsTrigger value="comparison" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Monthly Comparison" : "مقارنة شهرية"}
            </TabsTrigger>
            <TabsTrigger value="performance" className={TAB_TRIGGER_CLASS}>
              {t("reports.performance")}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className={TAB_TRIGGER_CLASS}>
              {t("reports.pipeline")}
            </TabsTrigger>
            <TabsTrigger value="time" className={TAB_TRIGGER_CLASS}>
              {t("reports.time")}
            </TabsTrigger>
            <TabsTrigger value="sources" className={TAB_TRIGGER_CLASS}>
              {t("reports.sourcesTab")}
            </TabsTrigger>
            <TabsTrigger value="costs" className={TAB_TRIGGER_CLASS}>
              {t("reports.costs")}
            </TabsTrigger>
            <TabsTrigger value="departments" className={TAB_TRIGGER_CLASS}>
              {t("reports.departments")}
            </TabsTrigger>
            <TabsTrigger value="interviewers" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Interviewers" : "المحاورون"}
            </TabsTrigger>
            <TabsTrigger value="sourceDetail" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Source Analysis" : "تحليل المصادر"}
            </TabsTrigger>
            <TabsTrigger value="weekly" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Weekly Activity" : "النشاط الأسبوعي"}
            </TabsTrigger>
            <TabsTrigger value="quality" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Quality Radar" : "رادار الجودة"}
            </TabsTrigger>
            <TabsTrigger value="hiringKPI" className={TAB_TRIGGER_CLASS}>
              {locale === "en" ? "Hiring KPIs" : "مؤشرات التوظيف"}
            </TabsTrigger>
            {branchesComparisonData.length > 1 && (
              <TabsTrigger value="branches" className={TAB_TRIGGER_CLASS}>
                {locale === "en" ? "Branch Comparison" : "مقارنة الفروع"}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="executive" className="space-y-4 mt-4">
            <ExecutiveKpiHub
              candidates={allCandidates}
              jobs={allJobs}
              interviews={allInterviews}
              offers={allOffers}
              locale={locale}
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4 mt-4">
            <ComplianceLicensingTab
              candidates={allCandidates}
              jobs={allJobs}
              locale={locale}
            />
          </TabsContent>

          <TabsContent value="aiAnalytics" className="space-y-4 mt-4">
            <AIInterviewAnalyticsTab
              candidates={allCandidates}
              interviews={allInterviews}
              jobs={allJobs}
              locale={locale}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <OverviewChartsTab monthlyData={monthlyData} aiScoreData={aiScoreData} t={t} />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            <MonthlyComparisonTab monthlyComparison={monthlyComparison} locale={locale} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <PerformanceChartsTab offerStats={offerStats} stageTimeData={stageTimeData} t={t} />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            <PipelineFunnelTab funnelData={funnelData} title={t("reports.recruitmentFunnel")} />
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <TimeToHireTableTab timeToHirePerJob={timeToHirePerJob} dir={dir} t={t} />
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <SourcesOverviewTab
              sourceData={sourceData}
              sourcePerformance={sourcePerformance}
              dir={dir}
              t={t}
            />
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <CostsAnalysisTab costData={costData} locale={locale} dir={dir} t={t} />
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <DepartmentsTableTab departmentData={departmentData} dir={dir} t={t} />
          </TabsContent>

          <TabsContent value="interviewers" className="mt-4">
            <InterviewersPerfTab
              interviewerPerformance={interviewerPerformance}
              locale={locale}
              t={t}
            />
          </TabsContent>

          <TabsContent value="sourceDetail" className="mt-4">
            <SourceDetailTableTab
              sourceQualityDetailed={sourceQualityDetailed}
              locale={locale}
              dir={dir}
              t={t}
            />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <WeeklyActivityTab weeklyActivityData={weeklyActivityData} locale={locale} />
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            <QualityRadarTab qualityRadarData={qualityRadarData} locale={locale} />
          </TabsContent>

          <TabsContent value="hiringKPI" className="mt-4">
            <HiringKPIReport
              candidates={allCandidates}
              jobs={allJobs}
              interviews={allInterviews}
              offers={allOffers}
              locale={locale}
            />
          </TabsContent>

          <TabsContent value="branches" className="space-y-4 mt-4">
            <BranchComparisonTab
              branchesComparisonData={branchesComparisonData}
              locale={locale}
              dir={dir}
            />
          </TabsContent>
        </Tabs>

        <ReportReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          reportData={reportDocumentData}
          locale={locale}
          onExportExcel={handleExportExcel}
        />
      </div>
    </DashboardLayout>
  );
}
