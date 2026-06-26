import { useMemo, useCallback, useState } from "react";
import { useAssessments, useQuestions, mockResponses } from "@/hooks/useQuestionBank";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useJobs } from "@/hooks/useJobs";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, Button as UIButton } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Users, CheckCircle, BookOpen, FileSpreadsheet, FileText, AlertTriangle, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AssessmentAnalytics() {
  const { t, locale, dir } = useI18n();
  const { data: assessments = [] } = useAssessments();
  const { data: questions = [] } = useQuestions();
  const { data: stages = [] } = usePipelineStages();
  const { data: jobs = [] } = useJobs();
  const { user } = useAuth();
  const [alertThreshold, setAlertThreshold] = useState(50);

  const { data: allResponses = [] } = useQuery({
    queryKey: ["all-assessment-responses", assessments.map(a => a.id).join(",")],
    queryFn: async () => {
      const ids = assessments.map(a => a.id);
      if (ids.length === 0) return [];

      const mockIds = ids.filter(id => id.startsWith("mock-"));
      const dbIds = ids.filter(id => !id.startsWith("mock-"));

      let dbData: any[] = [];
      if (dbIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from("assessment_responses")
            .select("*")
            .in("assessment_id", dbIds);
          if (error) throw error;
          if (data) dbData = data;
        } catch (err) {
          console.error("Error fetching assessment responses from supabase:", err);
        }
      }

      const matchedMocks = mockResponses.filter(r => mockIds.includes(r.assessment_id));
      return [...dbData, ...matchedMocks];
    },
    enabled: assessments.length > 0,
  });

  const stats = useMemo(() => {
    const completed = allResponses.filter((r: any) => r.status === "completed");
    const passed = completed.filter((r: any) => {
      const assessment = assessments.find(a => a.id === r.assessment_id);
      return r.percentage >= (assessment?.passing_score || 70);
    });

    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s: number, r: any) => s + Number(r.percentage), 0) / completed.length)
      : 0;

    // Score distribution
    const ranges = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "21-40%", min: 21, max: 40 },
      { range: "41-60%", min: 41, max: 60 },
      { range: "61-80%", min: 61, max: 80 },
      { range: "81-100%", min: 81, max: 100 },
    ];
    const scoreDistribution = ranges.map(r => ({
      range: r.range,
      count: completed.filter((resp: any) => resp.percentage >= r.min && resp.percentage <= r.max).length,
    }));

    // Per assessment stats
    const perAssessment = assessments.map(a => {
      const aResponses = completed.filter((r: any) => r.assessment_id === a.id);
      const aAvg = aResponses.length > 0
        ? Math.round(aResponses.reduce((s: number, r: any) => s + Number(r.percentage), 0) / aResponses.length)
        : 0;
      const aPassed = aResponses.filter((r: any) => r.percentage >= (a.passing_score || 70)).length;
      return {
        name: a.title.length > 20 ? a.title.slice(0, 20) + "..." : a.title,
        fullName: a.title,
        avg: aAvg,
        total: aResponses.length,
        passed: aPassed,
        failed: aResponses.length - aPassed,
        passRate: aResponses.length > 0 ? Math.round((aPassed / aResponses.length) * 100) : 0,
      };
    }).filter(a => a.total > 0);

    // Question type distribution
    const typeMap: Record<string, number> = {};
    questions.forEach(q => {
      const label = locale === "ar"
        ? { multiple_choice: "اختيار متعدد", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ", matching: "مطابقة", ordering: "ترتيب" }[q.question_type] || q.question_type
        : { multiple_choice: "Multiple Choice", open_ended: "Open Ended", code: "Code", true_false: "True/False", matching: "Matching", ordering: "Ordering" }[q.question_type] || q.question_type;
      typeMap[label] = (typeMap[label] || 0) + 1;
    });
    const typeDist = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // Difficulty distribution
    const diffMap: Record<string, number> = {};
    questions.forEach(q => {
      const label = locale === "ar"
        ? { easy: "سهل", medium: "متوسط", hard: "صعب" }[q.difficulty] || q.difficulty
        : q.difficulty;
      diffMap[label] = (diffMap[label] || 0) + 1;
    });
    const diffDist = Object.entries(diffMap).map(([name, value]) => ({ name, value }));

    // Per Job stats
    const jobMap: Record<string, { name: string; total: number; passed: number; avg: number; scores: number[] }> = {};
    assessments.forEach(a => {
      const jobName = a.job_id ? (jobs.find(j => j.id === a.job_id)?.title || t("qbank.analytics.noLinkedJob")) : t("qbank.analytics.noLinkedJob");
      if (!jobMap[jobName]) jobMap[jobName] = { name: jobName, total: 0, passed: 0, avg: 0, scores: [] };
      const aResponses = completed.filter((r: any) => r.assessment_id === a.id);
      aResponses.forEach((r: any) => {
        jobMap[jobName].total++;
        jobMap[jobName].scores.push(Number(r.percentage));
        if (r.percentage >= (a.passing_score || 70)) jobMap[jobName].passed++;
      });
    });
    const byJob = Object.values(jobMap).filter(j => j.total > 0).map(j => ({
      name: j.name.length > 15 ? j.name.slice(0, 15) + "..." : j.name,
      fullName: j.name,
      total: j.total,
      passed: j.passed,
      failed: j.total - j.passed,
      passRate: Math.round((j.passed / j.total) * 100),
      avg: Math.round(j.scores.reduce((a, b) => a + b, 0) / j.scores.length),
    }));

    // Per Stage stats (stages with linked assessments)
    const stageMap: Record<string, { name: string; total: number; passed: number; scores: number[] }> = {};
    stages.forEach((s: any) => {
      if (!s.assessment_id) return;
      const assessment = assessments.find(a => a.id === s.assessment_id);
      if (!assessment) return;
      if (!stageMap[s.name]) stageMap[s.name] = { name: s.name, total: 0, passed: 0, scores: [] };
      const sResponses = completed.filter((r: any) => r.assessment_id === s.assessment_id);
      sResponses.forEach((r: any) => {
        stageMap[s.name].total++;
        stageMap[s.name].scores.push(Number(r.percentage));
        if (r.percentage >= (assessment.passing_score || 70)) stageMap[s.name].passed++;
      });
    });
    const byStage = Object.values(stageMap).filter(s => s.total > 0).map(s => ({
      name: s.name,
      total: s.total,
      passed: s.passed,
      failed: s.total - s.passed,
      passRate: Math.round((s.passed / s.total) * 100),
      avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    }));

    // Candidate comparison across assessments
    const candidateMap: Record<string, Record<string, number>> = {};
    completed.forEach((r: any) => {
      const key = r.candidate_email || r.candidate_name;
      if (!candidateMap[key]) candidateMap[key] = {};
      const assessment = assessments.find(a => a.id === r.assessment_id);
      if (assessment) candidateMap[key][assessment.title] = Number(r.percentage);
    });
    const candidateComparison = Object.entries(candidateMap)
      .filter(([_, scores]) => Object.keys(scores).length >= 2)
      .map(([name, scores]) => ({ name: name.length > 15 ? name.slice(0, 15) + "..." : name, fullName: name, ...scores }));

    // Question-level statistics (p2-q-analytics)
    const questionStats: Record<string, { total: number; correct: number }> = {};
    completed.forEach((r: any) => {
      const answersList = Array.isArray(r.answers) ? r.answers : [];
      answersList.forEach((ans: any) => {
        const qId = ans.question_id;
        if (!qId) return;
        if (!questionStats[qId]) {
          questionStats[qId] = { total: 0, correct: 0 };
        }
        questionStats[qId].total++;
        if (ans.is_correct) {
          questionStats[qId].correct++;
        }
      });
    });

    const questionPerformance = questions.map(q => {
      const qStat = questionStats[q.id] || { total: 0, correct: 0 };
      const successRate = qStat.total > 0 ? Math.round((qStat.correct / qStat.total) * 100) : null;
      return {
        id: q.id,
        text: q.question_text,
        type: q.question_type,
        difficulty: q.difficulty,
        total: qStat.total,
        correct: qStat.correct,
        successRate,
      };
    }).filter(q => q.total > 0);

    const difficultQuestions = [...questionPerformance]
      .filter(q => q.successRate !== null && q.successRate < 50)
      .sort((a, b) => (a.successRate || 0) - (b.successRate || 0));

    const easyQuestions = [...questionPerformance]
      .filter(q => q.successRate !== null && q.successRate >= 80)
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0));

    const comparisonAssessments = [...new Set(
      Object.values(candidateMap).flatMap(scores => Object.keys(scores))
    )].filter(aName => candidateComparison.some(c => (c as any)[aName] !== undefined));

    return {
      totalQuestions: questions.length,
      totalAssessments: assessments.length,
      totalResponses: allResponses.length,
      completedResponses: completed.length,
      passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
      avgScore,
      scoreDistribution,
      perAssessment,
      typeDist,
      diffDist,
      byJob,
      byStage,
      candidateComparison,
      comparisonAssessments,
      questionPerformance,
      difficultQuestions,
      easyQuestions,
    };
  }, [assessments, allResponses, questions, locale, jobs, stages, t]);

  // Low pass rate alerts
  const lowPassRateAlerts = useMemo(() => {
    return stats.perAssessment
      .filter(a => a.total >= 2 && a.passRate < alertThreshold)
      .map(a => ({
        name: a.fullName,
        passRate: a.passRate,
        total: a.total,
      }));
  }, [stats.perAssessment, alertThreshold]);

  // Auto-send notification for low pass rate
  const sendLowPassAlert = useCallback(async (alertName: string, rate: number) => {
    if (!user) return;
    const title = locale === "ar"
      ? `تنبيه: انخفاض معدل النجاح في "${alertName}"`
      : `Alert: Low pass rate in "${alertName}"`;
    const description = locale === "ar"
      ? `معدل النجاح ${rate}% - أقل من الحد المحدد (${alertThreshold}%)`
      : `Pass rate ${rate}% - below threshold (${alertThreshold}%)`;
    await supabase.from("notifications").insert({
      user_id: user.id,
      title,
      description,
      type: "assessment",
    } as any);
    toast({ title: t("qbank.analytics.alertSent") });
  }, [user, alertThreshold, locale, t]);

  const handleExportExcel = useCallback(() => {
    const summaryData = stats.perAssessment.map(a => ({
      [t("qbank.analytics.assessment")]: a.fullName,
      [t("qbank.analytics.totalCandidates")]: a.total,
      [t("qbank.analytics.avgScore")]: `${a.avg}%`,
      [t("qbank.analytics.passRate")]: `${a.passRate}%`,
      [t("qbank.analytics.passed")]: a.passed,
      [t("qbank.analytics.failed")]: a.failed,
    }));

    const responsesData = allResponses.filter((r: any) => r.status === "completed").map((r: any) => {
      const assessment = assessments.find(a => a.id === r.assessment_id);
      return {
        [t("qbank.analytics.assessment")]: assessment?.title || "",
        [locale === "ar" ? "اسم المرشح" : "Candidate"]: r.candidate_name,
        [locale === "ar" ? "البريد" : "Email"]: r.candidate_email,
        [locale === "ar" ? "الدرجة" : "Score"]: `${r.percentage}%`,
        [locale === "ar" ? "الحالة" : "Status"]: r.percentage >= (assessment?.passing_score || 70)
          ? (locale === "ar" ? "ناجح" : "Passed") : (locale === "ar" ? "راسب" : "Failed"),
        [locale === "ar" ? "تاريخ الإكمال" : "Completed"]: r.completed_at ? new Date(r.completed_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US") : "",
      };
    });

    const jobData = stats.byJob.map(j => ({
      [t("qbank.analytics.job")]: j.fullName,
      [t("qbank.analytics.totalCandidates")]: j.total,
      [t("qbank.analytics.avgScore")]: `${j.avg}%`,
      [t("qbank.analytics.passRate")]: `${j.passRate}%`,
    }));

    const stageData = stats.byStage.map(s => ({
      [t("qbank.analytics.stage")]: s.name,
      [t("qbank.analytics.totalCandidates")]: s.total,
      [t("qbank.analytics.avgScore")]: `${s.avg}%`,
      [t("qbank.analytics.passRate")]: `${s.passRate}%`,
    }));

    const wb = XLSX.utils.book_new();
    if (summaryData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), locale === "ar" ? "ملخص الاختبارات" : "Summary");
    if (responsesData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responsesData), locale === "ar" ? "النتائج التفصيلية" : "Results");
    if (jobData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobData), locale === "ar" ? "حسب الوظيفة" : "By Job");
    if (stageData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stageData), locale === "ar" ? "حسب المرحلة" : "By Stage");

    XLSX.writeFile(wb, `assessment-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: locale === "ar" ? "تم تصدير الملف بنجاح" : "File exported successfully" });
  }, [stats, allResponses, assessments, locale, t]);

  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Assessment Analytics Report", pageW / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, 14, y);
    y += 10;

    // Summary stats
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Summary", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = [
      `Total Questions: ${stats.totalQuestions}`,
      `Total Responses: ${stats.completedResponses}`,
      `Average Score: ${stats.avgScore}%`,
      `Pass Rate: ${stats.passRate}%`,
    ];
    summaryLines.forEach(line => { doc.text(line, 14, y); y += 6; });
    y += 5;

    // Per assessment table
    if (stats.perAssessment.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Assessment Results", 14, y);
      y += 8;
      doc.setFontSize(9);
      const headers = ["Assessment", "Candidates", "Avg Score", "Pass Rate", "Passed", "Failed"];
      const colW = [80, 30, 30, 30, 25, 25];
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x, y); x += colW[i]; });
      y += 6;
      doc.setFont("helvetica", "normal");
      stats.perAssessment.forEach(a => {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        x = 14;
        [a.fullName.slice(0, 30), String(a.total), `${a.avg}%`, `${a.passRate}%`, String(a.passed), String(a.failed)]
          .forEach((v, i) => { doc.text(v, x, y); x += colW[i]; });
        y += 5;
      });
      y += 8;
    }

    // By job
    if (stats.byJob.length > 0) {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Pass Rate by Job", 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      stats.byJob.forEach(j => {
        doc.text(`${j.fullName}: ${j.passRate}% (${j.total} candidates, avg ${j.avg}%)`, 14, y);
        y += 5;
      });
    }

    doc.save(`assessment-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: locale === "ar" ? "تم تصدير الملف بنجاح" : "File exported successfully" });
  }, [stats, locale]);

  const statCards = [
    { icon: BookOpen, label: t("qbank.analytics.totalQuestions"), value: stats.totalQuestions, color: "text-blue-500 bg-blue-500/10 border-blue-500/10" },
    { icon: Users, label: t("qbank.analytics.totalResponses"), value: stats.completedResponses, color: "text-purple-500 bg-purple-500/10 border-purple-500/10" },
    { icon: TrendingUp, label: t("qbank.analytics.avgScore"), value: `${stats.avgScore}%`, color: "text-amber-500 bg-amber-500/10 border-amber-500/10" },
    { icon: CheckCircle, label: t("qbank.analytics.passRate"), value: `${stats.passRate}%`, color: "text-green-500 bg-green-500/10 border-green-500/10" },
  ];

  // Custom Glassmorphic Tooltip for Charts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/80 p-3 rounded-xl shadow-xl space-y-1.5 text-xs text-right min-w-[150px]" dir={dir}>
          <p className="font-extrabold text-foreground border-b border-border/50 pb-1 mb-1">{payload[0].payload.name || payload[0].payload.range}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-muted-foreground font-medium">{entry.name}:</span>
              </div>
              <span className="font-black text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (stats.totalQuestions === 0 && stats.totalResponses === 0) {
    return (
      <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm rounded-2xl">
        <CardContent className="py-16 text-center text-muted-foreground text-xs font-bold leading-relaxed">{t("qbank.analytics.noData")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      
      {/* Export Buttons */}
      <div className="flex gap-2 justify-end">
        <UIButton variant="outline" size="sm" onClick={handleExportExcel} className="rounded-xl flex items-center gap-2 text-xs font-bold border-border/80 hover:bg-muted bg-card/60 h-10">
          <FileSpreadsheet className="h-4.5 w-4.5" />
          <span>{t("qbank.analytics.exportExcel")}</span>
        </UIButton>
        <UIButton variant="outline" size="sm" onClick={handleExportPdf} className="rounded-xl flex items-center gap-2 text-xs font-bold border-border/80 hover:bg-muted bg-card/60 h-10">
          <FileText className="h-4.5 w-4.5" />
          <span>{t("qbank.analytics.exportPdf")}</span>
        </UIButton>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl border shrink-0 ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xl font-black text-foreground tracking-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Score Distribution */}
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.scoreDistribution")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                <XAxis dataKey="range" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 11 }} />
                <YAxis tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 11 }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} name={t("qbank.analytics.candidates")} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Question Type Distribution */}
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.questionTypes")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.typeDist} cx="50%" cy="50%" innerRadius={52} outerRadius={88} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {stats.typeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="stroke-card" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass Rate by Job */}
        {stats.byJob.length > 0 && (
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.byJob")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.byJob}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} />
                  <YAxis tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 11 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="passed" stackId="a" fill="hsl(var(--chart-2))" name={t("qbank.analytics.passed")} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--chart-5))" name={t("qbank.analytics.failed")} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pass Rate by Stage */}
        {stats.byStage.length > 0 && (
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.byStage")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.byStage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} />
                  <YAxis tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 11 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="passed" stackId="a" fill="hsl(var(--chart-2))" name={t("qbank.analytics.passed")} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--chart-5))" name={t("qbank.analytics.failed")} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Per Assessment Performance */}
        {stats.perAssessment.length > 0 && (
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.perAssessment")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.perAssessment}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} />
                  <YAxis tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 11 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="passed" stackId="a" fill="hsl(var(--chart-2))" name={t("qbank.analytics.passed")} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--chart-5))" name={t("qbank.analytics.failed")} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Difficulty Distribution */}
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.difficultyDist")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.diffDist} cx="50%" cy="50%" innerRadius={52} outerRadius={88} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  <Cell fill="hsl(142 76% 36%)" className="stroke-card" strokeWidth={2} />
                  <Cell fill="hsl(45 93% 47%)" className="stroke-card" strokeWidth={2} />
                  <Cell fill="hsl(0 84% 60%)" className="stroke-card" strokeWidth={2} />
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Pass Rate Alerts */}
      <Card className="bg-card/30 backdrop-blur-xl border border-amber-500/20 shadow-xl rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500/50" />
        <CardHeader className="bg-amber-500/5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            <span>{t("qbank.analytics.lowPassRateAlerts")}</span>
          </CardTitle>
          <div className="flex items-center gap-3.5 mt-3">
            <span className="text-xs text-muted-foreground font-semibold">{t("qbank.analytics.lowPassRateThreshold")}:</span>
            <Slider value={[alertThreshold]} onValueChange={v => setAlertThreshold(v[0])} max={100} step={5} className="w-40 accent-amber-500" />
            <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 bg-amber-500/5">{alertThreshold}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {lowPassRateAlerts.length === 0 ? (
            <p className="text-xs font-bold text-muted-foreground text-center py-6">{t("qbank.analytics.noAlerts")}</p>
          ) : (
            <div className="space-y-2.5">
              {lowPassRateAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-500/5 rounded-xl p-3.5 border border-amber-500/10">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-foreground/80 leading-relaxed">
                      {t("qbank.analytics.lowPassRateMsg")
                        .replace("{name}", alert.name)
                        .replace("{rate}", String(alert.passRate))
                        .replace("{threshold}", String(alertThreshold))}
                    </span>
                  </div>
                  <UIButton size="sm" variant="outline" className="rounded-xl gap-1.5 shrink-0 text-xs font-bold h-9 bg-card hover:bg-muted border-border/80" onClick={() => sendLowPassAlert(alert.name, alert.passRate)}>
                    <Bell className="h-3.5 w-3.5 text-amber-500" />
                    <span>{t("qbank.analytics.sendAlert")}</span>
                  </UIButton>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Difficulty Analysis (p2-q-analytics) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Most Difficult Questions */}
        <Card className="bg-card/30 backdrop-blur-xl border border-rose-500/20 shadow-xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500/50" />
          <CardHeader className="bg-rose-500/5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
              <span>{locale === "ar" ? "الأسئلة الأكثر صعوبة (معدل النجاح < 50%)" : "Most Difficult Questions (Pass < 50%)"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {stats.difficultQuestions.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground text-center py-6">{locale === "ar" ? "لا توجد أسئلة منخفضة الأداء حالياً." : "No low performance questions currently."}</p>
            ) : (
              <div className="space-y-3">
                {stats.difficultQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex flex-col gap-1.5 bg-rose-500/5 rounded-xl p-3 border border-rose-500/10">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-foreground/80 leading-relaxed text-right flex-1">{q.text}</span>
                      <Badge variant="outline" className="text-[10px] font-bold border-rose-500/30 text-rose-600 bg-rose-500/5 shrink-0">{q.successRate}%</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span>{locale === "ar" ? `مرات الحل: ${q.total}` : `Responses: ${q.total}`}</span>
                      <span>{locale === "ar" ? `النوع: ${locale === "ar" ? { multiple_choice: "اختيار متعدد", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ", matching: "مطابقة", ordering: "ترتيب" }[q.type] || q.type : q.type}` : `Type: ${q.type}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Easiest Questions */}
        <Card className="bg-card/30 backdrop-blur-xl border border-green-500/20 shadow-xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-green-500/50" />
          <CardHeader className="bg-green-500/5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
              <CheckCircle className="h-4.5 w-4.5 text-green-500" />
              <span>{locale === "ar" ? "الأسئلة الأكثر سهولة (معدل النجاح ≥ 80%)" : "Easiest Questions (Pass ≥ 80%)"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {stats.easyQuestions.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground text-center py-6">{locale === "ar" ? "لا توجد أسئلة عالية الأداء حالياً." : "No high performance questions currently."}</p>
            ) : (
              <div className="space-y-3">
                {stats.easyQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex flex-col gap-1.5 bg-green-500/5 rounded-xl p-3 border border-green-500/10">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-foreground/80 leading-relaxed text-right flex-1">{q.text}</span>
                      <Badge variant="outline" className="text-[10px] font-bold border-green-500/30 text-green-600 bg-green-500/5 shrink-0">{q.successRate}%</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span>{locale === "ar" ? `مرات الحل: ${q.total}` : `Responses: ${q.total}`}</span>
                      <span>{locale === "ar" ? `النوع: ${locale === "ar" ? { multiple_choice: "اختيار متعدد", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ", matching: "مطابقة", ordering: "ترتيب" }[q.type] || q.type : q.type}` : `Type: ${q.type}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Candidate Comparison Chart */}
      {stats.candidateComparison.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.candidateComparison")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, stats.candidateComparison.length * 40)}>
              <BarChart data={stats.candidateComparison} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} width={100} />
                <Tooltip
                  content={<CustomChartTooltip />}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                {stats.comparisonAssessments.map((aName, i) => (
                  <Bar key={aName} dataKey={aName} fill={COLORS[i % COLORS.length]} radius={[0, 5, 5, 0]} name={aName.length > 20 ? aName.slice(0, 20) + "..." : aName} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Assessment Summary Table */}
      {stats.perAssessment.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.assessmentSummary")}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-2xl border-t border-border/40">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right" dir={dir}>
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-right p-4 font-bold text-muted-foreground">{t("qbank.analytics.assessment")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.totalCandidates")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.avgScore")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.passRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perAssessment.map((a, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground/80">{a.fullName}</td>
                      <td className="p-4 text-center text-muted-foreground font-bold">{a.total}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${a.avg >= 70 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>{a.avg}%</Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${a.passRate >= 50 ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>{a.passRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Job Table */}
      {stats.byJob.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.byJob")}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-2xl border-t border-border/40">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right" dir={dir}>
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-right p-4 font-bold text-muted-foreground">{t("qbank.analytics.job")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.totalCandidates")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.avgScore")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.passRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byJob.map((j, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground/80">{j.fullName}</td>
                      <td className="p-4 text-center text-muted-foreground font-bold">{j.total}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${j.avg >= 70 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>{j.avg}%</Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${j.passRate >= 50 ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>{j.passRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Stage Table */}
      {stats.byStage.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm hover:border-primary/10 transition-all duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground/90">{t("qbank.analytics.byStage")}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-2xl border-t border-border/40">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right" dir={dir}>
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-right p-4 font-bold text-muted-foreground">{t("qbank.analytics.stage")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.totalCandidates")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.avgScore")}</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">{t("qbank.analytics.passRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byStage.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground/80">{s.name}</td>
                      <td className="p-4 text-center text-muted-foreground font-bold">{s.total}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${s.avg >= 70 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>{s.avg}%</Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`font-bold text-[10px] rounded-lg border ${s.passRate >= 50 ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>{s.passRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
