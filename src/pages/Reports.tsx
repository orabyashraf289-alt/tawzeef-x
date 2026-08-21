import { useMemo, useRef, useState } from "react";
import SARSymbol from "@/components/SARSymbol";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { TrendingUp, Users, Clock, Target, Award, BarChart3, Download, DollarSign, Briefcase, Brain, FileDown, Loader2, CalendarClock, CheckCircle2, Timer, Activity, UserCheck, Zap, Filter, RotateCcw, Printer, FileText, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useCandidates, useJobs, useInterviews } from "@/hooks/useJobs";
import { useActiveStages } from "@/hooks/usePipelineStages";
import { useOffers } from "@/hooks/useOffers";
import { useCompanyBranches } from "@/hooks/useCompanies";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { type DateRange } from "@/components/reports/DateRangeFilter";
import HiringKPIReport from "@/components/reports/HiringKPIReport";
import ReportReviewModal from "@/components/reports/ReportReviewModal";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";

const SOURCE_COLORS: Record<string, string> = {
  "LinkedIn": "hsl(222, 65%, 46%)",
  "الموقع": "hsl(174, 62%, 40%)",
  "إحالات": "hsl(36, 90%, 48%)",
  "أخرى": "hsl(220, 14%, 65%)",
};

const tooltipStyle = {
  borderRadius: "12px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border) / 0.5)",
  backgroundColor: "hsl(var(--card) / 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
};

import { ReportsSkeleton } from "@/components/Skeletons";

export default function Reports() {
  const { toast } = useToast();
  const { activeCompany, companyBranches: branches } = useCompanyContext();
  const { data: candidates, isLoading: loadingCand } = useCandidates(activeCompany?.id);
  const { data: jobs, isLoading: loadingJobs } = useJobs(activeCompany?.id);
  const { data: interviews } = useInterviews(activeCompany?.id);
  const { data: offers } = useOffers(activeCompany?.id);
  const dynamicStages = useActiveStages();

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { t, locale, dir } = useI18n();

  const branchesComparisonData = useMemo(() => {
    if (!activeCompany) return [];

    const list = [
      activeCompany,
      ...branches
    ];

    return list.map((c) => {
      const compJobs = (jobs || []).filter(j => j.company_id === c.id);
      const compJobIds = compJobs.map(j => j.id);

      const compCandidates = (candidates || []).filter(cand => cand.company_id === c.id || compJobIds.includes(cand.job_id));
      const compInterviews = (interviews || []).filter(i => compCandidates.some(cand => cand.id === i.candidate_id));
      const hired = compCandidates.filter(cand => cand.status === "مقبول");

      const avgDays = hired.length > 0
        ? Math.round(hired.reduce((sum, cand) => sum + Math.max(Math.floor((new Date(cand.updated_at).getTime() - new Date(cand.created_at).getTime()) / 86400000), 1), 0) / hired.length)
        : null;

      const totalCandidates = compCandidates.length;
      const hiredCount = hired.length;
      const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;

      return {
        id: c.id,
        name: c.name || (c.parent_company_id ? "فرع بدون اسم" : "الشركة الرئيسية"),
        isBranch: !!c.parent_company_id,
        jobsCount: compJobs.length,
        candidatesCount: totalCandidates,
        interviewsCount: compInterviews.length,
        hiredCount,
        conversionRate,
        avgDaysToHire: avgDays,
      };
    });
  }, [activeCompany, branches, jobs, candidates, interviews]);

  
  // Date filtering helper
  const isInRange = (dateStr: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const d = new Date(dateStr);
    if (dateRange.from && d < new Date(dateRange.from.setHours(0, 0, 0, 0))) return false;
    if (dateRange.to && d > new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))) return false;
    return true;
  };
  
  const allOffers = (offers || []).filter(o => isInRange(o.created_at));

  const STAGES = dynamicStages.length > 0
    ? dynamicStages.map(s => s.name)
    : [t("stage.application"), t("stage.review"), t("stage.phoneScreen"), t("stage.technicalInterview"), t("stage.finalInterview"), t("stage.offer")];
  
  const STAGE_KEYS = dynamicStages.length > 0
    ? dynamicStages.map(s => s.name)
    : ["تقديم الطلب", "مراجعة السيرة", "فحص هاتفي", "مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"];

  const allCandidates = (candidates || []).filter(c => isInRange(c.created_at));
  const allJobs = jobs || [];
  const allInterviews = (interviews || []).filter(i => isInRange(i.date));

  // Source distribution
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    allCandidates.forEach(c => {
      const src = c.source || (locale === "en" ? "Other" : "أخرى");
      map[src] = (map[src] || 0) + 1;
    });
    const total = allCandidates.length || 1;
    return Object.entries(map).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      count,
      color: SOURCE_COLORS[name] || `hsl(${Math.random() * 360}, 50%, 50%)`,
    }));
  }, [allCandidates, locale]);

  // Pipeline funnel
  const funnelData = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    STAGE_KEYS.forEach(s => { stageCounts[s] = 0; });
    
    allCandidates.forEach(c => {
      const stage = c.stage || STAGE_KEYS[0];
      const idx = STAGE_KEYS.indexOf(stage);
      for (let i = 0; i <= Math.max(idx, 0); i++) {
        stageCounts[STAGE_KEYS[i]] = (stageCounts[STAGE_KEYS[i]] || 0) + 1;
      }
    });

    const total = stageCounts[STAGE_KEYS[0]] || 1;
    return STAGE_KEYS.map((stage, i) => ({
      stage,
      displayStage: STAGES[i],
      count: stageCounts[stage],
      rate: `${Math.round((stageCounts[stage] / total) * 100)}%`,
    }));
  }, [allCandidates, STAGES, STAGE_KEYS]);

  // Department stats
  const departmentData = useMemo(() => {
    const deptMap: Record<string, { jobs: number; candidates: number; hired: number }> = {};
    allJobs.forEach(j => {
      if (!deptMap[j.department]) deptMap[j.department] = { jobs: 0, candidates: 0, hired: 0 };
      deptMap[j.department].jobs++;
    });
    allCandidates.forEach(c => {
      const job = allJobs.find(j => j.id === c.job_id);
      const dept = job?.department || (locale === "en" ? "Unspecified" : "غير محدد");
      if (!deptMap[dept]) deptMap[dept] = { jobs: 0, candidates: 0, hired: 0 };
      deptMap[dept].candidates++;
      if (c.status === "مقبول") deptMap[dept].hired++;
    });
    return Object.entries(deptMap).map(([name, data]) => ({ name, ...data }));
  }, [allJobs, allCandidates, locale]);

  // Monthly trends from real data
  const monthlyData = useMemo(() => {
    const months: Record<string, { applied: number; interviews: number; hired: number }> = {};
    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNames = locale === "en" ? monthNamesEn : monthNamesAr;
    
    allCandidates.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { applied: 0, interviews: 0, hired: 0 };
      months[key].applied++;
      if (c.status === "مقبول") months[key].hired++;
    });
    allInterviews.forEach(i => {
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
        return { month: monthNames[parseInt(m)], ...data };
      });
  }, [allCandidates, allInterviews, locale]);

  // Cost per department
  const costData = useMemo(() => {
    const AVG_COST = 2500;
    return departmentData.map(d => ({
      name: d.name,
      cost: d.hired * AVG_COST,
      hires: d.hired,
      costPerHire: d.hired > 0 ? AVG_COST : 0,
    }));
  }, [departmentData]);

  // AI score distribution
  const aiScoreData = useMemo(() => {
    const ranges = [
      { label: "90-100%", min: 90, max: 100, count: 0 },
      { label: "70-89%", min: 70, max: 89, count: 0 },
      { label: "50-69%", min: 50, max: 69, count: 0 },
      { label: "0-49%", min: 0, max: 49, count: 0 },
    ];
    allCandidates.forEach(c => {
      const score = (c as any).ai_score;
      if (score != null) {
        const range = ranges.find(r => score >= r.min && score <= r.max);
        if (range) range.count++;
      }
    });
    return ranges;
  }, [allCandidates]);

  // Time to hire
  const avgTimeToHire = useMemo(() => {
    const hiredCandidates = allCandidates.filter(c => c.status === "مقبول");
    if (hiredCandidates.length === 0) return "—";
    const totalDays = hiredCandidates.reduce((sum, c) => {
      const days = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
      return sum + Math.max(days, 1);
    }, 0);
    const avg = Math.round(totalDays / hiredCandidates.length);
    return `${avg} ${t("reports.day")}`;
  }, [allCandidates, t]);

  // Time-to-hire per job
  const timeToHirePerJob = useMemo(() => {
    return allJobs.map(job => {
      const jobCands = allCandidates.filter(c => c.job_id === job.id);
      const hired = jobCands.filter(c => c.status === "مقبول");
      const avgDays = hired.length > 0
        ? Math.round(hired.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hired.length)
        : null;
      return {
        title: job.title,
        department: job.department,
        candidates: jobCands.length,
        hired: hired.length,
        avgDays,
        status: job.status,
      };
    }).filter(j => j.candidates > 0).sort((a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999));
  }, [allJobs, allCandidates]);

  // KPIs
  const totalCandidates = allCandidates.length;
  const hired = allCandidates.filter(c => c.status === "مقبول").length;
  const conversionRate = totalCandidates > 0 ? ((hired / totalCandidates) * 100).toFixed(1) : "0";
  const avgAiScore = (() => {
    const scored = allCandidates.filter(c => (c as any).ai_score != null);
    if (scored.length === 0) return "—";
    return Math.round(scored.reduce((sum, c) => sum + ((c as any).ai_score || 0), 0) / scored.length) + "%";
  })();
  const acceptRate = allInterviews.length > 0
    ? Math.round((allInterviews.filter(i => i.status === "مكتملة").length / allInterviews.length) * 100) + "%"
    : "—";
  const totalCostNum = (hired * 2500).toLocaleString();

  // Offer acceptance rate
  const offerAcceptanceRate = useMemo(() => {
    const responded = allOffers.filter(o => o.status === "accepted" || o.status === "rejected");
    if (responded.length === 0) return "—";
    const accepted = responded.filter(o => o.status === "accepted").length;
    return Math.round((accepted / responded.length) * 100) + "%";
  }, [allOffers]);

  const offerStats = useMemo(() => {
    const total = allOffers.length;
    const sent = allOffers.filter(o => o.status === "sent").length;
    const accepted = allOffers.filter(o => o.status === "accepted").length;
    const rejected = allOffers.filter(o => o.status === "rejected").length;
    const pending = allOffers.filter(o => o.status === "draft" || o.status === "sent" || o.status === "viewed").length;
    const avgResponseDays = (() => {
      const responded = allOffers.filter(o => o.response_date && o.sent_at);
      if (responded.length === 0) return null;
      const totalDays = responded.reduce((sum, o) => {
        const days = Math.floor((new Date(o.response_date!).getTime() - new Date(o.sent_at!).getTime()) / 86400000);
        return sum + Math.max(days, 1);
      }, 0);
      return Math.round(totalDays / responded.length);
    })();
    return { total, sent, accepted, rejected, pending, avgResponseDays };
  }, [allOffers]);

  // Average time per pipeline stage
  const stageTimeData = useMemo(() => {
    const stageOrder: Record<string, number> = {};
    STAGE_KEYS.forEach((s, i) => { stageOrder[s] = i; });

    const stageTimeSums: Record<string, { totalDays: number; count: number }> = {};
    STAGE_KEYS.forEach(s => { stageTimeSums[s] = { totalDays: 0, count: 0 }; });

    allCandidates.forEach(c => {
      const stage = c.stage || STAGE_KEYS[0];
      const days = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
      if (stageTimeSums[stage]) {
        stageTimeSums[stage].totalDays += Math.max(days, 1);
        stageTimeSums[stage].count++;
      }
    });

    return STAGE_KEYS.map((stage, i) => ({
      stage,
      displayStage: STAGES[i],
      avgDays: stageTimeSums[stage].count > 0
        ? Math.round(stageTimeSums[stage].totalDays / stageTimeSums[stage].count)
        : 0,
      count: stageTimeSums[stage].count,
    }));
  }, [allCandidates, STAGES, STAGE_KEYS]);

  // Interviewer performance
  const interviewerPerformance = useMemo(() => {
    const map: Record<string, { total: number; completed: number; avgRating: number; totalRating: number; ratedCount: number }> = {};
    allInterviews.forEach(i => {
      const name = i.interviewer || (locale === "en" ? "Unassigned" : "غير محدد");
      if (!map[name]) map[name] = { total: 0, completed: 0, avgRating: 0, totalRating: 0, ratedCount: 0 };
      map[name].total++;
      if (i.status === "مكتملة") {
        map[name].completed++;
        if (i.rating) { map[name].totalRating += i.rating; map[name].ratedCount++; }
      }
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgRating: data.ratedCount > 0 ? +(data.totalRating / data.ratedCount).toFixed(1) : 0,
    })).sort((a, b) => b.completed - a.completed);
  }, [allInterviews, locale]);

  // Source quality with detailed analysis
  const sourceQualityDetailed = useMemo(() => {
    const map: Record<string, { total: number; hired: number; avgScore: number; scoreCount: number; avgDays: number; daysCount: number }> = {};
    allCandidates.forEach(c => {
      const src = c.source || (locale === "en" ? "Other" : "أخرى");
      if (!map[src]) map[src] = { total: 0, hired: 0, avgScore: 0, scoreCount: 0, avgDays: 0, daysCount: 0 };
      map[src].total++;
      if (c.status === "مقبول") {
        map[src].hired++;
        const days = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
        map[src].avgDays += Math.max(days, 1);
        map[src].daysCount++;
      }
      if (c.ai_score != null) { map[src].avgScore += c.ai_score; map[src].scoreCount++; }
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      total: d.total,
      hired: d.hired,
      conversionRate: d.total > 0 ? Math.round((d.hired / d.total) * 100) : 0,
      avgAiScore: d.scoreCount > 0 ? Math.round(d.avgScore / d.scoreCount) : 0,
      avgDaysToHire: d.daysCount > 0 ? Math.round(d.avgDays / d.daysCount) : null,
    })).sort((a, b) => b.total - a.total);
  }, [allCandidates, locale]);

  // Monthly comparison data (current vs previous month)
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mNames = locale === "en" ? monthNamesEn : monthNamesAr;

    const isInMonth = (dateStr: string, month: number, year: number) => {
      const d = new Date(dateStr);
      return d.getMonth() === month && d.getFullYear() === year;
    };

    const currentCandidates = allCandidates.filter(c => isInMonth(c.created_at, currentMonth, currentYear));
    const prevCandidates = allCandidates.filter(c => isInMonth(c.created_at, prevMonth, prevYear));
    const currentInterviews = allInterviews.filter(i => isInMonth(i.date, currentMonth, currentYear));
    const prevInterviews = allInterviews.filter(i => isInMonth(i.date, prevMonth, prevYear));
    const currentHired = currentCandidates.filter(c => c.status === "مقبول").length;
    const prevHired = prevCandidates.filter(c => c.status === "مقبول").length;
    const currentOffers = allOffers.filter(o => o.created_at && isInMonth(o.created_at, currentMonth, currentYear));
    const prevOffers = allOffers.filter(o => o.created_at && isInMonth(o.created_at, prevMonth, prevYear));

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const metrics = [
      { label: locale === "en" ? "Candidates" : "مرشحين", current: currentCandidates.length, previous: prevCandidates.length },
      { label: locale === "en" ? "Interviews" : "مقابلات", current: currentInterviews.length, previous: prevInterviews.length },
      { label: locale === "en" ? "Hired" : "توظيف", current: currentHired, previous: prevHired },
      { label: locale === "en" ? "Offers" : "عروض", current: currentOffers.length, previous: prevOffers.length },
    ].map(m => ({ ...m, change: calcChange(m.current, m.previous) }));

    return {
      currentMonthName: mNames[currentMonth],
      prevMonthName: mNames[prevMonth],
      metrics,
      chartData: metrics.map(m => ({
        name: m.label,
        [mNames[currentMonth]]: m.current,
        [mNames[prevMonth]]: m.previous,
      })),
    };
  }, [allCandidates, allInterviews, allOffers, locale]);

  // Professional PDF Export using html2canvas to render Arabic text and charts perfectly
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    
    toast({
      title: locale === "ar" ? "جاري تحضير ملف PDF..." : "Preparing PDF...",
      description: locale === "ar" ? "الرجاء الانتظار حتى يتم توليد التقرير المطبوع." : "Please wait while generating the printed report.",
    });

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

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

      pdf.save(`Tawzeef-X-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: locale === "ar" ? "تم تصدير التقرير بنجاح PDF ✅" : "Report Exported successfully PDF ✅" });
    } catch (e) {
      console.error("PDF export error:", e);
      toast({ title: locale === "ar" ? "فشل تصدير التقرير" : "Failed to export report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Excel Export
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const candidatesSheet = allCandidates.map(c => ({
      [t("reports.xl.name")]: c.name,
      [t("reports.xl.email")]: c.email || "",
      [t("reports.xl.role")]: c.role || "",
      [t("reports.xl.stage")]: c.stage || "",
      [t("reports.xl.status")]: c.status,
      [t("reports.xl.source")]: c.source || "",
      [t("reports.xl.aiScore")]: c.ai_score ?? "",
      [t("reports.xl.createdAt")]: new Date(c.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA"),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(candidatesSheet), locale === "en" ? "Candidates" : "المرشحون");

    const jobsSheet = allJobs.map(j => ({
      [t("reports.xl.jobTitle")]: j.title,
      [t("reports.xl.department")]: j.department,
      [t("reports.xl.location")]: j.location,
      [t("reports.xl.status")]: j.status,
      [t("reports.xl.type")]: j.type,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobsSheet), locale === "en" ? "Jobs" : "الوظائف");

    const interviewsSheet = allInterviews.map(i => ({
      [t("reports.xl.candidateName")]: i.candidate_name,
      [t("reports.xl.position")]: i.position,
      [t("reports.xl.date")]: i.date,
      [t("reports.xl.time")]: i.time,
      [t("reports.xl.status")]: i.status,
      [t("reports.xl.type")]: i.type,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(interviewsSheet), locale === "en" ? "Interviews" : "المقابلات");

    const offersSheet = allOffers.map(o => ({
      [t("reports.xl.position")]: o.position,
      [t("reports.xl.salary")]: o.salary,
      [t("reports.xl.currency")]: o.currency,
      [t("reports.xl.status")]: o.status,
      [t("reports.xl.offerType")]: o.offer_type,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offersSheet), locale === "en" ? "Offers" : "العروض");

    const dateStr = new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA");
    XLSX.writeFile(wb, `${locale === "en" ? "recruitment-report" : "تقرير-التوظيف"}-${dateStr}.xlsx`);
  };

  // Weekly activity heatmap data
  const weeklyActivityData = useMemo(() => {
    const dayNames = locale === "en" 
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    const dayMap: Record<number, { applications: number; interviews: number; hires: number }> = {};
    for (let i = 0; i < 7; i++) dayMap[i] = { applications: 0, interviews: 0, hires: 0 };
    
    allCandidates.forEach(c => {
      const day = new Date(c.created_at).getDay();
      dayMap[day].applications++;
      if (c.status === "مقبول") dayMap[day].hires++;
    });
    allInterviews.forEach(iv => {
      const day = new Date(iv.date).getDay();
      dayMap[day].interviews++;
    });
    
    return Object.entries(dayMap).map(([day, data]) => ({
      day: dayNames[parseInt(day)],
      ...data,
    }));
  }, [allCandidates, allInterviews, locale]);

  // Candidate quality radar data
  const qualityRadarData = useMemo(() => {
    const scored = allCandidates.filter(c => c.ai_score != null);
    const total = allCandidates.length || 1;
    const hiredCount = allCandidates.filter(c => c.status === "مقبول").length;
    const withResume = allCandidates.filter(c => c.resume_url).length;
    const completedInterviews = allInterviews.filter(i => i.status === "مكتملة").length;
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + (c.ai_score || 0), 0) / scored.length) : 0;

    const labels = locale === "en" 
      ? ["AI Score", "Conversion", "Resume Rate", "Interview Completion", "Source Diversity"]
      : ["تقييم AI", "معدل التحويل", "نسبة السير الذاتية", "إتمام المقابلات", "تنوع المصادر"];

    const sources = new Set(allCandidates.map(c => c.source || "أخرى"));
    const sourceDiversity = Math.min((sources.size / 5) * 100, 100);

    return labels.map((label, i) => ({
      metric: label,
      value: [
        avgScore,
        total > 0 ? Math.round((hiredCount / total) * 100) : 0,
        total > 0 ? Math.round((withResume / total) * 100) : 0,
        allInterviews.length > 0 ? Math.round((completedInterviews / allInterviews.length) * 100) : 0,
        Math.round(sourceDiversity),
      ][i],
      fullMark: 100,
    }));
  }, [allCandidates, allInterviews, locale]);

  const chartAppliedLabel = t("reports.applied");
  const chartInterviewsLabel = t("reports.interviews");
  const chartHiredLabel = t("reports.hired");
  const chartCandidateCountLabel = t("reports.candidateCount");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const reportDocumentData = useMemo(() => {
    const totalJobs = (jobs || []).length;
    const activeJobs = (jobs || []).filter(j => j.status === "نشطة").length;
    const totalCandidates = allCandidates.length;
    const shortlistedCandidates = allCandidates.filter(c => c.stage && c.stage !== "تقديم الطلب").length;
    const totalInterviews = allInterviews.length;
    const completedInterviews = allInterviews.filter(i => i.status === "مكتملة").length;
    const totalOffers = allOffers.length;
    const acceptedOffers = allOffers.filter(o => o.status === "accepted").length;
    const rejectedOffers = allOffers.filter(o => o.status === "rejected").length;
    const respondedOffers = acceptedOffers + rejectedOffers;
    const acceptanceRate = respondedOffers > 0 ? Math.round((acceptedOffers / respondedOffers) * 100) : 0;

    const hiredCandidates = allCandidates.filter(c => c.status === "مقبول");
    const avgDaysToHire = hiredCandidates.length > 0
      ? Math.round(hiredCandidates.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hiredCandidates.length)
      : 14;

    const estimatedCostPerHire = 2500;
    const totalHiringCost = hiredCandidates.length * estimatedCostPerHire;

    let dateRangeText = "";
    if (dateRange.from && dateRange.to) {
      dateRangeText = `${new Date(dateRange.from).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")} - ${new Date(dateRange.to).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}`;
    } else if (dateRange.from) {
      dateRangeText = `من ${new Date(dateRange.from).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}`;
    }

    return {
      companyName: activeCompany?.name || (locale === "en" ? "TawzeefX Platform" : "منصة توظيف إكس"),
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
        estimatedCostPerHire,
        totalHiringCost,
      },
    };
  }, [
    jobs,
    allCandidates,
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
  ]);

  if (loadingCand || loadingJobs) {
    return (
      <DashboardLayout>
        <ReportsSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="p-4 lg:p-8 space-y-6 relative z-10" ref={reportRef}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md3-full bg-md-primary-container text-md-on-primary-container text-xs font-bold mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>مركز التقارير ومؤشرات الأداء التنفيذية</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-foreground">{t("reports.title")}</h1>
              <p className="text-muted-foreground text-xs mt-0.5">{t("reports.subtitle")}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                onClick={() => setReviewModalOpen(true)}
                className="gap-2 rounded-md3-xl bg-md-primary text-md-on-primary hover:bg-md-primary/90 h-10 px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                <span>{locale === "en" ? "Review & Print Reports" : "مراجعة وطباعة التقارير 🖨️"}</span>
              </Button>
              <Button
                onClick={() => setReviewModalOpen(true)}
                variant="outline"
                className="gap-2 rounded-md3-xl border-md-outline-variant h-10 px-4 text-xs font-bold"
              >
                <FileDown className="w-4 h-4 text-primary" />
                <span>{locale === "en" ? "Export PDF" : "تصدير PDF 📄"}</span>
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="gap-2 rounded-md3-xl border-md-outline-variant h-10 px-4 text-xs font-bold"
              >
                <Download className="w-4 h-4 text-primary" />
                <span>{t("reports.exportExcel")}</span>
              </Button>
            </div>
          </div>
          {/* Date Range Filter */}
          <div className="flex items-center gap-3 flex-wrap bg-md-surface-container p-2.5 rounded-md3-2xl border border-md-outline-variant shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Filter className="w-4 h-4 text-primary" />
              <span>{locale === "en" ? "Date Range:" : "الفترة الزمنية:"}</span>
            </div>
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              locale={locale}
              dir={dir}
            />
            {(dateRange.from || dateRange.to) && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: undefined, to: undefined })} className="gap-1.5 text-xs text-rose-500 hover:text-rose-600 rounded-md3-full h-8">
                <RotateCcw className="w-3.5 h-3.5" />
                {locale === "en" ? "Reset" : "إعادة ضبط"}
              </Button>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Target, title: t("reports.conversionRate"), value: `${conversionRate}%`, colorClass: "text-primary", bg: "bg-md-primary-container/40 border-primary/20" },
            { icon: Users, title: t("reports.totalCandidates"), value: totalCandidates.toString(), colorClass: "text-foreground", bg: "bg-md-surface-container border-md-outline-variant" },
            { icon: Award, title: t("reports.hired"), value: hired.toString(), colorClass: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { icon: Brain, title: t("reports.avgAiScore"), value: avgAiScore, colorClass: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { icon: CalendarClock, title: t("reports.avgTimeToHire"), value: avgTimeToHire, colorClass: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { icon: DollarSign, title: t("reports.hiringCost"), value: totalCostNum, colorClass: "text-primary", bg: "bg-md-surface-container-low border-md-outline-variant" },
            { icon: CheckCircle2, title: t("reports.offerAcceptRate"), value: offerAcceptanceRate, colorClass: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { icon: Timer, title: t("reports.avgOfferResponse"), value: offerStats.avgResponseDays != null ? `${offerStats.avgResponseDays} ${t("reports.day")}` : "—", colorClass: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={cn("relative overflow-hidden p-5 border rounded-md3-2xl transition-all duration-200 hover:scale-[1.02] shadow-xs", kpi.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-md3-md bg-card flex items-center justify-center shadow-xs">
                  <kpi.icon className={cn("w-4 h-4 shrink-0", kpi.colorClass)} />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">{kpi.title}</span>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", kpi.colorClass)}>{kpi.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" dir={dir}>
          <TabsList className="bg-md-surface-container border border-md-outline-variant p-1.5 rounded-md3-2xl flex-wrap gap-1.5 h-auto shadow-xs">
            <TabsTrigger value="overview" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.overview")}</TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Monthly Comparison" : "مقارنة شهرية"}</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.performance")}</TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.pipeline")}</TabsTrigger>
            <TabsTrigger value="time" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.time")}</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.sourcesTab")}</TabsTrigger>
            <TabsTrigger value="costs" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.costs")}</TabsTrigger>
            <TabsTrigger value="departments" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{t("reports.departments")}</TabsTrigger>
            <TabsTrigger value="interviewers" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Interviewers" : "المحاورون"}</TabsTrigger>
            <TabsTrigger value="sourceDetail" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Source Analysis" : "تحليل المصادر"}</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Weekly Activity" : "النشاط الأسبوعي"}</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Quality Radar" : "رادار الجودة"}</TabsTrigger>
            <TabsTrigger value="hiringKPI" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Hiring KPIs" : "مؤشرات التوظيف"}</TabsTrigger>
            {branchesComparisonData.length > 1 && (
              <TabsTrigger value="branches" className="text-xs sm:text-sm rounded-md3-full px-4 py-2 font-bold data-[state=active]:bg-md-primary data-[state=active]:text-md-on-primary data-[state=active]:shadow-sm transition-all duration-200">{locale === "en" ? "Branch Comparison" : "مقارنة الفروع"}</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Monthly Trends */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />{t("reports.monthlyTrends")}
                </h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="appliedG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(222,65%,46%)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(222,65%,46%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                      <Area type="monotone" dataKey="applied" name={chartAppliedLabel} fill="url(#appliedG)" stroke="hsl(222,65%,46%)" strokeWidth={2} />
                      <Area type="monotone" dataKey="interviews" name={chartInterviewsLabel} fill="hsl(174,62%,40%)" fillOpacity={0.1} stroke="hsl(174,62%,40%)" strokeWidth={2} />
                      <Area type="monotone" dataKey="hired" name={chartHiredLabel} fill="hsl(152,56%,40%)" fillOpacity={0.1} stroke="hsl(152,56%,40%)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                )}
              </div>

              {/* AI Score Distribution */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Brain className="w-4 h-4 text-primary" />{t("reports.aiScoreDistribution")}
                </h3>
                {aiScoreData.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={aiScoreData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} width={60} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                      <Bar dataKey="count" name={chartCandidateCountLabel} fill="hsl(222,65%,46%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noAiEvaluation")}</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Monthly Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Bar Chart Comparison */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {monthlyComparison.currentMonthName} vs {monthlyComparison.prevMonthName}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyComparison.chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                    <Bar dataKey={monthlyComparison.currentMonthName} fill="hsl(222,65%,46%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey={monthlyComparison.prevMonthName} fill="hsl(220,14%,80%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Change Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Activity className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Change Rate" : "نسبة التغيير"}
                </h3>
                {monthlyComparison.metrics.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center justify-between hover:translate-y-0 hover:scale-[1.005]">
                    <div>
                      <p className="text-sm font-bold text-foreground">{m.label}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{monthlyComparison.prevMonthName}: <strong>{m.previous}</strong></span>
                        <span className="text-xs text-foreground">{monthlyComparison.currentMonthName}: <strong>{m.current}</strong></span>
                      </div>
                    </div>
                    <Badge variant={m.change >= 0 ? "default" : "destructive"} className={`text-sm font-bold ${m.change >= 0 ? "bg-success/10 text-success border-success/20" : ""}`}>
                      {m.change >= 0 ? "↑" : "↓"} {Math.abs(m.change)}%
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab - Offer Acceptance & Stage Times */}
          <TabsContent value="performance" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Offer Stats */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />{t("reports.offerAnalytics")}
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: t("reports.totalOffers"), value: offerStats.total, color: "text-foreground" },
                    { label: t("reports.acceptedOffers"), value: offerStats.accepted, color: "text-success" },
                    { label: t("reports.rejectedOffers"), value: offerStats.rejected, color: "text-destructive" },
                    { label: t("reports.pendingOffers"), value: offerStats.pending, color: "text-warning" },
                  ].map((s, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {offerStats.total > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: t("reports.acceptedOffers"), value: offerStats.accepted, color: "hsl(152, 56%, 40%)" },
                          { name: t("reports.rejectedOffers"), value: offerStats.rejected, color: "hsl(0, 72%, 51%)" },
                          { name: t("reports.pendingOffers"), value: offerStats.pending, color: "hsl(36, 90%, 48%)" },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}
                      >
                        {[
                          { color: "hsl(152, 56%, 40%)" },
                          { color: "hsl(0, 72%, 51%)" },
                          { color: "hsl(36, 90%, 48%)" },
                        ].filter((_, i) => [offerStats.accepted, offerStats.rejected, offerStats.pending][i] > 0)
                          .map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                )}
              </div>

              {/* Avg Time Per Stage */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Timer className="w-4 h-4 text-primary" />{t("reports.avgTimePerStage")}
                </h3>
                {stageTimeData.some(s => s.count > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stageTimeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} unit={` ${t("reports.day")}`} />
                        <YAxis dataKey="displayStage" type="category" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} width={90} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} formatter={(value: number) => [`${value} ${t("reports.day")}`, '']} />
                        <Bar dataKey="avgDays" name={t("reports.avgDays")} fill="hsl(222,65%,46%)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {stageTimeData.filter(s => s.count > 0).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs px-1">
                          <span className="text-muted-foreground">{s.displayStage}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">({s.count} {t("reports.candidateCount")})</span>
                            <span className="font-bold text-foreground">{s.avgDays} {t("reports.day")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Pipeline Funnel */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-5 text-foreground">
                <Target className="w-4 h-4 text-primary" />{t("reports.hiringFunnel")}
              </h3>
              <div className="space-y-3">
                {funnelData.map((stage, i) => {
                  const maxCount = funnelData[0]?.count || 1;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 sm:gap-4">
                      <span className="text-xs sm:text-sm w-24 sm:w-28 text-muted-foreground shrink-0 font-medium">{stage.displayStage}</span>
                      <div className="flex-1 h-9 bg-muted/50 dark:bg-muted/20 rounded-lg overflow-hidden relative border border-border/30">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / maxCount) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="h-full rounded-lg bg-gradient-to-r from-primary to-accent/80 dark:from-primary/70 dark:to-accent/60"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                          {stage.count} ({stage.rate})
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Time-to-Hire Tab */}
          <TabsContent value="time" className="mt-4">
            <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/30">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <CalendarClock className="w-4 h-4 text-primary" />{t("reports.timeToHireByJob")}
                </h3>
              </div>
              {timeToHirePerJob.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/30">
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.jobTitle")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.department")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.candidatesCount")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.hiredCount")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.avgDays")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeToHirePerJob.map((j, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors list-hover-highlight">
                          <td className="py-3.5 px-5 font-medium text-foreground">{j.title}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{j.department}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{j.candidates}</td>
                          <td className="py-3.5 px-5">
                            <span className="bg-success/10 text-success px-2 py-0.5 rounded-md text-xs font-semibold">{j.hired}</span>
                          </td>
                          <td className="py-3.5 px-5">
                            {j.avgDays != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((j.avgDays / 60) * 100, 100)}%` }} />
                                </div>
                                <span className="font-bold text-xs">{j.avgDays} {t("reports.day")}</span>
                              </div>
                            ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge variant="outline" className={`text-[10px] ${j.status === "نشطة" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}`}>
                              {j.status}
                            </Badge>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                )}
            </div>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <BarChart3 className="w-4 h-4 text-primary" />{t("reports.sourceDistribution")}
                </h3>
                {sourceData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                          {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {sourceData.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-muted-foreground text-xs">{s.name}</span>
                          <span className={`font-bold text-xs ${dir === "rtl" ? "mr-auto" : "ml-auto"}`}>{s.count} ({s.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
                )}
              </div>

              {/* Source quality */}
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Award className="w-4 h-4 text-primary" />{t("reports.sourcePerformance")}
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const srcQuality: Record<string, { total: number; hired: number }> = {};
                    allCandidates.forEach(c => {
                      const src = c.source || (locale === "en" ? "Other" : "أخرى");
                      if (!srcQuality[src]) srcQuality[src] = { total: 0, hired: 0 };
                      srcQuality[src].total++;
                      if (c.status === "مقبول") srcQuality[src].hired++;
                    });
                    return Object.entries(srcQuality).map(([name, data], i) => {
                      const rate = data.total > 0 ? Math.round((data.hired / data.total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs w-20 text-muted-foreground shrink-0">{name}</span>
                          <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                            <div className="h-full rounded-md bg-green-500/70" style={{ width: `${rate}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{rate}% ({data.hired}/{data.total})</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <DollarSign className="w-4 h-4 text-primary" />{t("reports.costPerDepartment")}
                </h3>
                {costData.some(d => d.cost > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} formatter={(value: number) => [`${value.toLocaleString()} ${locale === "en" ? "SAR" : "ر.س"}`, '']} />
                      <Bar dataKey="cost" name={t("reports.totalCost")} fill="hsl(36, 90%, 48%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noCostData")}</div>
                )}
              </div>

              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Briefcase className="w-4 h-4 text-primary" />{t("reports.totalCost")}
                </h3>
                <div className="space-y-3">
                  {costData.filter(d => d.hires > 0).map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.hires} {t("reports.hires")}</p>
                      </div>
                      <div className={dir === "rtl" ? "text-left" : "text-right"}>
                        <p className="text-sm font-bold text-foreground">{d.cost.toLocaleString()} {locale === "en" ? "SAR" : "ر.س"}</p>
                        <p className="text-[10px] text-muted-foreground">{d.costPerHire.toLocaleString()} {locale === "en" ? "SAR" : "ر.س"}/{locale === "en" ? "hire" : "توظيف"}</p>
                      </div>
                    </div>
                  ))}
                  {costData.filter(d => d.hires > 0).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">{t("reports.noCostData")}</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-4">
            <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/30">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-primary" />{t("reports.departmentStats")}
                </h3>
              </div>
              {departmentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/30">
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.departmentName")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.jobs")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.candidates")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.hiredCount")}</th>
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{t("reports.conversionRate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentData.map((dept, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors list-hover-highlight">
                          <td className="py-3.5 px-5 font-medium text-foreground">{dept.name}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{dept.jobs}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{dept.candidates}</td>
                          <td className="py-3.5 px-5">
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-xs font-semibold">{dept.hired}</span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${dept.candidates > 0 ? (dept.hired / dept.candidates) * 100 : 0}%` }} />
                              </div>
                              <span className="font-semibold text-xs text-foreground">
                                {dept.candidates > 0 ? ((dept.hired / dept.candidates) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">{t("common.noData")}</div>
                )}
            </div>
          </TabsContent>

          {/* Interviewers Performance Tab */}
          <TabsContent value="interviewers" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <UserCheck className="w-4 h-4 text-primary" />{locale === "en" ? "Interviewer Stats" : "إحصائيات المحاورين"}
                </h3>
                {interviewerPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={interviewerPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                      <Bar dataKey="completed" name={locale === "en" ? "Completed" : "مكتملة"} fill="hsl(152,56%,40%)" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="total" name={locale === "en" ? "Total" : "الإجمالي"} fill="hsl(222,65%,46%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                  )}
              </div>
              <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/30">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Award className="w-4 h-4 text-primary" />{locale === "en" ? "Performance Details" : "تفاصيل الأداء"}
                  </h3>
                </div>
                <div className="divide-y divide-border/30">
                  {interviewerPerformance.map((ip, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{ip.name}</p>
                        <p className="text-xs text-muted-foreground">{ip.completed}/{ip.total} {locale === "en" ? "completed" : "مكتملة"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{locale === "en" ? "Completion" : "إتمام"}</p>
                          <Badge variant={ip.completionRate >= 80 ? "default" : "secondary"}
                            className={ip.completionRate >= 80 ? "bg-success/10 text-success border-success/20 animate-pulse-ring" : ""}>
                            {ip.completionRate}%
                          </Badge>
                        </div>
                        {ip.avgRating > 0 && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">{locale === "en" ? "Avg Rating" : "التقييم"}</p>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              ★ {ip.avgRating}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {interviewerPerformance.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Source Detailed Analysis Tab */}
          <TabsContent value="sourceDetail" className="mt-4">
            <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/30">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Zap className="w-4 h-4 text-primary" />{locale === "en" ? "Recruitment Source Analysis" : "تحليل مصادر التوظيف"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{locale === "en" ? "Compare candidate sources by volume, quality, and hiring speed" : "قارن مصادر المرشحين من حيث الحجم والجودة وسرعة التوظيف"}</p>
              </div>
              {sourceQualityDetailed.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/30">
                        <th className={`${dir === "rtl" ? "text-right" : "text-left"} py-3 px-5 text-muted-foreground font-medium text-xs`}>{locale === "en" ? "Source" : "المصدر"}</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">{locale === "en" ? "Total" : "الإجمالي"}</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">{locale === "en" ? "Hired" : "تم توظيفهم"}</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">{locale === "en" ? "Conversion" : "معدل التحويل"}</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">{locale === "en" ? "Avg AI Score" : "متوسط AI"}</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">{locale === "en" ? "Avg Days to Hire" : "متوسط أيام التوظيف"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceQualityDetailed.map((s, i) => (
                        <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors list-hover-highlight">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[s.name] || "hsl(220,14%,65%)" }} />
                              <span className="font-medium text-foreground">{s.name}</span>
                            </div>
                          </td>
                          <td className="text-center py-3.5 px-4 text-foreground font-bold">{s.total}</td>
                          <td className="text-center py-3.5 px-4">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">{s.hired}</Badge>
                          </td>
                          <td className="text-center py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${s.conversionRate}%` }} />
                              </div>
                              <span className="text-xs font-bold">{s.conversionRate}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3.5 px-4">
                            {s.avgAiScore > 0 ? (
                              <Badge variant="outline" className={cn("text-xs",
                                s.avgAiScore >= 70 ? "bg-success/10 text-success" : s.avgAiScore >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                              )}>{s.avgAiScore}%</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-center py-3.5 px-4">
                            {s.avgDaysToHire != null ? (
                              <span className="text-xs font-bold">{s.avgDaysToHire} {t("reports.day")}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">{t("reports.noDataSufficient")}</div>
                )}
            </div>
          </TabsContent>

          {/* Weekly Activity Tab */}
          <TabsContent value="weekly" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Activity className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Activity by Day of Week" : "النشاط حسب يوم الأسبوع"}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyActivityData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="applications" name={locale === "en" ? "Applications" : "طلبات"} fill="hsl(222,65%,46%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interviews" name={locale === "en" ? "Interviews" : "مقابلات"} fill="hsl(174,62%,40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hires" name={locale === "en" ? "Hires" : "توظيف"} fill="hsl(152,56%,40%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Summary Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Peak Days" : "أيام الذروة"}
                </h3>
                {(() => {
                  const peakApps = [...weeklyActivityData].sort((a, b) => b.applications - a.applications)[0];
                  const peakInterviews = [...weeklyActivityData].sort((a, b) => b.interviews - a.interviews)[0];
                  const peakHires = [...weeklyActivityData].sort((a, b) => b.hires - a.hires)[0];
                  const items = [
                    { label: locale === "en" ? "Most Applications" : "أكثر الطلبات", day: peakApps?.day, count: peakApps?.applications, color: "bg-primary/10 text-primary" },
                    { label: locale === "en" ? "Most Interviews" : "أكثر المقابلات", day: peakInterviews?.day, count: peakInterviews?.interviews, color: "bg-accent/50 text-accent-foreground" },
                    { label: locale === "en" ? "Most Hires" : "أكثر التوظيف", day: peakHires?.day, count: peakHires?.hires, color: "bg-success/10 text-success" },
                  ];
                  return items.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center justify-between hover:translate-y-0 hover:scale-[1.005]">
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold text-foreground mt-1">{item.day || "—"}</p>
                      </div>
                      <Badge className={cn("text-lg px-3 py-1", item.color)}>{item.count || 0}</Badge>
                    </motion.div>
                  ));
                })()}

                {/* Total weekly summary */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {locale === "en" ? "Weekly Distribution" : "التوزيع الأسبوعي"}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {weeklyActivityData.map((d, i) => {
                      const total = d.applications + d.interviews + d.hires;
                      const maxTotal = Math.max(...weeklyActivityData.map(x => x.applications + x.interviews + x.hires), 1);
                      const intensity = Math.round((total / maxTotal) * 100);
                      return (
                        <div key={i} className="text-center">
                          <div
                            className="h-8 rounded-md mb-1 bg-primary transition-all"
                            style={{ opacity: Math.max(intensity / 100, 0.1) }}
                          />
                          <span className="text-[9px] text-muted-foreground">{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Quality Radar Tab */}
          <TabsContent value="quality" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Brain className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Recruitment Quality Radar" : "رادار جودة التوظيف"}
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={qualityRadarData}>
                    <PolarGrid stroke="hsl(var(--border) / 0.7)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(222,10%,60%)" }} />
                    <Radar name={locale === "en" ? "Score" : "النتيجة"} dataKey="value" stroke="hsl(222,65%,46%)" fill="hsl(222,65%,46%)" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} formatter={(value: number) => [`${value}%`, '']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Quality Metrics Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Target className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Quality Breakdown" : "تفاصيل الجودة"}
                </h3>
                {qualityRadarData.map((item, i) => {
                  const colors = ["bg-primary", "bg-success", "bg-warning", "bg-info", "bg-accent"];
                  const bgColors = ["bg-primary/10", "bg-success/10", "bg-warning/10", "bg-info/10", "bg-accent/20"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:translate-y-0 hover:scale-[1.005]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{item.metric}</span>
                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded-md", bgColors[i])}>
                          {item.value}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className={cn("h-full rounded-full", colors[i])}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Hiring KPIs Tab */}
          <TabsContent value="hiringKPI" className="mt-4">
            <HiringKPIReport
              candidates={allCandidates}
              jobs={allJobs}
              interviews={allInterviews}
              offers={allOffers}
              locale={locale}
            />
          </TabsContent>

          {/* Branch Comparison Tab */}
          <TabsContent value="branches" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Branch comparison Chart */}
              <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {locale === "en" ? "Applications & Hires by Branch" : "المرشحون والتعيينات حسب الفرع"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locale === "en" ? "Comparison of applicant flow and actual hires across all branches" : "مقارنة كمية لتدفق المتقدمين والتعيينات الفعلية بين الفروع المختلفة"}
                  </p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchesComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="candidatesCount" name={locale === "en" ? "Candidates" : "المرشحون"} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="hiredCount" name={locale === "en" ? "Hired" : "التعيينات"} fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time to Hire comparison */}
              <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {locale === "en" ? "Average Time to Hire (Days)" : "متوسط أيام التوظيف حسب الفرع"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locale === "en" ? "Speed of filling vacancies across branches (lower is better)" : "سرعة إغلاق الشواغر التوظيفية في الفروع بالأيام (الأقل هو الأفضل)"}
                  </p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchesComparisonData.map(b => ({ ...b, avgDaysToHire: b.avgDaysToHire || 0 }))} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="avgDaysToHire" name={locale === "en" ? "Average Days" : "متوسط الأيام"} fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Branches Summary Table */}
            <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {locale === "en" ? "Detailed Branch Performance Metrics" : "مؤشرات أداء الفروع بالتفصيل"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === "en" ? "Comprehensive metrics comparing job creation, candidates, interviews and success rates" : "إحصائيات متكاملة تقارن بين حجم الإعلانات، المرشحين، المقابلات ونسب النجاح لكل فرع"}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground border-b border-border/50">
                      <th className="p-3 font-semibold text-right">{locale === "en" ? "Branch Name" : "اسم الفرع / الشركة"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Job Posts" : "إعلانات الوظائف"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Total Candidates" : "إجمالي المرشحين"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Interviews" : "المقابلات"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Hired" : "التعيينات"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Conversion Rate" : "نسبة القبول"}</th>
                      <th className="p-3 font-semibold text-center">{locale === "en" ? "Avg Days to Hire" : "متوسط أيام التوظيف"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {branchesComparisonData.map((branch) => (
                      <tr key={branch.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{branch.name}</span>
                            {branch.isBranch ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{locale === "en" ? "Branch" : "فرع"}</Badge>
                            ) : (
                              <Badge variant="default" className="text-[9px] px-1 py-0">{locale === "en" ? "Main" : "الرئيسية"}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center text-muted-foreground">{branch.jobsCount}</td>
                        <td className="p-3 text-center text-muted-foreground">{branch.candidatesCount}</td>
                        <td className="p-3 text-center text-muted-foreground">{branch.interviewsCount}</td>
                        <td className="p-3 text-center text-muted-foreground font-semibold text-foreground">{branch.hiredCount}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {branch.conversionRate}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-muted-foreground font-mono">
                          {branch.avgDaysToHire ? `${branch.avgDaysToHire} يوم` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================================================================== */}
        {/* REPORT REVIEW & PRINT MODAL */}
        {/* ==================================================================== */}
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

