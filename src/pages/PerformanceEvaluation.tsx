import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Plus, Search, Award, TrendingUp, UserCheck, TrendingDown,
  X, MessageSquare, ShieldCheck, Printer, Check, Info, Sparkles, FileText
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";


interface MemberEvaluation {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  avatar?: string;
  scores: {
    subject: string;
    subjectEn: string;
    self: number;
    manager: number;
    peers: number;
    subordinates: number;
  }[];
  comments: {
    author: string;
    authorEn: string;
    relationship: string;
    relationshipEn: string;
    text: string;
    textEn: string;
  }[];
}

const initialMembers: MemberEvaluation[] = [
  {
    id: "1",
    name: "أحمد الحربي",
    nameEn: "Ahmad Al-Harbi",
    role: "مهندس واجهات أمامية أول",
    roleEn: "Senior Frontend Engineer",
    scores: [
      { subject: "الإنتاجية والإنجاز", subjectEn: "Productivity", self: 9, manager: 8.5, peers: 8, subordinates: 8.5 },
      { subject: "القيادة والمبادرة", subjectEn: "Leadership", self: 7, manager: 8, peers: 7.5, subordinates: 8 },
      { subject: "العمل الجماعي والتعاون", subjectEn: "Teamwork", self: 8.5, manager: 9, peers: 9, subordinates: 8.8 },
      { subject: "المهارة التقنية", subjectEn: "Technical", self: 9.5, manager: 9, peers: 9.2, subordinates: 9 },
      { subject: "مهارات التواصل", subjectEn: "Communication", self: 8, manager: 8.5, peers: 8.2, subordinates: 8.4 },
    ],
    comments: [
      {
        author: "خالد منصور",
        authorEn: "Khaled Mansour",
        relationship: "زميل",
        relationshipEn: "Peer",
        text: "أحمد متعاون جداً ولديه مهارة فنية متميزة في حل مشكلات الأداء بالواجهات.",
        textEn: "Ahmad is very collaborative and has outstanding technical skills in resolving UI performance issues."
      },
      {
        author: "محمد العتيبي",
        authorEn: "Mohammed Al-Otaibi",
        relationship: "مدير",
        relationshipEn: "Manager",
        text: "قيادي رائع في المبادرات التقنية ويسلم المهام بجودة عالية وتفاصيل دقيقة.",
        textEn: "Great leader in technical initiatives, delivers tasks with high quality and precise details."
      }
    ]
  },
  {
    id: "2",
    name: "سارة العتيبي",
    nameEn: "Sarah Al-Otaibi",
    role: "منسقة موارد بشرية",
    roleEn: "HR Coordinator",
    scores: [
      { subject: "الإنتاجية والإنجاز", subjectEn: "Productivity", self: 8, manager: 8, peers: 8.2, subordinates: 8 },
      { subject: "القيادة والمبادرة", subjectEn: "Leadership", self: 8, manager: 7.5, peers: 8, subordinates: 7.8 },
      { subject: "العمل الجماعي والتعاون", subjectEn: "Teamwork", self: 9.5, manager: 9.5, peers: 9.8, subordinates: 9.6 },
      { subject: "المهارة التقنية", subjectEn: "Technical", self: 7.5, manager: 7, peers: 7.5, subordinates: 7.2 },
      { subject: "مهارات التواصل", subjectEn: "Communication", self: 9.5, manager: 9, peers: 9.2, subordinates: 9.5 },
    ],
    comments: [
      {
        author: "ريما السديري",
        authorEn: "Rema Al-Sudairy",
        relationship: "زميلة",
        relationshipEn: "Peer",
        text: "سارة هي روح الفريق، تواصلها ممتاز وتعمل دائماً على حل أي خلافات بروح طيبة.",
        textEn: "Sarah is the soul of the team; her communication is excellent, and she always resolves disputes positively."
      }
    ]
  },
  {
    id: "3",
    name: "خالد منصور",
    nameEn: "Khaled Mansour",
    role: "مطور واجهات خلفية أول",
    roleEn: "Senior Backend Developer",
    scores: [
      { subject: "الإنتاجية والإنجاز", subjectEn: "Productivity", self: 9.5, manager: 9, peers: 8.8, subordinates: 9 },
      { subject: "القيادة والمبادرة", subjectEn: "Leadership", self: 8, manager: 8.5, peers: 8.2, subordinates: 8.5 },
      { subject: "العمل الجماعي والتعاون", subjectEn: "Teamwork", self: 7.5, manager: 8, peers: 7.8, subordinates: 8 },
      { subject: "المهارة التقنية", subjectEn: "Technical", self: 9.8, manager: 9.5, peers: 9.6, subordinates: 9.5 },
      { subject: "مهارات التواصل", subjectEn: "Communication", self: 7, manager: 7.5, peers: 7.2, subordinates: 7.4 },
    ],
    comments: [
      {
        author: "أحمد الحربي",
        authorEn: "Ahmad Al-Harbi",
        relationship: "زميل",
        relationshipEn: "Peer",
        text: "قدرات خالد الهندسية استثنائية، لكن يحتاج لزيادة مشاركة التحديثات مع الفريق بشكل أبكر.",
        textEn: "Khaled's engineering capabilities are exceptional, but he needs to share updates with the team earlier."
      }
    ]
  }
];

export default function PerformanceEvaluation() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMemberId, setSelectedMemberId] = useState<string>("1");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Radar layers & active view toggles
  const [showSelf, setShowSelf] = useState<boolean>(true);
  const [showManager, setShowManager] = useState<boolean>(true);
  const [showPeers, setShowPeers] = useState<boolean>(true);
  const [showSubordinates, setShowSubordinates] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<"radar" | "trend">("radar");

  // New evaluation form state
  const [selectedEvaleeIndex, setSelectedEvaleeIndex] = useState<number>(0);
  const [relationship, setRelationship] = useState<string>("peers");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [reviewerNameEn, setReviewerNameEn] = useState<string>("");
  const [scoresInput, setScoresInput] = useState({
    productivity: 8,
    leadership: 8,
    teamwork: 8,
    technical: 8,
    communication: 8,
  });
  const [commentText, setCommentText] = useState<string>("");

  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
    setAiReport(null);
  }, [selectedMemberId]);

  // Fetch evaluations
  const { data: dbEvals, isLoading } = useQuery({
    queryKey: ["performance-evaluations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("performance_evaluations" as any)
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching evaluations:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Fetch profiles
  const { data: dbProfiles } = useQuery({
    queryKey: ["profiles-for-evaluation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Aggregate evaluations
  const members = useMemo<MemberEvaluation[]>(() => {
    const rawEvals = dbEvals || [];
    if (rawEvals.length === 0) return initialMembers;
    
    const groups: Record<string, typeof rawEvals> = {};
    rawEvals.forEach(e => {
      const key = e.evalee_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    
    return Object.keys(groups).map((name, index) => {
      const evals = groups[name];
      const first = evals[0];
      
      const getAvgScore = (subjEn: string, rel: string, defaultVal = 8) => {
        const match = evals.filter(e => e.relationship === rel);
        if (match.length === 0) return defaultVal;
        
        const field = 
          subjEn === "Productivity" ? "productivity" :
          subjEn === "Leadership" ? "leadership" :
          subjEn === "Teamwork" ? "teamwork" :
          subjEn === "Technical" ? "technical" : "communication";
          
        const sum = match.reduce((a, b) => a + Number(b[field]), 0);
        return parseFloat((sum / match.length).toFixed(1));
      };
      
      const scores = [
        {
          subject: "الإنتاجية والإنجاز",
          subjectEn: "Productivity",
          self: getAvgScore("Productivity", "self", 8),
          manager: getAvgScore("Productivity", "manager", 8.5),
          peers: getAvgScore("Productivity", "peers", 8.2),
          subordinates: getAvgScore("Productivity", "subordinates", 8),
        },
        {
          subject: "القيادة والمبادرة",
          subjectEn: "Leadership",
          self: getAvgScore("Leadership", "self", 7.5),
          manager: getAvgScore("Leadership", "manager", 8),
          peers: getAvgScore("Leadership", "peers", 7.8),
          subordinates: getAvgScore("Leadership", "subordinates", 8),
        },
        {
          subject: "العمل الجماعي والتعاون",
          subjectEn: "Teamwork",
          self: getAvgScore("Teamwork", "self", 8.5),
          manager: getAvgScore("Teamwork", "manager", 9),
          peers: getAvgScore("Teamwork", "peers", 9.2),
          subordinates: getAvgScore("Teamwork", "subordinates", 8.8),
        },
        {
          subject: "المهارة التقنية",
          subjectEn: "Technical",
          self: getAvgScore("Technical", "self", 9),
          manager: getAvgScore("Technical", "manager", 9),
          peers: getAvgScore("Technical", "peers", 9.2),
          subordinates: getAvgScore("Technical", "subordinates", 9),
        },
        {
          subject: "مهارات التواصل",
          subjectEn: "Communication",
          self: getAvgScore("Communication", "self", 8),
          manager: getAvgScore("Communication", "manager", 8.5),
          peers: getAvgScore("Communication", "peers", 8.2),
          subordinates: getAvgScore("Communication", "subordinates", 8.4),
        }
      ];
      
      const comments = evals
        .filter(e => e.comment && e.comment.trim())
        .map(e => ({
          author: e.reviewer_name,
          authorEn: e.reviewer_name_en || e.reviewer_name,
          relationship: e.relationship === "manager" ? "مدير" : e.relationship === "self" ? "ذاتي" : e.relationship === "subordinates" ? "مرؤوس" : "زميل",
          relationshipEn: e.relationship === "manager" ? "Manager" : e.relationship === "self" ? "Self" : e.relationship === "subordinates" ? "Subordinate" : "Peer",
          text: e.comment,
          textEn: e.comment,
        }));
        
      return {
        id: String(index + 1),
        name: first.evalee_name,
        nameEn: first.evalee_name_en || first.evalee_name,
        role: first.evalee_role,
        roleEn: first.evalee_role_en || first.evalee_role,
        scores,
        comments
      };
    });
  }, [dbEvals]);

  // Deduplicated list of selectable employees for the evaluation dropdown
  const selectableEmployees = useMemo(() => {
    const list: Array<{ name: string; nameEn: string; role: string; roleEn: string }> = [];
    const seenNames = new Set<string>();

    // 1. Add profiles
    if (dbProfiles) {
      dbProfiles.forEach(p => {
        const name = p.full_name || "";
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          list.push({
            name: name,
            nameEn: name,
            role: p.job_title || (locale === "ar" ? "عضو فريق" : "Team Member"),
            roleEn: p.job_title || "Team Member",
          });
        }
      });
    }

    // 2. Add fallback from members/initialMembers
    const fallbackList = members.length > 0 ? members : initialMembers;
    fallbackList.forEach(m => {
      if (!seenNames.has(m.name.toLowerCase())) {
        seenNames.add(m.name.toLowerCase());
        list.push({
          name: m.name,
          nameEn: m.nameEn,
          role: m.role,
          roleEn: m.roleEn,
        });
      }
    });

    return list;
  }, [dbProfiles, members, locale]);

  // Synchronize initial selections when database loads
  useEffect(() => {
    if (members.length > 0) {
      if (!members.find(m => m.id === selectedMemberId)) {
        setSelectedMemberId(members[0].id);
      }
    }
  }, [members, selectedMemberId]);

  const activeMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId) || members[0];
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchName = locale === "ar" ? m.name : m.nameEn;
      const matchRole = locale === "ar" ? m.role : m.roleEn;
      return (
        matchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchRole.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [members, searchTerm, locale]);

  // Formatted chart data
  const chartData = useMemo(() => {
    if (!activeMember) return [];
    return activeMember.scores.map(s => ({
      subject: locale === "ar" ? s.subject : s.subjectEn,
      [locale === "ar" ? "التقييم الذاتي" : "Self"]: s.self,
      [locale === "ar" ? "تقييم المدير" : "Manager"]: s.manager,
      [locale === "ar" ? "تقييم الزملاء" : "Peers"]: s.peers,
      [locale === "ar" ? "تقييم المرؤوسين" : "Subordinates"]: s.subordinates,
    }));
  }, [activeMember, locale]);

  // Calculations for KPI summaries
  const gapAnalysis = useMemo(() => {
    if (!activeMember) return [];
    return activeMember.scores.map(s => {
      const gap = s.manager - s.self;
      return {
        subject: locale === "ar" ? s.subject : s.subjectEn,
        self: s.self,
        manager: s.manager,
        gap: parseFloat(gap.toFixed(1)),
      };
    });
  }, [activeMember, locale]);

  // Automated Talent Insights
  const talentInsights = useMemo(() => {
    if (!activeMember) return { strengths: [], growthAreas: [] };
    
    const strengths: Array<{ name: string; nameEn: string; score: number; tip: string; tipEn: string }> = [];
    const growthAreas: Array<{ name: string; nameEn: string; score: number; tip: string; tipEn: string }> = [];
    
    activeMember.scores.forEach(s => {
      const avg = (s.self + s.manager + s.peers + s.subordinates) / 4;
      const managerSelfGap = s.manager - s.self;
      
      const subjectTips: Record<string, { strength: string; strengthEn: string; growth: string; growthEn: string }> = {
        "Productivity": {
          strength: "يحافظ باستمرار على وتيرة عمل عالية ويسلم المخرجات قبل المواعيد المحددة.",
          strengthEn: "Consistently maintains high pace and delivers outputs ahead of deadlines.",
          growth: "يوصى بتحسين إدارة الأولويات والتركيز على التخطيط الاستباقي للمهام.",
          growthEn: "Recommended to improve prioritization and focus on proactive task planning."
        },
        "Leadership": {
          strength: "يظهر مهارات قيادية قوية ومبادرة واضحة في توجيه أعضاء الفريق وحل المشكلات.",
          strengthEn: "Demonstrates strong leadership and initiative in guiding team members and resolving issues.",
          growth: "فرصة لتطوير مهارات التوجيه والتمكين وتفويض المهام بشكل أكثر فعالية.",
          growthEn: "Opportunity to develop coaching, empowerment, and effective task delegation."
        },
        "Teamwork": {
          strength: "عضو متعاون جداً يسهم في نشر الطاقة الإيجابية ويدعم الزملاء بسخاء.",
          strengthEn: "Highly collaborative member contributing positive energy and generous support to peers.",
          growth: "يوصى بتعزيز التنسيق ومشاركة التحديثات الفنية والقرارات مع الفريق بشكل أبكر.",
          growthEn: "Recommended to enhance alignment and share technical updates/decisions earlier."
        },
        "Technical": {
          strength: "يمتلك معرفة تقنية عميقة وقدرة استثنائية على حل المشكلات المعقدة بكفاءة.",
          strengthEn: "Possesses deep technical knowledge and exceptional ability to solve complex problems efficiently.",
          growth: "يوصى بمواكبة أحدث التقنيات ونقل المعرفة والخبرات التقنية لباقي أعضاء الفريق.",
          growthEn: "Recommended to stay updated with new tech and transfer expertise to other team members."
        },
        "Communication": {
          strength: "يتميز بمهارات تواصل واضحة وفعالة مع جميع الأطراف المعنية.",
          strengthEn: "Distinguished by clear and effective communication skills across all stakeholders.",
          growth: "فرصة لتطوير مهارات الاستماع الفعال وتقديم الملاحظات البناءة بلباقة.",
          growthEn: "Opportunity to develop active listening and deliver constructive feedback tactfully."
        }
      };

      const tips = subjectTips[s.subjectEn] || {
        strength: "أداء متميز وجدير بالتقدير في هذا البعد.",
        strengthEn: "Excellent and commendable performance in this dimension.",
        growth: "مساحة للتطوير والتحسين المستمر من خلال التدريب والتوجيه.",
        growthEn: "Area for development and continuous improvement through training."
      };
      
      if (avg >= 8.2) {
        strengths.push({
          name: s.subject,
          nameEn: s.subjectEn,
          score: parseFloat(avg.toFixed(1)),
          tip: tips.strength,
          tipEn: tips.strengthEn
        });
      }
      
      if (avg < 8.0 || managerSelfGap <= -0.5) {
        growthAreas.push({
          name: s.subject,
          nameEn: s.subjectEn,
          score: parseFloat(avg.toFixed(1)),
          tip: tips.growth,
          tipEn: tips.growthEn
        });
      }
    });
    
    // Sort strengths desc, growth areas asc
    strengths.sort((a, b) => b.score - a.score);
    growthAreas.sort((a, b) => a.score - b.score);
    
    return { strengths, growthAreas };
  }, [activeMember]);

  // Performance Trend Data
  const memberTrendData = useMemo(() => {
    if (!activeMember) return [];
    
    let trendPoints: Array<{ date: string; score: number }> = [];
    
    if (dbEvals && dbEvals.length > 0) {
      const memberEvals = dbEvals.filter(
        (e: any) => e.evalee_name.toLowerCase() === activeMember.name.toLowerCase()
      );
      
      const sortedEvals = [...memberEvals].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      
      const dateGroups: Record<string, typeof sortedEvals> = {};
      sortedEvals.forEach(e => {
        const dateStr = new Date(e.created_at || Date.now()).toLocaleDateString(
          locale === "ar" ? "ar-SA" : "en-US",
          { month: "short", day: "numeric" }
        );
        if (!dateGroups[dateStr]) dateGroups[dateStr] = [];
        dateGroups[dateStr].push(e);
      });
      
      trendPoints = Object.keys(dateGroups).map(date => {
        const evalsInGroup = dateGroups[date];
        let totalSum = 0;
        let count = 0;
        evalsInGroup.forEach(e => {
          const scoreSum =
            Number(e.productivity || 0) +
            Number(e.leadership || 0) +
            Number(e.teamwork || 0) +
            Number(e.technical || 0) +
            Number(e.communication || 0);
          totalSum += scoreSum / 5;
          count++;
        });
        
        const avg = count > 0 ? parseFloat((totalSum / count).toFixed(1)) : 0;
        return {
          date,
          score: avg,
        };
      });
    }
    
    if (trendPoints.length < 2) {
      const currentAvg = (() => {
        const allVals = activeMember.scores.flatMap(s => [s.self, s.manager, s.peers, s.subordinates]);
        return parseFloat((allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1));
      })();
      
      const months = locale === "ar" 
        ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"]
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        
      trendPoints = [
        { date: `${months[0]} 25`, score: parseFloat((currentAvg - 1.2).toFixed(1)) },
        { date: `${months[1]} 25`, score: parseFloat((currentAvg - 0.7).toFixed(1)) },
        { date: `${months[2]} 25`, score: parseFloat((currentAvg - 0.2).toFixed(1)) },
        { date: `${locale === "ar" ? "التقييم الحالي" : "Current Eval"}`, score: currentAvg }
      ];
    }
    
    return trendPoints.map(p => ({
      date: p.date,
      [locale === "ar" ? "متوسط الأداء" : "Average Performance"]: p.score,
    }));
  }, [activeMember, dbEvals, locale]);

  // Professional PDF Export Handler
  const handleExportPDF = async () => {
    const element = document.getElementById("performance-report-container");
    if (!element) return;

    toast({
      title: locale === "ar" ? "جاري تحضير ملف PDF..." : "Preparing PDF...",
      description: locale === "ar" ? "الرجاء الانتظار حتى يتم توليد التقرير المطبوع." : "Please wait while generating the printed report.",
    });

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#0b0f19" : "#ffffff",
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

      const filename = `${locale === "ar" ? "تقرير_تقييم" : "Performance_Report"}_${activeMember.nameEn.replace(/\s+/g, "_")}.pdf`;
      pdf.save(filename);

      toast({
        title: locale === "ar" ? "تم تحميل الملف" : "File Downloaded",
        description: locale === "ar" ? "تم تصدير ملف PDF بنجاح." : "The PDF report was exported successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: locale === "ar" ? "خطأ في التصدير" : "Export Error",
        description: locale === "ar" ? "تعذر إنشاء ملف PDF." : "Could not generate PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAiReport = async () => {
    if (!activeMember) return;
    setIsAiLoading(true);
    
    try {
      const getSubjScore = (subjectEn: string) => {
        const s = activeMember.scores.find(x => x.subjectEn === subjectEn);
        return s ? {
          self: s.self,
          manager: s.manager,
          peers: s.peers,
          subordinates: s.subordinates
        } : { self: 0, manager: 0, peers: 0, subordinates: 0 };
      };
      
      const p = getSubjScore("Productivity");
      const l = getSubjScore("Leadership");
      const t = getSubjScore("Teamwork");
      const tech = getSubjScore("Technical");
      const c = getSubjScore("Communication");

      const prompt = `أنت خبير موارد بشرية ومستشار تطوير أداء. قم بتحليل التقييم الشامل (360 درجة) للموظف التالي:
الاسم: ${activeMember.name} (بالفرسية/إنجليزية: ${activeMember.nameEn})
المسمى الوظيفي: ${activeMember.role} (بالفرسية/إنجليزية: ${activeMember.roleEn})

نتائج التقييم (من 10):
- الإنتاجية والإنجاز: التقييم الذاتي (${p.self})، المدير (${p.manager})، الزملاء (${p.peers})، المرؤوسين (${p.subordinates})
- القيادة والمبادرة: التقييم الذاتي (${l.self})، المدير (${l.manager})، الزملاء (${l.peers})، المرؤوسين (${l.subordinates})
- العمل الجماعي والتعاون: التقييم الذاتي (${t.self})، المدير (${t.manager})، الزملاء (${t.peers})، المرؤوسين (${t.subordinates})
- المهارة التقنية: التقييم الذاتي (${tech.self})، المدير (${tech.manager})، الزملاء (${tech.peers})، المرؤوسين (${tech.subordinates})
- مهارات التواصل: التقييم الذاتي (${c.self})، المدير (${c.manager})، الزملاء (${c.peers})، المرؤوسين (${c.subordinates})

ملاحظات وتوصيات المقيمين:
${activeMember.comments.map(comm => `- [${comm.relationship}]: "${comm.text}"`).join('\n')}

المطلوب:
كتابة تقرير أداء تنفيذي احترافي وبطريقة متميزة باللغة العربية، مقسم إلى الأقسام التالية مع إبرازها بشكل جميل:
1. 📝 الخلاصة التنفيذية والأداء العام للموظف.
2. 💪 نقاط القوة الاستثنائية التي تميز الموظف استناداً إلى الأرقام والتعليقات.
3. 🔍 تحليل فجوة الأداء (Gap Analysis) وفرص التطوير (التركيز على الفوارق بين تقييم الموظف لنفسه وتقييم المدير والزملاء).
4. 🚀 خطة عمل مقترحة (Action Plan) تحتوي على 3-4 خطوات عملية يمكن للموظف البدء بها فوراً لتطوير مهاراته والارتقاء بأدائه.

اجعل التقرير غنياً بالتفاصيل، عملياً، ومليئاً بالنصائح المهنية الملهمة.`;

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "system",
              content: "أنت خبير ومستشار موارد بشرية سعودي محترف. قم بصياغة التقرير بشكل منسق مع استخدام تعبيرات مهنية واضحة ومقنعة."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          disable_tools: true,
          stream: false
        }
      });

      if (error) throw error;
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text) throw new Error(locale === "ar" ? "تعذر توليد التقرير" : "Failed to generate report");
      
      setAiReport(text);
      toast({
        title: locale === "ar" ? "تم توليد التقرير بنجاح" : "Report Generated",
        description: locale === "ar" ? "تمت صياغة توصيات الأداء بواسطة الذكاء الاصطناعي." : "AI executive recommendations generated successfully.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: locale === "ar" ? "خطأ في التوليد" : "Generation Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatAiReport = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      // Headers starting with numbers or emojis or markdown
      if (trimmed.startsWith("#") || trimmed.match(/^[1-4]\./) || trimmed.startsWith("📝") || trimmed.startsWith("💪") || trimmed.startsWith("🔍") || trimmed.startsWith("🚀")) {
        return (
          <h4 key={idx} className="text-xs font-black text-foreground mt-4 mb-2 flex items-center gap-2 border-b border-border/30 pb-1.5 text-primary">
            {trimmed.replace(/^#+\s*/, "")}
          </h4>
        );
      }
      
      // Bullet points
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <li key={idx} className="text-[11px] text-muted-foreground leading-relaxed list-disc list-inside mr-4 mb-1.5 font-medium">
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      
      // Standard paragraphs
      return (
        <p key={idx} className="text-[11px] text-muted-foreground leading-relaxed mb-2 font-medium">
          {trimmed}
        </p>
      );
    });
  };

  // Mutations
  const createEvaluationMutation = useMutation({
    mutationFn: async (newEval: {
      evaleeName: string;
      evaleeNameEn: string;
      evaleeRole: string;
      evaleeRoleEn: string;
      reviewerName: string;
      reviewerNameEn: string;
      relationship: string;
      productivity: number;
      leadership: number;
      teamwork: number;
      technical: number;
      communication: number;
      comment: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("performance_evaluations" as any)
        .insert([{
          evalee_name: newEval.evaleeName,
          evalee_name_en: newEval.evaleeNameEn,
          evalee_role: newEval.evaleeRole,
          evalee_role_en: newEval.evaleeRoleEn,
          reviewer_name: newEval.reviewerName,
          reviewer_name_en: newEval.reviewerNameEn,
          relationship: newEval.relationship,
          productivity: newEval.productivity,
          leadership: newEval.leadership,
          teamwork: newEval.teamwork,
          technical: newEval.technical,
          communication: newEval.communication,
          comment: newEval.comment,
          user_id: user.id
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-evaluations", user?.id] });
      toast({
        title: locale === "ar" ? "تم التقييم بنجاح" : "Evaluation Submitted",
        description: locale === "ar" ? "تمت إضافة التقييم وتحديث مؤشرات الأداء." : "The evaluation has been added and KPIs updated.",
      });
      // Reset form
      setReviewerName("");
      setReviewerNameEn("");
      setCommentText("");
      setIsDrawerOpen(false);
    },
    onError: (err) => {
      toast({
        title: locale === "ar" ? "خطأ في الإرسال" : "Submission Error",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  const selectedEvalee = useMemo(() => {
    return selectableEmployees[selectedEvaleeIndex] || selectableEmployees[0];
  }, [selectableEmployees, selectedEvaleeIndex]);

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      toast({
        title: locale === "ar" ? "خطأ في الإدخال" : "Input Error",
        description: locale === "ar" ? "يرجى إدخال اسم المقيِّم." : "Please enter the reviewer name.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedEvalee) return;

    createEvaluationMutation.mutate({
      evaleeName: selectedEvalee.name,
      evaleeNameEn: selectedEvalee.nameEn,
      evaleeRole: selectedEvalee.role,
      evaleeRoleEn: selectedEvalee.roleEn,
      reviewerName: reviewerName,
      reviewerNameEn: reviewerNameEn,
      relationship: relationship,
      productivity: scoresInput.productivity,
      leadership: scoresInput.leadership,
      teamwork: scoresInput.teamwork,
      technical: scoresInput.technical,
      communication: scoresInput.communication,
      comment: commentText
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Custom Recharts Tooltip styled with Glassmorphism
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl space-y-2 text-xs text-right min-w-[170px]" dir={dir}>
          <p className="font-extrabold text-foreground border-b border-border/50 pb-1 mb-1.5">{payload[0].payload.subject}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke }} />
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

  // Custom Trend Tooltip
  const CustomTrendTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl space-y-1 text-xs text-right min-w-[150px]" dir={dir}>
          <p className="text-muted-foreground font-medium">{payload[0].payload.date}</p>
          <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-1.5 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-foreground font-bold">{locale === "ar" ? "معدل الأداء:" : "Avg Score:"}</span>
            </div>
            <span className="font-black text-primary text-sm">{payload[0].value} <span className="text-[10px] text-muted-foreground font-normal">/10</span></span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } }
  };

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 select-none print:p-0 print:bg-white min-h-screen"
        dir={dir}
      >
        
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6 print:hidden relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-sm animate-pulse">
                <Award className="w-6.5 h-6.5" />
              </div>
              <span>{locale === "ar" ? "تقييم الأداء الشامل (360 درجة)" : "360-Degree Performance Evaluation"}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-2xl leading-relaxed">
              {locale === "ar" 
                ? "تحليل متكامل لتقييم الموظفين من قبل المدراء، الزملاء، والتقييم الذاتي في بيئة عمل تفاعلية."
                : "Integrated analysis of employee reviews from managers, peers, and self-evaluation."}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="rounded-xl flex items-center gap-2 font-bold transition-all duration-200 hover:bg-muted bg-card/60 backdrop-blur-sm border border-primary/20 text-primary hover:text-primary hover:bg-primary/5">
              <FileText className="w-4 h-4" />
              <span>{locale === "ar" ? "تصدير PDF" : "Export PDF"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl flex items-center gap-2 font-bold transition-all duration-200 hover:bg-muted bg-card/60 backdrop-blur-sm border-border/80">
              <Printer className="w-4 h-4" />
              <span>{locale === "ar" ? "طباعة التقرير" : "Print Report"}</span>
            </Button>
            <Button size="sm" onClick={() => setIsDrawerOpen(true)} className="rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/95 text-white border-none transition-all duration-200 hover:scale-[1.02]">
              <Plus className="w-4 h-4" />
              <span>{locale === "ar" ? "إضافة تقييم جديد" : "Add Evaluation"}</span>
            </Button>
          </div>
        </motion.div>

        {/* Evaluation Summary Print Only Header */}
        <div className="hidden print:block text-center border-b border-slate-300 pb-6 mb-8 text-slate-900" dir={dir}>
          <h1 className="text-3xl font-extrabold">{locale === "ar" ? "تقرير تقييم الأداء الشامل (360 درجة)" : "360-Degree Performance Evaluation Report"}</h1>
          <p className="text-sm text-slate-500 mt-2">{locale === "ar" ? "تاريخ التقرير: " : "Report Date: "} {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</p>
          {activeMember && (
            <p className="text-base font-bold text-slate-700 mt-3">
              {locale === "ar" ? "الموظف المقيّم: " : "Employee: "} {locale === "ar" ? activeMember.name : activeMember.nameEn} | {locale === "ar" ? activeMember.role : activeMember.roleEn}
            </p>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* Left Panel: Employee Switcher */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-3 bg-gradient-to-b from-muted/30 to-transparent">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                  <User className="w-4 h-4 text-primary" />
                  <span>{locale === "ar" ? "قائمة أعضاء الفريق" : "Team Members"}</span>
                </CardTitle>
                <div className="relative mt-3">
                  <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={locale === "ar" ? "بحث عن موظف..." : "Search employee..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl pr-10 pl-4 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-3 p-2">
                    <div className="h-12 w-full bg-muted/50 rounded-xl animate-pulse" />
                    <div className="h-12 w-full bg-muted/50 rounded-xl animate-pulse" />
                    <div className="h-12 w-full bg-muted/50 rounded-xl animate-pulse" />
                  </div>
                ) : (
                  <>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => {
                        const isActive = m.id === selectedMemberId;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all duration-300 text-right group border ${
                              isActive 
                                ? "bg-primary/10 text-primary border-primary/20 shadow-md shadow-primary/5 font-bold"
                                : "hover:bg-muted/40 border-transparent text-foreground/80 hover:text-foreground"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm transition-all duration-300 ${
                              isActive 
                                ? "bg-primary/20 text-primary scale-105" 
                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            }`}>
                              {(locale === "ar" ? m.name : m.nameEn).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate transition-colors duration-200 group-hover:text-primary">{locale === "ar" ? m.name : m.nameEn}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-1">{locale === "ar" ? m.role : m.roleEn}</p>
                            </div>
                            <div className="flex items-center shrink-0">
                              {isActive && (
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 text-muted-foreground text-xs font-medium">
                        {locale === "ar" ? "لا يوجد موظفون مطابقون لبحثك." : "No employees found matching search."}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Overall Team Performance Stats */}
            <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>{locale === "ar" ? "حالة تغطية التقييم" : "Evaluation Progress"}</span>
                  </span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-2 py-0.5 rounded-lg">100%</Badge>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/20">
                    <div className="bg-gradient-to-r from-primary to-emerald-500 h-full rounded-full w-full" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>{locale === "ar" ? "تم تقييم 3 من أصل 3 موظفين" : "Evaluated 3 out of 3 employees"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Selected Employee Evaluation Details */}
          <div className="lg:col-span-8 space-y-8 print:col-span-12">
            
            {isLoading || !activeMember ? (
              <div className="space-y-6">
                <Card className="border border-border/40 shadow-sm rounded-2xl bg-card animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-14 h-14 rounded-2xl bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="h-[360px] bg-card border border-border/40 animate-pulse p-5">
                    <div className="h-4 w-40 bg-muted rounded mb-6" />
                    <div className="w-48 h-48 rounded-full border-4 border-muted/30 mx-auto flex items-center justify-center" />
                  </Card>
                  <Card className="h-[360px] bg-card border border-border/40 animate-pulse p-5 space-y-4" />
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  id="performance-report-container"
                  key={selectedMemberId}
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-8 p-4 bg-card/25 dark:bg-card/10 rounded-2xl border border-border/10"
                >
                  
                  {/* Active Employee Detail Header */}
                  <motion.div variants={itemVariants}>
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden relative">
                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4.5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-indigo-500/10 to-emerald-500/15 border border-primary/20 flex items-center justify-center font-black text-primary text-xl shadow-md">
                              {(locale === "ar" ? activeMember.name : activeMember.nameEn).charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-xl font-black text-foreground tracking-tight">{locale === "ar" ? activeMember.name : activeMember.nameEn}</h2>
                                <Badge variant="outline" className="text-[10px] py-0.5 px-2.5 font-bold border-border/70 text-muted-foreground bg-muted/40 rounded-lg">
                                  {locale === "ar" ? activeMember.role : activeMember.roleEn}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" />
                                <span>{locale === "ar" ? "رمز الموظف: " : "Employee ID: "} TY-{activeMember.id}092</span>
                              </p>
                            </div>
                          </div>
                          
                          {/* Overall Score Badge */}
                          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-2xl p-3 px-6 text-center sm:self-center shrink-0">
                            <span className="text-[9px] text-muted-foreground block font-black uppercase tracking-wider mb-1">
                              {locale === "ar" ? "المعدل العام" : "Overall Average"}
                            </span>
                            <span className="text-3xl font-black text-primary tracking-tight">
                              {(() => {
                                const allVals = activeMember.scores.flatMap(s => [s.self, s.manager, s.peers, s.subordinates]);
                                const avg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
                                return avg.toFixed(1);
                              })()}
                              <span className="text-xs font-bold text-muted-foreground">/10</span>
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Visualizer: Radar Chart & Metrics Grid */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch print:grid-cols-1">
                    
                    {/* Radar Chart Card */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden flex flex-col justify-between min-h-[380px] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader className="pb-2 bg-gradient-to-b from-muted/20 to-transparent flex flex-row items-center justify-between gap-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span>{activeView === "radar" ? (locale === "ar" ? "مخطط الأداء الشامل" : "Performance Radar Map") : (locale === "ar" ? "منحنى تطور الأداء" : "Performance Trend")}</span>
                        </CardTitle>
                        {/* Switcher tabs */}
                        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/30 shrink-0">
                          <button
                            onClick={() => setActiveView("radar")}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200",
                              activeView === "radar"
                                ? "bg-background text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {locale === "ar" ? "مخطط الرادار" : "Radar"}
                          </button>
                          <button
                            onClick={() => setActiveView("trend")}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200",
                              activeView === "trend"
                                ? "bg-background text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {locale === "ar" ? "المنحنى الزمني" : "Trend"}
                          </button>
                        </div>
                      </CardHeader>

                      {/* Perspective Toggles (only for radar view) */}
                      {activeView === "radar" && (
                        <div className="flex flex-wrap gap-2 px-5 pb-2">
                          <button
                            onClick={() => setShowSelf(!showSelf)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5",
                              showSelf
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "bg-muted/30 border-transparent text-muted-foreground/60 hover:bg-muted/60"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {locale === "ar" ? "الذاتي" : "Self"}
                          </button>
                          <button
                            onClick={() => setShowManager(!showManager)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5",
                              showManager
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "bg-muted/30 border-transparent text-muted-foreground/60 hover:bg-muted/60"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {locale === "ar" ? "المدير" : "Manager"}
                          </button>
                          <button
                            onClick={() => setShowPeers(!showPeers)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5",
                              showPeers
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm"
                                : "bg-muted/30 border-transparent text-muted-foreground/60 hover:bg-muted/60"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {locale === "ar" ? "الزملاء" : "Peers"}
                          </button>
                          <button
                            onClick={() => setShowSubordinates(!showSubordinates)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5",
                              showSubordinates
                                ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-sm"
                                : "bg-muted/30 border-transparent text-muted-foreground/60 hover:bg-muted/60"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            {locale === "ar" ? "المرؤوسين" : "Subordinates"}
                          </button>
                        </div>
                      )}

                      <CardContent className="p-4 flex-1 flex items-center justify-center min-h-[300px]">
                        {activeView === "radar" ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                              <PolarGrid stroke="currentColor" className="text-muted-foreground/25" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: "currentColor", className: "text-muted-foreground/60", fontSize: 9 }} />
                              
                              {showSelf && (
                                <Radar
                                  name={locale === "ar" ? "تقييم ذاتي" : "Self"}
                                  dataKey={locale === "ar" ? "التقييم الذاتي" : "Self"}
                                  stroke="#059669"
                                  fill="#059669"
                                  fillOpacity={0.16}
                                  strokeWidth={2}
                                />
                              )}
                              {showManager && (
                                <Radar
                                  name={locale === "ar" ? "تقييم المدير" : "Manager"}
                                  dataKey={locale === "ar" ? "تقييم المدير" : "Manager"}
                                  stroke="#3b82f6"
                                  fill="#3b82f6"
                                  fillOpacity={0.16}
                                  strokeWidth={2}
                                />
                              )}
                              {showPeers && (
                                <Radar
                                  name={locale === "ar" ? "تقييم الزملاء" : "Peers"}
                                  dataKey={locale === "ar" ? "تقييم الزملاء" : "Peers"}
                                  stroke="#f59e0b"
                                  fill="#f59e0b"
                                  fillOpacity={0.12}
                                  strokeWidth={2}
                                />
                              )}
                              {showSubordinates && (
                                <Radar
                                  name={locale === "ar" ? "تقييم المرؤوسين" : "Subordinates"}
                                  dataKey={locale === "ar" ? "تقييم المرؤوسين" : "Subordinates"}
                                  stroke="#8b5cf6"
                                  fill="#8b5cf6"
                                  fillOpacity={0.12}
                                  strokeWidth={2}
                                />
                              )}
                              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 10 }} />
                              <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={memberTrendData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted-foreground/15" />
                              <XAxis dataKey="date" tick={{ fill: "currentColor", className: "text-muted-foreground font-semibold", fontSize: 9 }} />
                              <YAxis domain={[0, 10]} tick={{ fill: "currentColor", className: "text-muted-foreground/60", fontSize: 9 }} />
                              <Tooltip content={<CustomTrendTooltip />} />
                              <Area
                                type="monotone"
                                dataKey={locale === "ar" ? "متوسط الأداء" : "Average Performance"}
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorScore)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Detailed Dimension Scores Card */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden flex flex-col justify-between print:mt-4 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader className="pb-2 bg-gradient-to-b from-muted/20 to-transparent">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          <span>{locale === "ar" ? "التقييمات التفصيلية للأبعاد" : "Detailed Dimension Scores"}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 flex-1 space-y-4">
                        {activeMember.scores.map((s, idx) => {
                          const avg = ((s.self + s.manager + s.peers + s.subordinates) / 4).toFixed(1);
                          return (
                            <div key={idx} className="space-y-2 transition-all duration-200 hover:bg-muted/20 p-1.5 rounded-lg">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-foreground/80">{locale === "ar" ? s.subject : s.subjectEn}</span>
                                <span className="font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{avg} <span className="text-[9px] text-muted-foreground font-normal">/10</span></span>
                              </div>
                              
                              {/* Custom Glowing Gradient Progress Bar */}
                              <div className="w-full bg-muted/50 dark:bg-muted/30 rounded-full h-2 overflow-hidden border border-border/20">
                                <div 
                                  className="bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out" 
                                  style={{ width: `${parseFloat(avg) * 10}%` }}
                                />
                              </div>

                              <div className="flex gap-2 text-[9px] text-muted-foreground font-semibold flex-wrap">
                                <span className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10">{locale === "ar" ? `ذاتي: ${s.self}` : `Self: ${s.self}`}</span>
                                <span className="bg-blue-500/5 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10">{locale === "ar" ? `مدير: ${s.manager}` : `Mgr: ${s.manager}`}</span>
                                <span className="bg-amber-500/5 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">{locale === "ar" ? `زملاء: ${s.peers}` : `Peers: ${s.peers}`}</span>
                                <span className="bg-purple-500/5 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">{locale === "ar" ? `مرؤوسين: ${s.subordinates}` : `Subordinates: ${s.subordinates}`}</span>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Automated Talent Insights (Strengths & Growth Areas) */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Top Strengths */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative">
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                      <CardHeader className="pb-2 bg-gradient-to-b from-emerald-500/5 to-transparent">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <Award className="w-4.5 h-4.5" />
                          <span>{locale === "ar" ? "أبرز نقاط القوة (الذكاء الاصطناعي)" : "Top Strengths (AI Insight)"}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {talentInsights.strengths.length > 0 ? (
                          talentInsights.strengths.map((str, idx) => (
                            <div key={idx} className="flex gap-3 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                                {str.score}
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-foreground">{locale === "ar" ? str.name : str.nameEn}</h4>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{locale === "ar" ? str.tip : str.tipEn}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-xs font-medium">
                            {locale === "ar" ? "لا توجد نقاط قوة واضحة مسجلة فوق المعدل." : "No clear strengths recorded above average."}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Growth Opportunities */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative">
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                      <CardHeader className="pb-2 bg-gradient-to-b from-amber-500/5 to-transparent">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <TrendingUp className="w-4.5 h-4.5 rotate-180" />
                          <span>{locale === "ar" ? "فرص التطوير والنمو" : "Growth Opportunities"}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {talentInsights.growthAreas.length > 0 ? (
                          talentInsights.growthAreas.map((g, idx) => (
                            <div key={idx} className="flex gap-3 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/10 hover:border-amber-500/30 transition-all duration-200">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                                {g.score}
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-foreground">{locale === "ar" ? g.name : g.nameEn}</h4>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{locale === "ar" ? g.tip : g.tipEn}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-xs font-medium">
                            {locale === "ar" ? "الموظف يؤدي بشكل متوازن في جميع الأبعاد." : "Employee is performing in a balanced manner across all dimensions."}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Gap Analysis and Feedback Section */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start print:grid-cols-1">
                    
                    {/* Gap Analysis Card */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl md:col-span-7 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader className="pb-2 bg-gradient-to-b from-muted/20 to-transparent">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                          <UserCheck className="w-4 h-4 text-primary" />
                          <span>{locale === "ar" ? "تحليل الفجوة (المدير ضد التقييم الذاتي)" : "Gap Analysis (Manager vs Self)"}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {gapAnalysis.map((g, idx) => {
                          const isPositive = g.gap >= 0;
                          return (
                            <div key={idx} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0 last:pb-0 transition-all duration-200 hover:bg-muted/10 p-1 rounded-lg">
                              <span className="text-xs font-bold text-foreground/80">{g.subject}</span>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] text-muted-foreground flex gap-1.5 font-bold">
                                  <span>{locale === "ar" ? `الذاتي: ${g.self}` : `Self: ${g.self}`}</span>
                                  <span className="text-border">/</span>
                                  <span>{locale === "ar" ? `المدير: ${g.manager}` : `Mgr: ${g.manager}`}</span>
                                </div>
                                <Badge className={`text-[10px] font-black py-1 px-2.5 rounded-lg border items-center gap-1.5 flex ${
                                  isPositive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-sm"
                                }`}>
                                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                  <span>{isPositive ? `+${g.gap}` : `${g.gap}`}</span>
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Qualitative Feedback & Comments */}
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl md:col-span-5 h-full flex flex-col print:mt-4 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader className="pb-2 bg-gradient-to-b from-muted/20 to-transparent">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span>{locale === "ar" ? "ملاحظات وتوصيات المقيمين" : "Qualitative Feedback"}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[300px] print:max-h-none print:overflow-visible">
                        {activeMember.comments.length > 0 ? (
                          activeMember.comments.map((c, idx) => (
                            <div key={idx} className="p-3.5 bg-muted/40 dark:bg-muted/20 rounded-xl space-y-2 border border-border/30 relative group transition-all duration-300 hover:border-primary/20">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-extrabold text-foreground/80">{locale === "ar" ? c.author : c.authorEn}</span>
                                <Badge variant="secondary" className="text-[8px] py-0 px-2 font-black uppercase rounded bg-muted border border-border/50">
                                  {locale === "ar" ? c.relationship : c.relationshipEn}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed italic font-medium">
                                " {locale === "ar" ? c.text : c.textEn} "
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                            {locale === "ar" ? "لا توجد تعليقات بعد." : "No comments yet."}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* AI Performance Advisor Recommendations */}
                  <motion.div variants={itemVariants} className="print:mt-6 print:break-inside-avoid">
                    <Card className="glass-card-premium border border-border/40 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative">
                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-violet-500 via-primary to-indigo-500" />
                      <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent flex flex-row items-center justify-between gap-4 flex-wrap">
                        <CardTitle className="text-sm font-black flex items-center gap-2.5 text-primary">
                          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                          <span>
                            {locale === "ar"
                              ? "التقرير التنفيذي والتوصيات الاستشارية الذكية (AI Executive Advisor)"
                              : "AI Executive Performance & Advisor Report"}
                          </span>
                        </CardTitle>
                        <Button
                          onClick={handleGenerateAiReport}
                          disabled={isAiLoading}
                          className="rounded-xl flex items-center gap-2 font-bold shadow-md shadow-primary/10 bg-primary hover:bg-primary/90 text-xs py-2 px-4 h-9 print:hidden"
                        >
                          {isAiLoading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                              <span>{locale === "ar" ? "جاري التوليد..." : "Generating..."}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 shrink-0" />
                              <span>{aiReport ? (locale === "ar" ? "إعادة توليد التقرير" : "Regenerate") : (locale === "ar" ? "توليد التقرير الذكي" : "Generate Report")}</span>
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6">
                        {aiReport ? (
                          <div className="space-y-4 bg-muted/20 dark:bg-muted/10 p-5 rounded-2xl border border-border/30 text-right" dir="rtl">
                            {formatAiReport(aiReport)}
                          </div>
                        ) : (
                          <div className="text-center py-10 space-y-4 print:hidden">
                            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto text-primary border border-primary/10">
                              <Sparkles className="w-7 h-7 animate-pulse text-primary" />
                            </div>
                            <div className="space-y-1.5 max-w-md mx-auto">
                              <h4 className="text-sm font-bold text-foreground">
                                {locale === "ar" ? "حلل نتائج تقييم الأداء بالذكاء الاصطناعي" : "Analyze Performance with AI"}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {locale === "ar"
                                  ? "اضغط على الزر أعلاه ليقوم الذكاء الاصطناعي بتحليل درجات الموظف وملاحظات الزملاء وصياغة خطة عمل وتوصيات مهنية متكاملة."
                                  : "Click the button to generate a comprehensive advisory report containing executive summary, gaps analysis, and actionable growth plan."}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Print Only fallback when not generated yet during export */}
                        {!aiReport && (
                          <div className="hidden print:block text-slate-500 text-xs italic py-4">
                            {locale === "ar" ? "يرجى الضغط على 'توليد التقرير الذكي' في لوحة التحكم للحصول على تقرير الأداء المدعوم بالذكاء الاصطناعي." : "Please generate the AI report in the dashboard to include it in the exported document."}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                </motion.div>
              </AnimatePresence>
            )}

          </div>

        </div>

        {/* Slide-over Drawer for Adding New Evaluation */}
        <AnimatePresence>
          {isDrawerOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
                onClick={() => setIsDrawerOpen(false)}
              />
              <motion.div
                initial={{ x: dir === "rtl" ? "-100%" : "100%" }}
                animate={{ x: 0 }}
                exit={{ x: dir === "rtl" ? "-100%" : "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative w-full max-w-md bg-card/90 backdrop-blur-xl shadow-2xl h-full flex flex-col border-l border-border/40 z-10"
              >
                <div className="p-5 border-b border-border/40 flex items-center justify-between shrink-0 bg-gradient-to-b from-muted/30 to-transparent">
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <span>{locale === "ar" ? "تقديم تقييم أداء جديد" : "Submit Performance Review"}</span>
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)} className="rounded-xl hover:bg-muted/80">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmitEvaluation} className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Select Member */}
                  <div className="space-y-2">
                    <Label htmlFor="evalee" className="text-xs font-bold text-foreground/80">{locale === "ar" ? "عضو الفريق المراد تقييمه *" : "Select Employee to Evaluate *"}</Label>
                    <select
                      id="evalee"
                      value={selectedEvaleeIndex}
                      onChange={(e) => setSelectedEvaleeIndex(Number(e.target.value))}
                      className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary/50 focus:outline-none dark:bg-muted/20"
                    >
                      {selectableEmployees.map((emp, index) => (
                        <option key={index} value={index} className="dark:bg-slate-900">{locale === "ar" ? emp.name : emp.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground/80">{locale === "ar" ? "طبيعة العلاقة الوظيفية *" : "Your Relationship *"}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "manager", label: locale === "ar" ? "مدير مباشر" : "Manager" },
                        { value: "peers", label: locale === "ar" ? "زميل عمل" : "Peer" },
                        { value: "subordinates", label: locale === "ar" ? "مرؤوس" : "Subordinate" },
                        { value: "self", label: locale === "ar" ? "تقييم ذاتي" : "Self" },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRelationship(opt.value)}
                          className={`p-3 border rounded-xl text-xs font-bold text-center transition-all duration-200 ${
                            relationship === opt.value
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/80 hover:bg-muted/40 dark:border-border/60"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reviewer Name */}
                  <div className="space-y-2">
                    <Label htmlFor="reviewer" className="text-xs font-bold text-foreground/80">{locale === "ar" ? "اسم المقيِّم بالكامل *" : "Reviewer Full Name *"}</Label>
                    <Input
                      id="reviewer"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder={locale === "ar" ? "مثال: عبدالمحسن المقرن" : "e.g. Abdulmohsen Al-Muqrin"}
                      className="bg-muted/40 border border-border/80 rounded-xl text-xs font-semibold h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                      required
                    />
                  </div>

                  {/* Reviewer English Name (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="reviewerEn" className="text-xs font-bold text-foreground/80">{locale === "ar" ? "اسم المقيِّم بالإنجليزية (اختياري)" : "Reviewer Name in English (Optional)"}</Label>
                    <Input
                      id="reviewerEn"
                      value={reviewerNameEn}
                      onChange={(e) => setReviewerNameEn(e.target.value)}
                      placeholder="e.g. Abdulmohsen Al-Muqrin"
                      className="bg-muted/40 border border-border/80 rounded-xl text-xs font-semibold h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                    />
                  </div>

                  {/* Sliders for each dimension */}
                  <div className="space-y-5 pt-3 border-t border-border/40">
                    <span className="text-xs font-black text-foreground block tracking-wide uppercase">{locale === "ar" ? "تقييم الأبعاد (من 1 إلى 10)" : "Rate Dimensions (1 to 10)"}</span>
                    
                    {/* Productivity Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground/80">{locale === "ar" ? "الإنتاجية والإنجاز" : "Productivity & Delivery"}</span>
                        <span className="font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{scoresInput.productivity} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoresInput.productivity}
                        onChange={(e) => setScoresInput({ ...scoresInput, productivity: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer transition-all duration-200"
                      />
                    </div>

                    {/* Leadership Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground/80">{locale === "ar" ? "القيادة والمبادرة" : "Leadership & Initiative"}</span>
                        <span className="font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{scoresInput.leadership} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoresInput.leadership}
                        onChange={(e) => setScoresInput({ ...scoresInput, leadership: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer transition-all duration-200"
                      />
                    </div>

                    {/* Teamwork Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground/80">{locale === "ar" ? "العمل الجماعي والتعاون" : "Teamwork & Collaboration"}</span>
                        <span className="font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{scoresInput.teamwork} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoresInput.teamwork}
                        onChange={(e) => setScoresInput({ ...scoresInput, teamwork: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer transition-all duration-200"
                      />
                    </div>

                    {/* Technical Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground/80">{locale === "ar" ? "المهارة التقنية" : "Technical Ability"}</span>
                        <span className="font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{scoresInput.technical} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoresInput.technical}
                        onChange={(e) => setScoresInput({ ...scoresInput, technical: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer transition-all duration-200"
                      />
                    </div>

                    {/* Communication Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground/80">{locale === "ar" ? "مهارات التواصل" : "Communication Skills"}</span>
                        <span className="font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{scoresInput.communication} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoresInput.communication}
                        onChange={(e) => setScoresInput({ ...scoresInput, communication: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <Label htmlFor="comment" className="text-xs font-bold text-foreground/80">{locale === "ar" ? "ملاحظات تعليقات عامة" : "General Comments"}</Label>
                    <textarea
                      id="comment"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3.5}
                      placeholder={locale === "ar" ? "اكتب أي ملاحظات أو توصيات تفصيلية هنا..." : "Write any detailed notes or recommendations here..."}
                      className="w-full bg-muted/40 border border-border/80 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary/50 focus:outline-none dark:bg-muted/20"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 shrink-0">
                    <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/95 text-white font-bold h-12 text-xs shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.01]">
                      {locale === "ar" ? "حفظ وإضافة التقييم" : "Save and Submit Review"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </DashboardLayout>
  );
}
