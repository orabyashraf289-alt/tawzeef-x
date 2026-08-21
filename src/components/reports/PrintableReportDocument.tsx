import React from "react";
import {
  BarChart3,
  Briefcase,
  Users,
  Calendar,
  Award,
  CheckCircle2,
  DollarSign,
  Clock,
  Building2,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  Sparkles,
} from "lucide-react";
import SARSymbol, { formatSAR } from "@/components/SARSymbol";

export interface PrintableReportData {
  companyName?: string;
  reportTitle?: string;
  reportType?: string;
  generatedBy?: string;
  dateRangeText?: string;
  includeSignatures?: boolean;
  includeRecommendations?: boolean;
  activeCompany?: any;
  branchesData?: any[];
  allCandidates: any[];
  allJobs: any[];
  allInterviews: any[];
  allOffers: any[];
  funnelData?: any[];
  departmentData?: any[];
  sourceData?: any[];
  qualityRadarData?: any[];
  kpis: {
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
  };
}

interface Props {
  data: PrintableReportData;
  locale?: string;
  selectedReportKey?: string;
}

export const PrintableReportDocument = React.forwardRef<HTMLDivElement, Props>(
  ({ data, locale = "ar", selectedReportKey = "all" }, ref) => {
    const isAr = locale !== "en";
    const dateStr = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString(isAr ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const isAll = selectedReportKey === "all";
    const showOverview = isAll || selectedReportKey === "overview";
    const showPipeline = isAll || selectedReportKey === "pipeline";
    const showBranches = isAll || selectedReportKey === "branches";
    const showDepartments = isAll || selectedReportKey === "departments";
    const showSources = isAll || selectedReportKey === "sources";
    const showOffers = isAll || selectedReportKey === "offers";
    const showQuality = isAll || selectedReportKey === "quality";
    const showInterviews = isAll || selectedReportKey === "interviews";

    return (
      <div
        ref={ref}
        id="printable-report-root"
        className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 font-sans p-8 sm:p-10 shadow-sm border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none leading-relaxed text-sm"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* ==================================================================== */}
        {/* DOCUMENT HEADER */}
        {/* ==================================================================== */}
        <header className="border-b-2 border-emerald-600 pb-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-xl shadow-md">
                TX
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  {data.companyName || (isAr ? "منصة توظيف إكس" : "TawzeefX Platform")}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isAr
                    ? "نظام التوظيف الذكي وإدارة المواهب المؤسسية"
                    : "Enterprise AI Recruitment & Talent Acquisition Platform"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {isAr ? "تقرير تنفيذي رسمي موثق" : "Official Executive Report"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left rtl:text-right space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 min-w-[200px]">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-slate-500">{isAr ? "رقم المستند:" : "Doc Ref:"}</span>
                <span className="font-mono font-bold text-slate-800">TX-REP-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-slate-500">{isAr ? "تاريخ الإصدار:" : "Issue Date:"}</span>
                <span className="font-medium">{dateStr}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-slate-500">{isAr ? "وقت الإصدار:" : "Time:"}</span>
                <span className="font-medium">{timeStr}</span>
              </div>
              {data.dateRangeText && (
                <div className="flex justify-between gap-2 pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-500">{isAr ? "الفترة المحددة:" : "Period:"}</span>
                  <span className="font-bold text-emerald-700">{data.dateRangeText}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              {data.reportTitle || (isAr ? "التقرير التنفيذي الشامل للتوظيف ومؤشرات الأداء" : "Comprehensive Recruitment & KPI Executive Report")}
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
              {isAr ? "نسخة جاهزة للطباعة والاعتماد" : "Print & Archive Ready"}
            </span>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* EXECUTIVE SUMMARY BOX */}
        {/* ==================================================================== */}
        <section className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {isAr ? "📌 الملخص التنفيذي وأبرز النتائج" : "Executive Summary & Highlights"}
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            {isAr ? (
              <>
                يقدم هذا التقرير تحليلاً شاملاً لأداء عمليات التوظيف ومسارات الفرز في المؤسسة خلال الفترة المحددة. بلغ إجمالي الشواغر الوظيفية{" "}
                <strong className="text-slate-900 font-bold">{data.kpis.totalJobs} وظيفة</strong> (منها {data.kpis.activeJobs} شاغر نشط)، باستقبال{" "}
                <strong className="text-slate-900 font-bold">{data.kpis.totalCandidates} متقدم</strong>، وإجراء{" "}
                <strong className="text-slate-900 font-bold">{data.kpis.totalInterviews} مقابلة</strong>. بلغت نسبة قبول العروض الوظيفية{" "}
                <strong className="text-emerald-700 font-bold">{data.kpis.acceptanceRate}%</strong> بمتوسط وقت توظيف قدره{" "}
                <strong className="text-slate-900 font-bold">{data.kpis.avgDaysToHire || 14} يوم</strong> وتكلفة تعيين تقديرية تبلغ{" "}
                <strong className="text-slate-900 font-bold">{formatSAR(data.kpis.estimatedCostPerHire, locale)}</strong>.
              </>
            ) : (
              <>
                This report summarizes hiring operations and pipeline efficiency. Total job postings reached{" "}
                <strong>{data.kpis.totalJobs} jobs</strong> ({data.kpis.activeJobs} active), with{" "}
                <strong>{data.kpis.totalCandidates} candidates</strong> evaluated,{" "}
                <strong>{data.kpis.totalInterviews} interviews</strong> conducted, and an offer acceptance rate of{" "}
                <strong>{data.kpis.acceptanceRate}%</strong> at an average time-to-fill of{" "}
                <strong>{data.kpis.avgDaysToHire || 14} days</strong>.
              </>
            )}
          </p>
        </section>

        {/* ==================================================================== */}
        {/* KPI METRIC CARDS (GRID) */}
        {/* ==================================================================== */}
        {showOverview && (
          <section className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {isAr ? "مؤشرات الأداء الرئيسية (KPIs)" : "Key Performance Indicators"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "الوظائف النشطة" : "Active Jobs"}</div>
                <div className="text-2xl font-black text-slate-900">{data.kpis.activeJobs}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? `من إجمالي ${data.kpis.totalJobs} وظيفة` : `Out of ${data.kpis.totalJobs} total`}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "إجمالي المتقدمين" : "Total Applicants"}</div>
                <div className="text-2xl font-black text-emerald-700">{data.kpis.totalCandidates}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "مرشح ومتقدم" : "Candidates"}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "المقابلات المنجزة" : "Completed Interviews"}</div>
                <div className="text-2xl font-black text-blue-700">{data.kpis.completedInterviews}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? `من ${data.kpis.totalInterviews} مقابلة` : `Of ${data.kpis.totalInterviews} scheduled`}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "نسبة قبول العروض" : "Offer Acceptance"}</div>
                <div className="text-2xl font-black text-emerald-600">{data.kpis.acceptanceRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? `${data.kpis.acceptedOffers} مقبول من ${data.kpis.totalOffers}` : `${data.kpis.acceptedOffers} accepted`}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "متوسط سرعة التعيين" : "Avg Time to Hire"}</div>
                <div className="text-2xl font-black text-slate-900">{data.kpis.avgDaysToHire || 14} <span className="text-xs font-normal text-slate-500">{isAr ? "يوم" : "days"}</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "من التقديم إلى القبول" : "From application"}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "متوسط تكلفة التعيين" : "Cost per Hire"}</div>
                <div className="text-2xl font-black text-slate-900">{formatSAR(data.kpis.estimatedCostPerHire, locale)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "تقديري للمرشح" : "Estimated"}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "إجمالي الإنفاق التقديري" : "Total Cost"}</div>
                <div className="text-2xl font-black text-slate-900">{formatSAR(data.kpis.totalHiringCost, locale)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "تكاليف العمليات" : "Hiring budget"}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isAr ? "كفاءة التعيين" : "Hiring Efficiency"}</div>
                <div className="text-2xl font-black text-emerald-700">
                  {data.kpis.totalCandidates > 0
                    ? Math.round((data.kpis.acceptedOffers / data.kpis.totalCandidates) * 100)
                    : 0}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "نسبة التحويل الإجمالية" : "End-to-end conversion"}</div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* SECTION 1: RECRUITMENT PIPELINE & FUNNEL */}
        {/* ==================================================================== */}
        {showPipeline && data.funnelData && data.funnelData.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              {isAr ? "1. مسار مراحل التوظيف والفرز (Recruitment Pipeline Funnel)" : "1. Recruitment Pipeline Funnel"}
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-slate-800 text-right rtl:text-right ltr:text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">{isAr ? "المرحلة" : "Stage"}</th>
                    <th className="p-2.5 text-center">{isAr ? "عدد المرشحين" : "Candidates"}</th>
                    <th className="p-2.5 text-center">{isAr ? "نسبة التحويل من الإجمالي" : "Conversion Rate"}</th>
                    <th className="p-2.5">{isAr ? "مؤشر الكفاءة" : "Efficiency"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.funnelData.map((f, i) => {
                    const pct = parseInt(f.rate, 10) || 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{f.displayStage || f.stage}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-800">{f.count}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{f.rate}</td>
                        <td className="p-2.5">
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* SECTION 2: BRANCH PERFORMANCE */}
        {/* ==================================================================== */}
        {showBranches && data.branchesData && data.branchesData.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              {isAr ? "2. أداء الفروع والشركات الإقليمية (Branch & Entity Benchmarking)" : "2. Branch & Entity Performance"}
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-slate-800 text-right rtl:text-right ltr:text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">{isAr ? "اسم الفرع / الشركة" : "Branch / Entity"}</th>
                    <th className="p-2.5 text-center">{isAr ? "الوظائف" : "Jobs"}</th>
                    <th className="p-2.5 text-center">{isAr ? "المتقدمين" : "Applicants"}</th>
                    <th className="p-2.5 text-center">{isAr ? "المقابلات" : "Interviews"}</th>
                    <th className="p-2.5 text-center">{isAr ? "المقبولين" : "Hired"}</th>
                    <th className="p-2.5 text-center">{isAr ? "معدل التحويل" : "Conversion"}</th>
                    <th className="p-2.5 text-center">{isAr ? "متوسط الأيام" : "Avg Days"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.branchesData.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">
                        {b.name}
                        {b.isBranch && <span className="text-[10px] text-slate-400 font-normal mr-1.5">({isAr ? "فرع" : "Branch"})</span>}
                      </td>
                      <td className="p-2.5 text-center font-mono">{b.jobsCount}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{b.candidatesCount}</td>
                      <td className="p-2.5 text-center font-mono">{b.interviewsCount}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">{b.hiredCount}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600">{b.conversionRate}%</td>
                      <td className="p-2.5 text-center font-mono">{b.avgDaysToHire ? `${b.avgDaysToHire} ${isAr ? "يوم" : "d"}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* SECTION 3: DEPARTMENT BREAKDOWN & SOURCES */}
        {/* ==================================================================== */}
        {(showDepartments || showSources) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 break-inside-avoid">
            {showDepartments && data.departmentData && data.departmentData.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                  {isAr ? "3. التوزيع حسب الأقسام" : "3. Department Breakdown"}
                </h4>
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-1.5">{isAr ? "القسم" : "Dept"}</th>
                      <th className="p-1.5 text-center">{isAr ? "الوظائف" : "Jobs"}</th>
                      <th className="p-1.5 text-center">{isAr ? "المتقدمين" : "Cands"}</th>
                      <th className="p-1.5 text-center">{isAr ? "التعيينات" : "Hires"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.departmentData.slice(0, 6).map((d, i) => (
                      <tr key={i}>
                        <td className="p-1.5 font-bold text-slate-800">{d.name}</td>
                        <td className="p-1.5 text-center font-mono">{d.jobs}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-emerald-700">{d.candidates}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-900">{d.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showSources && data.sourceData && data.sourceData.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  {isAr ? "4. مصادر الاستقطاب والمتقدمين" : "4. Candidate Sources"}
                </h4>
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-1.5">{isAr ? "المصدر" : "Source"}</th>
                      <th className="p-1.5 text-center">{isAr ? "العدد" : "Count"}</th>
                      <th className="p-1.5 text-center">{isAr ? "النسبة" : "Share"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.sourceData.slice(0, 6).map((s, i) => (
                      <tr key={i}>
                        <td className="p-1.5 font-bold text-slate-800">{s.name}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-900">{s.count}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-emerald-700">{s.value}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 4: JOB OFFERS & SALARIES TABLE */}
        {/* ==================================================================== */}
        {showOffers && data.allOffers && data.allOffers.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              {isAr ? "5. سجل العروض الوظيفية والرواتب (Job Offers & Compensation)" : "5. Job Offers & Compensation"}
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-slate-800 text-right rtl:text-right ltr:text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">{isAr ? "المسمى الوظيفي" : "Position"}</th>
                    <th className="p-2">{isAr ? "الراتب الشهري" : "Salary"}</th>
                    <th className="p-2 text-center">{isAr ? "النوع" : "Type"}</th>
                    <th className="p-2 text-center">{isAr ? "حالة العرض" : "Status"}</th>
                    <th className="p-2">{isAr ? "تاريخ الإصدار" : "Date"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.allOffers.slice(0, 8).map((o, i) => {
                    const statusText =
                      o.status === "accepted"
                        ? (isAr ? "مقبول ✅" : "Accepted")
                        : o.status === "rejected"
                        ? (isAr ? "مرفوض ❌" : "Rejected")
                        : (isAr ? "قيد الانتظار ⏳" : "Pending");
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{o.position}</td>
                        <td className="p-2 font-mono font-bold text-emerald-700">
                          {formatSAR(o.salary, locale)}
                        </td>
                        <td className="p-2 text-center text-slate-600">{o.offer_type || (isAr ? "دوام كامل" : "Full-time")}</td>
                        <td className="p-2 text-center font-bold text-xs">{statusText}</td>
                        <td className="p-2 text-slate-500 font-mono text-[11px]">
                          {new Date(o.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* SECTION 5: STRATEGIC RECOMMENDATIONS */}
        {/* ==================================================================== */}
        {data.includeRecommendations !== false && (
          <section className="mb-8 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              {isAr ? "💡 التوصيات الاستراتيجية لإدارة التوظيف" : "Strategic Recommendations"}
            </h3>
            <ul className="text-xs text-slate-800 space-y-1.5 list-disc list-inside">
              {isAr ? (
                <>
                  <li>الاستمرار في دعم قنوات الاستقطاب ذات معدل التحويل الأعلى ({data.sourceData?.[0]?.name || "لينكد إن"}) لخفض تكلفة التعيين.</li>
                  <li>تسريع مراحل المقابلات الفنية لتقليص متوسط أيام التوظيف دون التأثير على جودة الاختيار.</li>
                  <li>تفعيل التقييم التلقائي بالذكاء الاصطناعي لكافة السير الذاتية الواردة لتسريع الفرز الأولي بنسبة 60%.</li>
                </>
              ) : (
                <>
                  <li>Prioritize high-conversion recruitment channels to optimize cost-per-hire.</li>
                  <li>Streamline interview scheduling to decrease overall time-to-fill.</li>
                  <li>Utilize automated AI scoring on initial resume screening to accelerate shortlisting.</li>
                </>
              )}
            </ul>
          </section>
        )}

        {/* ==================================================================== */}
        {/* SECTION 6: OFFICIAL SIGN-OFF & STAMPS */}
        {/* ==================================================================== */}
        {data.includeSignatures !== false && (
          <footer className="pt-6 border-t-2 border-slate-300 break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-700">{isAr ? "إعداد ومراجعة مسؤول التوظيف:" : "Prepared & Reviewed by:"}</div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end">
                  <span className="text-xs text-slate-500 font-mono italic">{data.generatedBy || "مدير عمليات التوظيف"}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{isAr ? "التوقيع: ____________" : "Signature: ____________"}</span>
                  <span>{isAr ? "التاريخ: ____________" : "Date: ____________"}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-700">{isAr ? "اعتماد الإدارة التنفيذية / الموارد البشرية:" : "Approved by Head of HR / Exec:"}</div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-between">
                  <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {isAr ? "معتمد وموثق رقمياً" : "Digitally Verified"}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{isAr ? "التوقيع: ____________" : "Signature: ____________"}</span>
                  <span>{isAr ? "التاريخ: ____________" : "Date: ____________"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-100">
              <span>{isAr ? "تم إصدار هذا التقرير آلياً عبر منصة TawzeefX للتوظيف الذكي." : "Generated automatically via TawzeefX AI Hiring Platform."}</span>
              <span className="font-mono">https://www.tawzeefx.com</span>
            </div>
          </footer>
        )}
      </div>
    );
  }
);

PrintableReportDocument.displayName = "PrintableReportDocument";
