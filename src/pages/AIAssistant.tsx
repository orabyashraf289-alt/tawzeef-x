import DashboardLayout from "@/components/DashboardLayout";
import { Bot, Send, Sparkles, Briefcase, CheckCircle, ArrowRightLeft, CalendarCheck, Video, XCircle, Check, Pencil, Trash2, ExternalLink, Paperclip, BarChart3, FileText, Gift, Plus, MessageSquare, Clock, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAddJob } from "@/hooks/useJobs";
import QRCodeDialog from "@/components/QRCodeDialog";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/getPublicUrl";
import { getApplyUrl } from "@/lib/getPublicUrl";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import VoiceInputButton from "@/components/ai-assistant/VoiceInputButton";
import ProactiveInsightsCard, { type ProactiveInsights } from "@/components/ai-assistant/ProactiveInsightsCard";
import EmailSentCard from "@/components/ai-assistant/EmailSentCard";
import BulkMovedCard from "@/components/ai-assistant/BulkMovedCard";
import SmartSuggestions from "@/components/ai-assistant/SmartSuggestions";
import FileAttachment, { type AttachedFile } from "@/components/ai-assistant/FileAttachment";
import MessageActions from "@/components/ai-assistant/MessageActions";
import QuickActions from "@/components/ai-assistant/QuickActions";
import ExportConversation from "@/components/ai-assistant/ExportConversation";
import SlashCommandMenu, { type SlashCommand } from "@/components/ai-assistant/SlashCommandMenu";
import ModelSelector, { getStoredModelChoice, MODEL_OPTIONS, type ModelChoice } from "@/components/ai-assistant/ModelSelector";
import ModelCompareDialog from "@/components/ai-assistant/ModelCompareDialog";
import { GitCompare, Star, Mail, User, Printer, ChevronDown, ChevronUp, MessageSquare, Send, Check, Copy, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import SpeakButton from "@/components/ai-assistant/SpeakButton";
import { extractTextFromPDF, extractTextFromDocx } from "@/lib/fileParser";

const messageAnimation = {
  hidden: (role: "user" | "assistant") => ({
    opacity: 0,
    x: role === "user" ? 30 : -30,
    y: 10,
  }),
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};

interface JobData {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string | null;
  requirements?: string[] | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

interface OfferData {
  id: string;
  candidate_name: string;
  position: string;
  salary: number;
  currency: string;
  token: string;
}

interface ComparisonCandidate {
  id: string;
  name: string;
  role: string;
  rating: number;
  matchScore: number;
  experience: string;
  skills: string[];
  education: string;
  summary: string;
  matchAnalysis: string;
}

interface CandidateComparisonData {
  jobTitle?: string;
  candidates: ComparisonCandidate[];
}

interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  expectedAnswer: string;
  score: number;
}

interface InterviewGuideData {
  candidateName: string;
  jobTitle: string;
  experience?: string;
  questions: InterviewQuestion[];
}

interface WhatsappSmsData {
  candidateName: string;
  phone: string;
  message: string;
  messageType: string;
}

interface VoiceBriefingData {
  briefingText: string;
  briefingType: "daily" | "weekly";
  stats: {
    activeJobs: number;
    activeCandidates: number;
    upcomingInterviews: number;
    pendingOffers: number;
  };
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  jobCreated?: { id: string; title: string };
  jobUpdated?: { id: string; title: string };
  jobPreview?: { data: JobData; status: "pending" | "confirmed" | "rejected" };
  candidateMoved?: { name: string; old_stage: string; new_stage: string };
  interviewScheduled?: { id: string; candidate_name: string; date: string; time: string; meeting_url: string; type: string };
  offerCreated?: OfferData;
  statsReport?: { report_type: string; stats: any };
  proactiveInsights?: ProactiveInsights;
  emailSent?: { candidate_name: string; to: string; subject: string; success: boolean };
  bulkMoved?: { moved: any[]; failed: string[]; new_stage: string; moved_count: number; failed_count: number };
  candidateComparison?: CandidateComparisonData;
  interviewGuide?: InterviewGuideData;
  whatsappSms?: WhatsappSmsData;
  voiceBriefing?: VoiceBriefingData;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const suggestions = [
  { text: "أنشئ وظيفة مطور React في الرياض دوام كامل", icon: "🚀", label: "إنشاء وظيفة" },
  { text: "انقل أحمد إلى مرحلة المقابلة التقنية", icon: "🔄", label: "نقل مرشح" },
  { text: "جدول مقابلة لمحمد يوم الأحد الساعة 10", icon: "📅", label: "جدولة مقابلة" },
  { text: "أنشئ عرض وظيفي لأحمد براتب 15000", icon: "💼", label: "عرض وظيفي" },
  { text: "اعرض إحصائيات التوظيف", icon: "📊", label: "إحصائيات" },
  { text: "حلل هذه السيرة الذاتية", icon: "📄", label: "تحليل سيرة" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const WELCOME_MSG: Message = {
  role: "assistant",
  content: `مرحباً! أنا مساعدك الذكي للتوظيف 🤖\n\nيمكنني مساعدتك في:\n\n• 🚀 **إنشاء وظائف** مع رمز QR للمشاركة\n• ✏️ **تعديل الوظائف** الحالية\n• 🔄 **نقل المرشحين** بين المراحل\n• 📅 **جدولة المقابلات** مع رابط فيديو\n• 💼 **إنشاء العروض الوظيفية**\n• 📊 **عرض الإحصائيات** والتقارير\n• 📄 **تحليل السير الذاتية**\n\nجرّب أحد الاقتراحات أدناه أو اكتب ما تريد!`,
};

const CandidateComparisonCard = ({ 
  comparison,
  onActionClick
}: { 
  comparison: CandidateComparisonData;
  onActionClick: (text: string) => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-bold text-sm text-foreground">
            مقارنة المرشحين الذكية {comparison.jobTitle && `لـ: ${comparison.jobTitle}`}
          </h3>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
          تحليل الذكاء الاصطناعي
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparison.candidates.map((c) => (
          <div 
            key={c.id} 
            className="p-4 rounded-xl border border-border/50 bg-card/65 hover:bg-card hover:border-primary/30 transition-all duration-300 flex flex-col justify-between shadow-sm relative overflow-hidden group"
          >
            {/* Top match score badge */}
            <div className="absolute top-3 left-3 bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{c.matchScore}% توافق</span>
            </div>

            <div className="space-y-3">
              {/* Profile header */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{c.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{c.role}</p>
                </div>
              </div>

              {/* Star Rating & Experience */}
              <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground border-y border-border/20 py-2">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 flex">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        className={cn("w-3 h-3", idx < c.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30")} 
                      />
                    ))}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-foreground/80">الخبرة:</span>
                  <span className="font-bold text-foreground">{c.experience}</span>
                </div>
              </div>

              {/* Match Score Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                  <span>نسبة مطابقة المتطلبات</span>
                  <span className="text-primary">{c.matchScore}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${c.matchScore}%` }}
                  />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground block">المهارات الرئيسية:</span>
                <div className="flex flex-wrap gap-1">
                  {c.skills && c.skills.length > 0 ? (
                    c.skills.slice(0, 4).map((skill, sIdx) => (
                      <span key={sIdx} className="text-[9px] bg-muted/65 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-muted-foreground italic">لا توجد مهارات مسجلة</span>
                  )}
                  {c.skills && c.skills.length > 4 && (
                    <span className="text-[9px] text-muted-foreground/60 font-semibold px-1 py-0.5">
                      +{c.skills.length - 4} أخرى
                    </span>
                  )}
                </div>
              </div>

              {/* Match Analysis */}
              <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg leading-relaxed border border-border/20">
                {c.matchAnalysis}
              </p>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex gap-2 border-t border-border/30 pt-3 mt-3 w-full">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7 gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-bold"
                onClick={() => onActionClick(`جدول مقابلة مع ${c.name} لوظيفة ${comparison.jobTitle || c.role}`)}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                جدولة مقابلة
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7 gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-bold"
                onClick={() => onActionClick(`أرسل بريداً إلكترونياً إلى ${c.name} لإبلاغه بالتوافق المبدئي`)}
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                إرسال بريد
              </Button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const InterviewGuideCard = ({ guide }: { guide: InterviewGuideData }) => {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleScore = (qId: string, val: number) => {
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const scoredCount = Object.keys(scores).length;
  const averageScore = scoredCount > 0 
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / scoredCount).toFixed(1)
    : "0.0";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>دليل مقابلة - ${guide.candidateName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; color: #333; }
            h1 { text-align: center; color: #1e4a8a; font-size: 26px; border-bottom: 2px solid #1e4a8a; padding-bottom: 12px; margin-bottom: 30px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .meta-table td { padding: 12px; border: 1px solid #ddd; font-size: 14px; }
            .meta-label { font-weight: bold; background-color: #f8f9fa; width: 20%; }
            .question-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px; page-break-inside: avoid; background-color: #ffffff; }
            .question-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 10px; margin-bottom: 12px; font-size: 13px; font-weight: bold; }
            .category { color: #1e4a8a; font-size: 14px; }
            .difficulty { padding: 3px 8px; border-radius: 6px; background: #edf2f7; color: #4a5568; }
            .expected { background: #f7fafc; padding: 15px; border-right: 4px solid #1e4a8a; border-radius: 6px; font-size: 13px; margin: 15px 0; line-height: 1.6; }
            .score-space { margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; }
            .notes-line { flex-grow: 1; border-bottom: 1px solid #aaa; margin-left: 20px; height: 20px; }
            .score-box { width: 140px; border: 1.5px solid #1e4a8a; border-radius: 6px; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; }
            @media print {
              body { padding: 0; }
              .question-card { border: 1px solid #cbd5e0; }
            }
          </style>
        </head>
        <body>
          <h1>دليل المقابلة الشخصية والتقييم</h1>
          <table class="meta-table">
            <tr>
              <td class="meta-label">اسم المرشح</td>
              <td>${guide.candidateName}</td>
              <td class="meta-label">الوظيفة المستهدفة</td>
              <td>${guide.jobTitle}</td>
            </tr>
            <tr>
              <td class="meta-label">الخبرة المهنية</td>
              <td>${guide.experience || "غير محدد"}</td>
              <td class="meta-label">تاريخ المقابلة</td>
              <td>${new Date().toLocaleDateString('ar-SA')}</td>
            </tr>
          </table>
          
          ${guide.questions.map((q, idx) => `
            <div class="question-card">
              <div class="question-header">
                <span>السؤال ${idx + 1}: <span class="category">(${q.category})</span></span>
                <span class="difficulty">المستوى: ${q.difficulty}</span>
              </div>
              <p style="font-size: 15px; font-weight: bold; margin: 8px 0; color: #2d3748;">${q.question}</p>
              <div class="expected">
                <strong>الإجابة النموذجية المتوقعة:</strong><br/>
                ${q.expectedAnswer}
              </div>
              <div class="score-space">
                <span style="color: #718096; flex-grow: 1;">الملاحظات: __________________________________________________________________</span>
                <div class="score-box">التقييم: ____ / 5</div>
              </div>
            </div>
          `).join("")}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              دليل المقابلة المخصص لـ {guide.candidateName}
            </h3>
            <p className="text-[10px] text-muted-foreground">{guide.jobTitle}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          onClick={handlePrint}
        >
          <Printer className="w-3.5 h-3.5" />
          طباعة الدليل
        </Button>
      </div>

      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground block">التقييم الإجمالي للمقابلة</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary">{averageScore}</span>
            <span className="text-xs text-muted-foreground">/ 5.0</span>
          </div>
        </div>
        <div className="text-left">
          <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
            تم تقييم {scoredCount} من {guide.questions.length} أسئلة
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {guide.questions.map((q, idx) => {
          const isExpanded = expandedId === q.id;
          const score = scores[q.id] || 0;

          return (
            <div 
              key={q.id}
              className="border border-border/50 rounded-xl bg-card/60 hover:bg-card/90 transition-all duration-200 overflow-hidden"
            >
              <div 
                className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-foreground/90 truncate leading-snug">
                      {q.question}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-semibold text-primary/80">
                        {q.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">•</span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                        q.difficulty === "سهل" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                        q.difficulty === "صعب" ? "bg-red-500/10 text-red-700 dark:text-red-400" :
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}>
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {score > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {score}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3 bg-muted/10">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground block">الإجابة النموذجية المتوقعة:</span>
                    <p className="text-[10px] text-foreground/80 bg-muted/40 p-2.5 rounded-lg border border-border/30 leading-relaxed">
                      {q.expectedAnswer}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/20">
                    <span className="text-[10px] font-bold text-muted-foreground">تقييم إجابة المرشح:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
                            score === val 
                              ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20 scale-105" 
                              : "bg-background border-border hover:bg-muted text-muted-foreground"
                          )}
                          onClick={() => handleScore(q.id, val)}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const WhatsappSmsCard = ({ data }: { data: WhatsappSmsData }) => {
  const [messageText, setMessageText] = useState(data.message);
  const [phoneNumber, setPhoneNumber] = useState(data.phone);
  const [copied, setCopied] = useState(false);

  // Clean phone number helper
  const getCleanPhone = (phone: string) => {
    let clean = phone.replace(/[^\d+]/g, ""); // Remove non-digit except +
    if (clean.startsWith("01")) {
      // Egyptian prefix
      clean = "20" + clean.substring(1);
    } else if (clean.startsWith("05")) {
      // Saudi prefix
      clean = "966" + clean.substring(1);
    }
    // Remove leading '+' if present for WhatsApp wa.me link
    if (clean.startsWith("+")) {
      clean = clean.substring(1);
    }
    return clean;
  };

  const cleanPhone = getCleanPhone(phoneNumber);

  const handleWhatsApp = () => {
    const encodedText = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleSMS = () => {
    const encodedText = encodeURIComponent(messageText);
    const url = `sms:${phoneNumber}?body=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary animate-bounce" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              قالب التواصل السريع لـ {data.candidateName}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {data.messageType === "interview" ? "دعوة مقابلة شخصية" :
               data.messageType === "offer" ? "عرض عمل رسمي" :
               data.messageType === "match" ? "توافق سيرة ذاتية" : "رسالة ترحيبية"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground block">رقم الهاتف:</label>
          <input 
            type="text" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="مثال: +9665xxxxxxxx أو +201xxxxxxxxx"
            className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/45 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground block">نص الرسالة:</label>
          <textarea 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/45 leading-relaxed resize-none"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 text-xs h-9 gap-1.5 font-bold border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-600 transition-all"
          onClick={handleWhatsApp}
          disabled={!cleanPhone}
        >
          <Send className="w-3.5 h-3.5 transform -rotate-45" />
          إرسال عبر WhatsApp
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 text-xs h-9 gap-1.5 font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          onClick={handleSMS}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          إرسال رسالة قصيرة SMS
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs h-9 gap-1.5 font-bold hover:bg-muted transition-all"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "تم النسخ" : "نسخ النص"}
        </Button>
      </div>
    </motion.div>
  );
};

const VoiceBriefingCard = ({ data }: { data: VoiceBriefingData }) => {
  const svc = useSpeechService();
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const id = useMemo(
    () => `briefing-${data.briefingText.slice(0, 40).replace(/\s+/g, "-")}`,
    [data.briefingText]
  );

  const isActive = svc.isActive(id);
  const isLoading = isActive && svc.status === "loading";
  const isPlaying = isActive && svc.status === "speaking";

  const wordCount = data.briefingText.split(/\s+/).length;
  const estimatedSeconds = Math.max(5, Math.ceil(wordCount / 2.2)); // Roughly 2.2 words per second

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgressSeconds((prev) => {
        if (prev >= estimatedSeconds) {
          clearInterval(interval);
          return estimatedSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, estimatedSeconds]);

  useEffect(() => {
    if (!isActive) {
      setProgressSeconds(0);
    }
  }, [isActive]);

  const handlePlayPause = () => {
    if (isActive) {
      svc.cancelIfActive(id);
    } else {
      void svc.speak({ id, text: data.briefingText }, { overrideLatest: true });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercentage = (progressSeconds / estimatedSeconds) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              التقرير الصوتي لمدير التوظيف
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {data.briefingType === "weekly" ? "الملخص الصوتي الأسبوعي" : "الملخص الصوتي اليومي"}
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
          تفاعلي ومسموع
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
          <span className="text-sm font-black text-primary">{data.stats.activeJobs}</span>
          <span className="text-[8px] text-muted-foreground block">وظائف نشطة</span>
        </div>
        <div className="bg-blue-500/5 p-2 rounded-xl border border-blue-500/10">
          <span className="text-sm font-black text-blue-600">{data.stats.activeCandidates}</span>
          <span className="text-[8px] text-muted-foreground block">مرشحين نشطين</span>
        </div>
        <div className="bg-purple-500/5 p-2 rounded-xl border border-purple-500/10">
          <span className="text-sm font-black text-purple-600">{data.stats.upcomingInterviews}</span>
          <span className="text-[8px] text-muted-foreground block">مقابلات قادمة</span>
        </div>
        <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
          <span className="text-sm font-black text-emerald-600">{data.stats.pendingOffers}</span>
          <span className="text-[8px] text-muted-foreground block">عروض معلقة</span>
        </div>
      </div>

      <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 space-y-4">
        <div className="flex items-end justify-center gap-1 h-10 w-full max-w-[160px] mx-auto">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary rounded-full"
              animate={isPlaying ? {
                height: [6, Math.random() * 28 + 6, 6],
              } : {
                height: 6
              }}
              transition={isPlaying ? {
                duration: 0.6 + i * 0.05,
                repeat: Infinity,
                ease: "easeInOut"
              } : undefined}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>{formatTime(progressSeconds)}</span>
            <span>{formatTime(estimatedSeconds)}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handlePlayPause}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md",
              isPlaying 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-white transform translate-x-[-1px]" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
        >
          {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showTranscript ? "إخفاء النص المقروء" : "عرض النص المقروء (قراءة ملخص التقرير)"}
        </button>
        {showTranscript && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }}
            className="p-3 bg-muted/30 border border-border/30 rounded-xl text-[10px] text-foreground/80 leading-relaxed"
          >
            {data.briefingText}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default function AIAssistant() {
  const { t } = useI18n();
  const { user } = useAuth();
  const addJobMutation = useAddJob();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState<{ open: boolean; jobId: string; jobTitle: string }>({ open: false, jobId: "", jobTitle: "" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modelChoice, setModelChoice] = useState<ModelChoice>(() => getStoredModelChoice());
  const [compareDialog, setCompareDialog] = useState<{ open: boolean; reply: string; baseMessages: { role: "user" | "assistant"; content: string }[]; modelLabel: string }>({ open: false, reply: "", baseMessages: [], modelLabel: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["chat_conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
  });

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    filteredConversations.forEach(c => {
      const cDate = new Date(c.updated_at);
      if (cDate >= todayStart) {
        today.push(c);
      } else if (cDate >= yesterdayStart) {
        yesterday.push(c);
      } else {
        older.push(c);
      }
    });
    
    return { today, yesterday, older };
  }, [filteredConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load conversation messages
  const loadConversation = async (convId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (error) { toast({ title: "خطأ في تحميل المحادثة", variant: "destructive" }); return; }
    const loaded: Message[] = (data || []).map((m: any) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      ...(m.metadata && typeof m.metadata === "object" ? m.metadata : {}),
    }));
    setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
    setActiveConversationId(convId);
    setSidebarOpen(false);
  };

  // Save messages to conversation
  const saveMessages = async (msgs: Message[], convId?: string | null) => {
    if (!user) return null;
    const userMessages = msgs.filter(m => m.role === "user");
    if (userMessages.length === 0) return convId;

    let conversationId = convId;

    if (!conversationId) {
      const firstUserMsg = userMessages[0]?.content || "محادثة جديدة";
      const title = firstUserMsg.slice(0, 60);
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) { console.error("Failed to create conversation:", error); return null; }
      conversationId = data.id;
      setActiveConversationId(conversationId);
    } else {
      await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }

    // Save the last two messages (user + assistant)
    const lastTwo = msgs.slice(-2);
    const updatedMsgs = [...msgs];
    let changed = false;

    for (const msg of lastTwo) {
      if (msg.id) continue; // Skip if already saved and has an ID

      const { id, jobCreated, jobUpdated, jobPreview, candidateMoved, interviewScheduled, offerCreated, statsReport, proactiveInsights, emailSent, bulkMoved, candidateComparison, interviewGuide, whatsappSms, voiceBriefing, isStreaming, ...rest } = msg;
      const metadata: any = {};
      if (jobCreated) metadata.jobCreated = jobCreated;
      if (jobUpdated) metadata.jobUpdated = jobUpdated;
      if (jobPreview) metadata.jobPreview = jobPreview;
      if (candidateMoved) metadata.candidateMoved = candidateMoved;
      if (interviewScheduled) metadata.interviewScheduled = interviewScheduled;
      if (offerCreated) metadata.offerCreated = offerCreated;
      if (statsReport) metadata.statsReport = statsReport;
      if (proactiveInsights) metadata.proactiveInsights = proactiveInsights;
      if (emailSent) metadata.emailSent = emailSent;
      if (bulkMoved) metadata.bulkMoved = bulkMoved;
      if (candidateComparison) metadata.candidateComparison = candidateComparison;
      if (interviewGuide) metadata.interviewGuide = interviewGuide;
      if (whatsappSms) metadata.whatsappSms = whatsappSms;
      if (voiceBriefing) metadata.voiceBriefing = voiceBriefing;

      const { data, error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        metadata: Object.keys(metadata).length > 0 ? metadata : {},
      }).select("id").single();

      if (!error && data) {
        const originalIdx = msgs.indexOf(msg);
        if (originalIdx !== -1) {
          updatedMsgs[originalIdx] = { ...msg, id: data.id };
          changed = true;
        }
      } else if (error) {
        console.error("Failed to insert message:", error);
      }
    }

    if (changed) {
      setMessages(updatedMsgs);
    }

    refetchConversations();
    return conversationId;
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MSG]);
    setActiveConversationId(null);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه المحادثة؟");
    if (!confirmed) return;
    const { error } = await supabase.from("chat_conversations").delete().eq("id", convId);
    if (error) { toast({ title: "خطأ في حذف المحادثة", variant: "destructive" }); return; }
    if (activeConversationId === convId) handleNewChat();
    refetchConversations();
    toast({ title: "تم حذف المحادثة ✅" });
  };

  const handleClearAllConversations = async () => {
    if (!user) return;
    const confirmed = window.confirm("هل أنت متأكد من حذف جميع المحادثات نهائياً؟ لا يمكن التراجع عن هذه الخطوة.");
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      
      handleNewChat();
      refetchConversations();
      toast({ title: "تم حذف جميع المحادثات بنجاح 🗑️" });
    } catch (e: any) {
      toast({
        title: "خطأ في حذف المحادثات",
        description: e.message || "خطأ غير معروف",
        variant: "destructive"
      });
    }
  };

  const parseSSEStream = useCallback(async (resp: Response, onActions: (actions: any[]) => void) => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === "actions" && parsed.actions) { onActions(parsed.actions); continue; }
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              }
              return [...prev, { role: "assistant", content: assistantSoFar, isStreaming: true }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.isStreaming ? { ...m, isStreaming: false } : m));
    return assistantSoFar;
  }, []);

  const getFileText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".pdf")) {
        return await extractTextFromPDF(file);
      } else if (name.endsWith(".docx")) {
        return await extractTextFromDocx(file);
      } else if (name.endsWith(".doc")) {
        toast({ 
          title: "صيغة غير مدعومة بالكامل", 
          description: "يرجى تحويل ملف .doc إلى .docx أو .pdf لتحليله بشكل أفضل.", 
          variant: "destructive" 
        });
        return await file.text();
      } else {
        return await file.text();
      }
    } catch (err) {
      console.error("Error reading file:", file.name, err);
      throw err;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    if (attachedFiles.length > 0 || resumeFile) {
      toast({ title: "جاري قراءة الملفات المرفقة...", description: "الرجاء الانتظار حتى يستخرج المساعد النصوص تلقائياً." });
    }

    let resumeText = "";
    if (resumeFile) {
      try { 
        resumeText = await getFileText(resumeFile); 
      } catch { 
        toast({ title: "تعذر قراءة ملف السيرة الذاتية", variant: "destructive" }); 
      }
      setResumeFile(null);
    }

    // Read attachments (PDF, DOCX, TXT, etc.)
    const fileSummaries: string[] = [];
    for (const af of attachedFiles) {
      try {
        const fileExt = af.file.name.split(".").pop()?.toLowerCase();
        if (af.type === "resume" || af.file.type.startsWith("text/") || fileExt === "pdf" || fileExt === "docx" || fileExt === "doc") {
          const txt = await getFileText(af.file);
          fileSummaries.push(`--- ملف: ${af.file.name} ---\n${txt.slice(0, 8000)}`);
        } else {
          fileSummaries.push(`📎 ${af.file.name} (${af.type})`);
        }
      } catch {
        fileSummaries.push(`📎 ${af.file.name}`);
      }
    }
    const filesText = fileSummaries.join("\n\n");
    const fileLabels = attachedFiles.map(f => `📎 ${f.file.name}`).join(" ");

    const userContent = input.trim() + (resumeFile ? ` 📎 ${resumeFile.name}` : "") + (fileLabels ? ` ${fileLabels}` : "");
    const userMsg: Message = { role: "user", content: userContent || "تحليل الملفات المرفقة" };
    setInput("");
    setAttachedFiles([]);
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const allMessages = [...messages, userMsg].filter(m => m.role === "user" || m.role === "assistant");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          ...(resumeText ? { resume_text: resumeText } : {}),
          ...(filesText ? { attached_files_text: filesText } : {}),
          ...(modelChoice !== "auto" ? { model_override: modelChoice } : {}),
        }),
      });

      if (resp.status === 429) { toast({ title: "تم تجاوز حد الطلبات، حاول لاحقاً", variant: "destructive" }); setIsLoading(false); return; }
      if (resp.status === 402) { toast({ title: "يرجى إضافة رصيد للاستمرار", variant: "destructive" }); setIsLoading(false); return; }
      if (!resp.ok) {
        let errorMessage = "Failed";
        try {
          const errData = await resp.json();
          if (errData && errData.error) {
            errorMessage = errData.error;
          }
        } catch {
          try {
            const txt = await resp.text();
            if (txt) errorMessage = txt.slice(0, 150);
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const contentType = resp.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream") && resp.body) {
        let pendingActions: any[] = [];
        await parseSSEStream(resp, (actions) => { pendingActions = actions; });

        if (pendingActions.length > 0) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              const msg = { ...updated[lastIdx] };
              for (const action of pendingActions) {
                if (action.type === "job_preview" && action.job_data) msg.jobPreview = { data: action.job_data, status: "pending" };
                if (action.type === "job_created") { msg.jobCreated = action.job; queryClient.invalidateQueries({ queryKey: ["jobs"] }); }
                if (action.type === "job_updated") { msg.jobUpdated = action.job; queryClient.invalidateQueries({ queryKey: ["jobs"] }); }
                if (action.type === "candidate_moved") { msg.candidateMoved = action.candidate; queryClient.invalidateQueries({ queryKey: ["candidates"] }); }
                if (action.type === "interview_scheduled") { msg.interviewScheduled = action.interview; queryClient.invalidateQueries({ queryKey: ["interviews", "candidates"] }); }
                if (action.type === "offer_created") { msg.offerCreated = action.offer; queryClient.invalidateQueries({ queryKey: ["offers", "candidates"] }); }
                if (action.type === "stats_report") { msg.statsReport = { report_type: action.report_type, stats: action.stats }; }
                if (action.type === "proactive_insights" && action.insights) { msg.proactiveInsights = action.insights; }
                if (action.type === "email_sent" && action.email) { msg.emailSent = action.email; }
                if (action.type === "bulk_moved" && action.result) { msg.bulkMoved = action.result; queryClient.invalidateQueries({ queryKey: ["candidates"] }); }
                if (action.type === "candidate_comparison" && action.comparison) { msg.candidateComparison = action.comparison; }
                if (action.type === "interview_guide_generated" && action.guide) { msg.interviewGuide = action.guide; }
                if (action.type === "whatsapp_sms_template" && action.dispatcher) { msg.whatsappSms = action.dispatcher; }
                if (action.type === "voice_briefing_generated" && action.briefing) { msg.voiceBriefing = action.briefing; }
              }
              updated[lastIdx] = msg;
            }
            return updated;
          });
        }
      } else {
        const data = await resp.json();
        if (data.error) { toast({ title: "خطأ", description: data.error, variant: "destructive" }); setIsLoading(false); return; }
        const newMsg: Message = { role: "assistant", content: data.content || "" };
        if (data.type === "job_preview" && data.job_data) newMsg.jobPreview = { data: data.job_data, status: "pending" };
        else if (data.type === "job_created" && data.job) { newMsg.jobCreated = data.job; queryClient.invalidateQueries({ queryKey: ["jobs"] }); }
        else if (data.type === "job_updated" && data.job) { newMsg.jobUpdated = data.job; queryClient.invalidateQueries({ queryKey: ["jobs"] }); }
        else if (data.type === "candidate_moved" && data.candidate) { newMsg.candidateMoved = data.candidate; queryClient.invalidateQueries({ queryKey: ["candidates"] }); }
        else if (data.type === "interview_scheduled" && data.interview) { newMsg.interviewScheduled = data.interview; queryClient.invalidateQueries({ queryKey: ["interviews"] }); }
        else if (data.type === "offer_created" && data.offer) { newMsg.offerCreated = data.offer; queryClient.invalidateQueries({ queryKey: ["offers"] }); }
        else if (data.type === "stats_report") { newMsg.statsReport = { report_type: data.report_type, stats: data.stats }; }
        else if (data.type === "candidate_comparison" && data.comparison) { newMsg.candidateComparison = data.comparison; }
        else if (data.type === "interview_guide_generated" && data.guide) { newMsg.interviewGuide = data.guide; }
        else if (data.type === "whatsapp_sms_template" && data.dispatcher) { newMsg.whatsappSms = data.dispatcher; }
        else if (data.type === "voice_briefing_generated" && data.briefing) { newMsg.voiceBriefing = data.briefing; }
        setMessages(prev => [...prev, newMsg]);
      }

      // Auto-save after response
      setMessages(prev => {
        setTimeout(() => saveMessages(prev, activeConversationId), 500);
        return prev;
      });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed";
      toast({
        title: msg === "Failed" ? "خطأ في الاتصال" : "خطأ في مساعد AI",
        description: msg === "Failed" ? "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى." : msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmJob = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.jobPreview?.data) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" }); return; }
      const jobData = msg.jobPreview.data;
      
      const job = await addJobMutation.mutateAsync({
        title: jobData.title,
        department: jobData.department,
        location: jobData.location,
        type: jobData.type,
        description: jobData.description || undefined,
        requirements: Array.isArray(jobData.requirements) 
          ? jobData.requirements.join("\n") 
          : typeof jobData.requirements === 'string'
            ? jobData.requirements
            : undefined,
        experience: jobData.experience_level || undefined,
        salaryMin: (jobData.salary_min !== null && jobData.salary_min !== undefined) ? String(jobData.salary_min) : undefined,
        salaryMax: (jobData.salary_max !== null && jobData.salary_max !== undefined) ? String(jobData.salary_max) : undefined,
      });

      // Call RPC to increment job posts used
      await supabase.rpc("increment_job_posts_used" as any, { _user_id: session.user.id });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });

      const confirmedPreview = { ...msg.jobPreview, status: "confirmed" as const };
      const createdJob = { id: job.id, title: job.title };

      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, jobPreview: confirmedPreview, jobCreated: createdJob } : m));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      // Update message metadata in DB
      if (msg.id) {
        const metadata: any = {};
        if (msg.jobUpdated) metadata.jobUpdated = msg.jobUpdated;
        if (msg.candidateMoved) metadata.candidateMoved = msg.candidateMoved;
        if (msg.interviewScheduled) metadata.interviewScheduled = msg.interviewScheduled;
        if (msg.offerCreated) metadata.offerCreated = msg.offerCreated;
        if (msg.statsReport) metadata.statsReport = msg.statsReport;
        if (msg.proactiveInsights) metadata.proactiveInsights = msg.proactiveInsights;
        if (msg.emailSent) metadata.emailSent = msg.emailSent;
        if (msg.bulkMoved) metadata.bulkMoved = msg.bulkMoved;
        
        metadata.jobPreview = confirmedPreview;
        metadata.jobCreated = createdJob;

        await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
      }
    } catch (e: any) { 
      toast({ title: "خطأ", description: e.message || "خطأ في الاتصال", variant: "destructive" }); 
    }
  };

  const handleRejectJob = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    const rejectedPreview = msg.jobPreview ? { ...msg.jobPreview, status: "rejected" as const } : undefined;
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, jobPreview: rejectedPreview } : m));
    
    if (msg.id && rejectedPreview) {
      const metadata: any = {};
      if (msg.jobCreated) metadata.jobCreated = msg.jobCreated;
      if (msg.jobUpdated) metadata.jobUpdated = msg.jobUpdated;
      if (msg.candidateMoved) metadata.candidateMoved = msg.candidateMoved;
      if (msg.interviewScheduled) metadata.interviewScheduled = msg.interviewScheduled;
      if (msg.offerCreated) metadata.offerCreated = msg.offerCreated;
      if (msg.statsReport) metadata.statsReport = msg.statsReport;
      if (msg.proactiveInsights) metadata.proactiveInsights = msg.proactiveInsights;
      if (msg.emailSent) metadata.emailSent = msg.emailSent;
      if (msg.bulkMoved) metadata.bulkMoved = msg.bulkMoved;
      
      metadata.jobPreview = rejectedPreview;

      await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
    }
    toast({ title: "تم إلغاء إنشاء الوظيفة" });
  };

  const handleDeleteJob = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.jobCreated?.id) return;
    const confirmed = window.confirm(`هل أنت متأكد من حذف وظيفة "${msg.jobCreated.title}"؟`);
    if (!confirmed) return;
    const { error } = await supabase.from("jobs").delete().eq("id", msg.jobCreated.id);
    if (error) { toast({ title: "فشل حذف الوظيفة", description: error.message, variant: "destructive" }); return; }
    
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, jobCreated: undefined, jobPreview: m.jobPreview ? { ...m.jobPreview, status: "rejected" as const } : undefined } : m));
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    
    if (msg.id) {
      const metadata: any = {};
      if (msg.jobUpdated) metadata.jobUpdated = msg.jobUpdated;
      if (msg.candidateMoved) metadata.candidateMoved = msg.candidateMoved;
      if (msg.interviewScheduled) metadata.interviewScheduled = msg.interviewScheduled;
      if (msg.offerCreated) metadata.offerCreated = msg.offerCreated;
      if (msg.statsReport) metadata.statsReport = msg.statsReport;
      if (msg.proactiveInsights) metadata.proactiveInsights = msg.proactiveInsights;
      if (msg.emailSent) metadata.emailSent = msg.emailSent;
      if (msg.bulkMoved) metadata.bulkMoved = msg.bulkMoved;
      
      metadata.jobPreview = msg.jobPreview ? { ...msg.jobPreview, status: "rejected" as const } : undefined;
      metadata.jobCreated = null;

      await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
    }
    toast({ title: "تم حذف الوظيفة 🗑️" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "حجم الملف كبير جداً (الحد 5MB)", variant: "destructive" }); return; }
      setResumeFile(file);
      if (!input.trim()) setInput("حلل هذه السيرة الذاتية وقارنها بالوظائف المتاحة");
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} ي`;
    return d.toLocaleDateString("ar-SA");
  };

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <style>{`
        .chat-prose p {
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: inherit;
        }
        .chat-prose p:last-child {
          margin-bottom: 0;
        }
        .chat-prose strong {
          font-weight: 800;
          color: hsl(var(--primary));
        }
        .dark .chat-prose strong {
          color: hsl(var(--primary-foreground));
        }
        .chat-prose ul {
          margin-bottom: 0.5rem;
          padding-right: 1.25rem;
          list-style-type: disc;
        }
        .chat-prose li {
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        .chat-prose table {
          width: 100%;
          margin: 0.75rem 0;
          border-collapse: collapse;
          font-size: 11px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid hsl(var(--border) / 0.3);
        }
        .chat-prose th, .chat-prose td {
          border: 1px solid hsl(var(--border) / 0.3);
          padding: 0.5rem 0.75rem;
          text-align: right;
        }
        .chat-prose th {
          background-color: hsl(var(--muted) / 0.6);
          font-weight: 700;
        }
        .chat-prose td {
          background-color: hsl(var(--card) / 0.3);
        }
        .premium-radial-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.04;
          pointer-events: none;
        }
      `}</style>
      <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden relative z-10" dir="rtl">
        {/* Sidebar - Conversations */}
        <div className={cn(
          "absolute lg:relative z-30 h-full w-72 border-l border-border/20 bg-card/45 backdrop-blur-xl transition-transform duration-300 flex flex-col shadow-xl",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border/20 shrink-0 bg-gradient-to-b from-muted/20 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary animate-pulse" />
                المحادثات
              </h2>
              <div className="flex gap-1">
                {conversations.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={handleClearAllConversations} title="مسح كل السجل">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/80 rounded-xl" onClick={handleNewChat} title="محادثة جديدة">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث في المحادثات..."
                className="h-8 text-xs pr-8 bg-muted/40 border border-border/20 rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>لا توجد محادثات سابقة</p>
                  <p className="mt-1">ابدأ محادثة جديدة الآن!</p>
                </div>
              ) : (
                <>
                  {/* Today Group */}
                  {groupedConversations.today.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="px-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">اليوم</h3>
                      {groupedConversations.today.map(conv => (
                        <div key={conv.id} className="relative group">
                          <button
                            onClick={() => loadConversation(conv.id)}
                            className={cn(
                              "w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center gap-2.5 border relative overflow-hidden",
                              activeConversationId === conv.id
                                ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-sm shadow-primary/5"
                                : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/10 text-foreground/80 hover:text-foreground"
                            )}
                          >
                            {activeConversationId === conv.id && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                            )}
                            <div className={cn(
                              "p-1.5 rounded-lg border transition-all duration-300",
                              activeConversationId === conv.id 
                                ? "bg-primary/20 border-primary/30 text-primary" 
                                : "bg-background/40 border-border/10 group-hover:bg-background/80 group-hover:border-border/20 text-muted-foreground group-hover:text-primary"
                            )}>
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-foreground/90 leading-normal">{conv.title}</p>
                              <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(conv.updated_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className={cn(
                              "absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                              "opacity-0 group-hover:opacity-100 focus:opacity-100",
                              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/10"
                            )}
                            title="حذف المحادثة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Yesterday Group */}
                  {groupedConversations.yesterday.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h3 className="px-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">أمس</h3>
                      {groupedConversations.yesterday.map(conv => (
                        <div key={conv.id} className="relative group">
                          <button
                            onClick={() => loadConversation(conv.id)}
                            className={cn(
                              "w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center gap-2.5 border relative overflow-hidden",
                              activeConversationId === conv.id
                                ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-sm shadow-primary/5"
                                : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/10 text-foreground/80 hover:text-foreground"
                            )}
                          >
                            {activeConversationId === conv.id && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                            )}
                            <div className={cn(
                              "p-1.5 rounded-lg border transition-all duration-300",
                              activeConversationId === conv.id 
                                ? "bg-primary/20 border-primary/30 text-primary" 
                                : "bg-background/40 border-border/10 group-hover:bg-background/80 group-hover:border-border/20 text-muted-foreground group-hover:text-primary"
                            )}>
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-foreground/90 leading-normal">{conv.title}</p>
                              <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(conv.updated_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className={cn(
                              "absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                              "opacity-0 group-hover:opacity-100 focus:opacity-100",
                              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/10"
                            )}
                            title="حذف المحادثة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Older Group */}
                  {groupedConversations.older.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h3 className="px-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">السابق</h3>
                      {groupedConversations.older.map(conv => (
                        <div key={conv.id} className="relative group">
                          <button
                            onClick={() => loadConversation(conv.id)}
                            className={cn(
                              "w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center gap-2.5 border relative overflow-hidden",
                              activeConversationId === conv.id
                                ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-sm shadow-primary/5"
                                : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/10 text-foreground/80 hover:text-foreground"
                            )}
                          >
                            {activeConversationId === conv.id && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                            )}
                            <div className={cn(
                              "p-1.5 rounded-lg border transition-all duration-300",
                              activeConversationId === conv.id 
                                ? "bg-primary/20 border-primary/30 text-primary" 
                                : "bg-background/40 border-border/10 group-hover:bg-background/80 group-hover:border-border/20 text-muted-foreground group-hover:text-primary"
                            )}>
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-foreground/90 leading-normal">{conv.title}</p>
                              <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(conv.updated_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className={cn(
                              "absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                              "opacity-0 group-hover:opacity-100 focus:opacity-100",
                              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/10"
                            )}
                            title="حذف المحادثة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/20 bg-card/45 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0 w-9 h-9 rounded-xl hover:bg-muted/80" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <MessageSquare className="w-4.5 h-4.5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/20 relative">
                <Bot className="w-5 h-5 text-primary-foreground" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background live-breathing-indicator" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black text-foreground">مساعد التوظيف الذكي</h1>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap font-medium">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span>الذكاء الاصطناعي التوليدي</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">متصل الآن</span>
                </p>
              </div>
              <ExportConversation messages={messages.map(m => ({ role: m.role, content: m.content }))} />
              <ModelSelector value={modelChoice} onChange={setModelChoice} />
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 gap-1 rounded-xl bg-card/45 border border-border/20 font-bold hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm" 
                onClick={handleNewChat}
              >
                <Plus className="w-3.5 h-3.5" />جديد
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-transparent">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  custom={msg.role}
                  initial="hidden" 
                  animate="show" 
                  variants={messageAnimation}
                  className={cn("flex gap-3", msg.role === "user" ? "justify-start" : "justify-end")}
                >
                  
                  {/* Avatar for user */}
                  {msg.role === "user" && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <span className="text-[10px] font-black text-primary">أنت</span>
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-md transition-all duration-200 relative overflow-hidden",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] border border-[hsl(var(--primary)/0.35)] text-white rounded-tr-sm shadow-primary/10 font-medium"
                      : "glass-card-premium border border-border/25 rounded-tl-sm text-foreground bg-card/30 backdrop-blur-md"
                  )}>
                    {msg.role === "assistant" && (
                      <div className="premium-radial-glow -bottom-10 -left-10 bg-primary/10" />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="space-y-3 relative z-10">
                        <div className="prose prose-sm max-w-none dark:prose-invert chat-prose">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm ml-0.5" />}
                        </div>

                        {!msg.isStreaming && msg.content && msg.content.length > 10 && (
                          <div className="flex justify-end items-center gap-1.5 -mt-1 flex-wrap">
                            <SpeakButton text={msg.content} messageId={`msg-${i}`} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-[10px] text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                              onClick={() => {
                                // Slice base messages: everything up to and INCLUDING the user message that produced this reply
                                const base: { role: "user" | "assistant"; content: string }[] = [];
                                for (let k = 0; k < i; k++) {
                                  base.push({ role: messages[k].role, content: messages[k].content });
                                }
                                const currentLabel =
                                  MODEL_OPTIONS.find((o) => o.value === modelChoice)?.short ?? "تلقائي";
                                setCompareDialog({
                                  open: true,
                                  reply: msg.content,
                                  baseMessages: base,
                                  modelLabel: currentLabel,
                                });
                              }}
                              title="قارن مع موديل آخر"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              قارن
                            </Button>
                            <MessageActions content={msg.content} />
                          </div>
                        )}

                        {msg.proactiveInsights && <ProactiveInsightsCard insights={msg.proactiveInsights} />}
                        {msg.emailSent && <EmailSentCard email={msg.emailSent} />}
                        {msg.bulkMoved && <BulkMovedCard data={msg.bulkMoved} />}

                        {msg.candidateComparison && (
                          <CandidateComparisonCard 
                            comparison={msg.candidateComparison} 
                            onActionClick={(text) => {
                              setInput(text);
                              inputRef.current?.focus();
                            }}
                          />
                        )}

                        {msg.interviewGuide && (
                          <InterviewGuideCard guide={msg.interviewGuide} />
                        )}

                        {msg.whatsappSms && (
                          <WhatsappSmsCard data={msg.whatsappSms} />
                        )}

                        {msg.voiceBriefing && (
                          <VoiceBriefingCard data={msg.voiceBriefing} />
                        )}

                        {/* Job Preview Card */}
                        {msg.jobPreview && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }}
                            className={cn("mt-3 p-4 rounded-xl border space-y-3 glass-card-premium",
                              msg.jobPreview.status === "confirmed" ? "bg-green-500/5 border-green-500/25 text-green-700 dark:text-green-300" :
                              msg.jobPreview.status === "rejected" ? "bg-red-500/5 border-red-500/25 text-red-700 dark:text-red-300 opacity-60" :
                              "bg-amber-500/5 border-amber-500/25 text-amber-700 dark:text-amber-300")}>
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <Briefcase className="w-4 h-4 text-primary animate-pulse" />
                              <span className={msg.jobPreview.status === "confirmed" ? "text-green-800 dark:text-green-300" : msg.jobPreview.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}>
                                {msg.jobPreview.status === "confirmed" ? "✅ تم إنشاء الوظيفة" : msg.jobPreview.status === "rejected" ? "❌ تم إلغاء الوظيفة" : "⏳ هل تريد إضافة هذه الوظيفة؟"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                              <div><span className="text-muted-foreground">المسمى:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.title}</span></div>
                              <div><span className="text-muted-foreground">القسم:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.department}</span></div>
                              <div><span className="text-muted-foreground">الموقع:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.location}</span></div>
                              <div><span className="text-muted-foreground">النوع:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.type}</span></div>
                              {msg.jobPreview.data.salary_min && <div><span className="text-muted-foreground">الراتب:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.salary_min} - {msg.jobPreview.data.salary_max}</span></div>}
                              {msg.jobPreview.data.experience_level && <div><span className="text-muted-foreground">الخبرة:</span> <span className="font-bold text-foreground/90">{msg.jobPreview.data.experience_level}</span></div>}
                            </div>
                            {msg.jobPreview.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 text-xs h-8 gap-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleConfirmJob(i)}>
                                  <Check className="w-3 h-3" />إضافة للنظام
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50 font-bold" onClick={() => handleRejectJob(i)}>
                                  <XCircle className="w-3 h-3" />إلغاء
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Job Created */}
                        {msg.jobCreated && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }}
                            className="mt-3 p-4 rounded-xl bg-card/20 border border-border/20 shadow-md glass-card-premium flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary"><Briefcase className="w-4 h-4" /><span>{msg.jobCreated.title}</span></div>
                            <div className="bg-white p-3 rounded-xl shadow-sm"><QRCodeSVG value={getApplyUrl(msg.jobCreated.id)} size={130} level="H" bgColor="#ffffff" fgColor="#1e4a8a" /></div>
                            <p className="text-[10px] text-muted-foreground text-center font-semibold">امسح الرمز أو شارك الرابط لاستقبال الطلبات</p>
                            <div className="flex gap-2 w-full">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 font-bold" onClick={() => { navigator.clipboard.writeText(getApplyUrl(msg.jobCreated!.id)); toast({ title: "تم نسخ الرابط ✅" }); }}>نسخ الرابط</Button>
                              <Button size="sm" className="flex-1 text-xs h-8 font-bold" onClick={() => setQrDialog({ open: true, jobId: msg.jobCreated!.id, jobTitle: msg.jobCreated!.title })}>تحميل QR</Button>
                            </div>
                            <div className="flex gap-2 w-full border-t border-border/20 pt-3">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1 font-bold" onClick={() => navigate(`/jobs/${msg.jobCreated!.id}`)}>
                                <ExternalLink className="w-3 h-3" />التفاصيل
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1 text-primary border-primary/30 hover:bg-primary/5 font-bold" onClick={() => setInput(`عدّل وظيفة "${msg.jobCreated!.title}" `)}>
                                <Pencil className="w-3 h-3" />تعديل
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5 px-3 font-bold" onClick={() => handleDeleteJob(i)}>
                                <Trash2 className="w-3 h-3" />حذف
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* Job Updated */}
                        {msg.jobUpdated && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                            className="mt-3 p-3 rounded-xl bg-success/5 border border-success/20 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-success shrink-0" />
                            <div className="text-xs font-semibold"><p className="font-bold text-success">تم تعديل الوظيفة</p><p className="text-muted-foreground">{msg.jobUpdated.title}</p></div>
                          </motion.div>
                        )}

                        {/* Candidate Moved */}
                        {msg.candidateMoved && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                            className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                            <ArrowRightLeft className="w-5 h-5 text-primary shrink-0" />
                            <div className="text-xs font-semibold">
                              <p className="font-bold text-primary">تم نقل {msg.candidateMoved.name}</p>
                              <p className="text-muted-foreground">{msg.candidateMoved.old_stage} ← {msg.candidateMoved.new_stage}</p>
                            </div>
                          </motion.div>
                        )}

                        {/* Interview Scheduled */}
                        {msg.interviewScheduled && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                            className="mt-3 p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-3 glass-card-premium">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="w-5 h-5 text-warning shrink-0" />
                              <div className="text-xs font-semibold">
                                <p className="font-bold text-warning">مقابلة مجدولة: {msg.interviewScheduled.candidate_name}</p>
                                <p className="text-muted-foreground mt-0.5">📅 {msg.interviewScheduled.date} — ⏰ {msg.interviewScheduled.time} — 📍 {msg.interviewScheduled.type}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 font-bold" onClick={() => { navigator.clipboard.writeText(msg.interviewScheduled!.meeting_url); toast({ title: "تم نسخ رابط المقابلة ✅" }); }}>
                                نسخ رابط الاجتماع
                              </Button>
                              <Button size="sm" className="flex-1 text-xs h-8 gap-1 font-bold" onClick={() => window.open(msg.interviewScheduled!.meeting_url, "_blank")}>
                                <Video className="w-3 h-3" />انضمام
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* Offer Created */}
                        {msg.offerCreated && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                            className="mt-3 p-4 rounded-xl bg-success/5 border border-success/20 space-y-3 glass-card-premium">
                            <div className="flex items-center gap-2">
                              <Gift className="w-5 h-5 text-success shrink-0" />
                              <div className="text-xs font-semibold">
                                <p className="font-bold text-success font-bold">عرض وظيفي: {msg.offerCreated.candidate_name}</p>
                                <p className="text-muted-foreground mt-0.5">💼 {msg.offerCreated.position} — 💰 {new Intl.NumberFormat("ar-SA").format(msg.offerCreated.salary)} {msg.offerCreated.currency}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 font-bold" onClick={() => { navigator.clipboard.writeText(`${getPublicBaseUrl()}/offer/${msg.offerCreated!.token}`); toast({ title: "تم نسخ رابط العرض ✅" }); }}>
                                نسخ رابط العرض
                              </Button>
                              <Button size="sm" className="flex-1 text-xs h-8 gap-1 font-bold" onClick={() => navigate("/offers")}>
                                <ExternalLink className="w-3 h-3" />عرض العروض
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* Stats Report */}
                        {msg.statsReport && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                            className="mt-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3 glass-card-premium">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                              <BarChart3 className="w-4 h-4" />تقرير الإحصائيات
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              {msg.statsReport.stats.total_jobs !== undefined && <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm"><p className="text-lg font-bold text-primary">{msg.statsReport.stats.total_jobs}</p><p className="text-muted-foreground">الوظائف</p></div>}
                              {msg.statsReport.stats.total_candidates !== undefined && <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm"><p className="text-lg font-bold text-blue-600">{msg.statsReport.stats.total_candidates}</p><p className="text-muted-foreground">المرشحين</p></div>}
                              {msg.statsReport.stats.total_interviews !== undefined && <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm"><p className="text-lg font-bold text-purple-600">{msg.statsReport.stats.total_interviews}</p><p className="text-muted-foreground">المقابلات</p></div>}
                              {msg.statsReport.stats.total_offers !== undefined && <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm"><p className="text-lg font-bold text-emerald-600">{msg.statsReport.stats.total_offers}</p><p className="text-muted-foreground">العروض</p></div>}
                              {msg.statsReport.stats.acceptance_rate !== undefined && <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center col-span-2 shadow-sm"><p className="text-lg font-bold text-green-600">{msg.statsReport.stats.acceptance_rate}%</p><p className="text-muted-foreground">معدل قبول العروض</p></div>}
                            </div>
                            {msg.statsReport.stats.pipeline && (
                              <div className="space-y-1.5 mt-2">
                                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">مسار التوظيف:</p>
                                {Object.entries(msg.statsReport.stats.pipeline).map(([stage, count]) => (
                                  <div key={stage} className="flex items-center gap-2 text-[11px]">
                                    <span className="text-muted-foreground flex-1">{stage}</span>
                                    <div className="w-20 h-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, ((count as number) / Math.max(1, msg.statsReport!.stats.total_candidates)) * 100)}%` }} />
                                    </div>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-300 w-6 text-center">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="w-full text-xs h-8 mt-1" onClick={() => navigate("/reports")}>
                              <BarChart3 className="w-3 h-3 ml-1" />عرض التقارير الكاملة
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    ) : msg.content}
                  </div>

                  {/* Avatar for assistant */}
                  {msg.role === "assistant" && (
                    <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
                      <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && !messages[messages.length - 1]?.isStreaming && (
              <div className="flex justify-end gap-3">
                <div className="glass-card-premium border border-border/40 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
                  <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Bar - always visible */}
          <div className="px-4 pt-2 pb-1 max-w-4xl mx-auto w-full">
            <QuickActions onSelect={(text) => { setInput(text); setTimeout(() => handleSend(), 50); }} />
          </div>

          {/* Smart Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 max-w-4xl mx-auto w-full">
              <SmartSuggestions onSelect={(text) => setInput(text)} />
            </div>
          )}

          {/* Legacy resume indicator (kept for backward-compat) */}
          {resumeFile && (
            <div className="px-4 pb-1.5 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg w-fit shadow-sm border border-primary/20 backdrop-blur-sm">
                <FileText className="w-3 h-3" />
                <span>{resumeFile.name}</span>
                <button onClick={() => setResumeFile(null)} className="hover:text-destructive"><XCircle className="w-3 h-3" /></button>
              </div>
            </div>
          )}

          {/* Multi-file attachments preview */}
          <div className="px-4 pb-1.5 max-w-4xl mx-auto w-full">
            <FileAttachment
              files={attachedFiles}
              onAdd={(newOnes) => setAttachedFiles(prev => [...prev, ...newOnes])}
              onRemove={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
              disabled={isLoading}
            />
          </div>

          {/* Input Floating Capsule Card */}
          <div className="p-4 pt-1 pb-6 shrink-0 relative w-full max-w-4xl mx-auto z-20">
            <SlashCommandMenu
              query={input}
              onSelect={(cmd: SlashCommand) => {
                setInput(cmd.prompt);
                if (cmd.autoSend) {
                  setTimeout(() => handleSend(), 50);
                }
              }}
            />
            <div className="bg-card/50 border border-border/25 backdrop-blur-xl p-2 rounded-2xl shadow-xl flex gap-2 items-center relative">
              {/* Hidden legacy file input (resume only) */}
              <input type="file" ref={fileInputRef} accept=".txt,.pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />

              {/* Multi-file attachment trigger */}
              <FileAttachment
                files={[]}
                onAdd={(newOnes) => setAttachedFiles(prev => [...prev, ...newOnes].slice(0, 5))}
                onRemove={() => {}}
                disabled={isLoading}
              />

              {/* Voice input (STT) */}
              <VoiceInputButton
                onTranscript={(text) => setInput(prev => (prev ? prev + " " : "") + text)}
                disabled={isLoading}
              />

              <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="اكتب أمرك أو / للأوامر السريعة..."
                className="flex-1 rounded-xl bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs shadow-none" />
              <Button onClick={handleSend} disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                size="icon" className="bg-primary text-primary-foreground hover:bg-primary/95 w-10 h-10 rounded-xl shrink-0 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <QRCodeDialog open={qrDialog.open} onClose={() => setQrDialog({ open: false, jobId: "", jobTitle: "" })} jobTitle={qrDialog.jobTitle} jobId={qrDialog.jobId} />

      <ModelCompareDialog
        open={compareDialog.open}
        onClose={() => setCompareDialog((d) => ({ ...d, open: false }))}
        baseMessages={compareDialog.baseMessages}
        originalReply={compareDialog.reply}
        originalModelLabel={compareDialog.modelLabel}
      />
    </DashboardLayout>
  );
}
