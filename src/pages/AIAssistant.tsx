import DashboardLayout from "@/components/DashboardLayout";
import {
  Bot,
  Send,
  Sparkles,
  Briefcase,
  CheckCircle,
  ArrowRightLeft,
  CalendarCheck,
  Video,
  XCircle,
  Check,
  Pencil,
  Trash2,
  ExternalLink,
  Paperclip,
  BarChart3,
  FileText,
  Gift,
  Plus,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  GitCompare,
  Star,
  Mail,
  User,
  Printer,
  ChevronDown,
  ChevronUp,
  Copy,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Edit3,
  Save
} from "lucide-react";
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
import { useAddJob, useJobs, useCandidates, getActiveCompanyId, type JobRow, type CandidateRow } from "@/hooks/useJobs";
import { useActiveStages, type PipelineStage } from "@/hooks/usePipelineStages";
import CopilotActionCard from "@/components/ai-assistant/CopilotActionCard";
import CopilotCommandBar from "@/components/ai-assistant/CopilotCommandBar";
import type { CopilotActionData, CopilotActionType } from "@/types/copilotActions";
import {
  detectCopilotActionFromText,
  executeCopilotAction,
  rollbackCopilotAction,
} from "@/lib/copilotActionEngine";
import AddJobDialog from "@/components/AddJobDialog";
import QRCodeDialog from "@/components/QRCodeDialog";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/getPublicUrl";
import { getApplyUrl } from "@/lib/getPublicUrl";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import VoiceInputButton from "@/components/ai-assistant/VoiceInputButton";
import AIChatHeader from "@/components/ai-assistant/AIChatHeader";
import AIChatBubble from "@/components/ai-assistant/AIChatBubble";
import AISuggestionChips from "@/components/ai-assistant/AISuggestionChips";

import ProactiveInsightsCard, { type ProactiveInsights } from "@/components/ai-assistant/ProactiveInsightsCard";
import EmailSentCard from "@/components/ai-assistant/EmailSentCard";
import BulkMovedCard from "@/components/ai-assistant/BulkMovedCard";
import SmartSuggestions from "@/components/ai-assistant/SmartSuggestions";
import AIStrategicRoadmapCard from "@/components/ai-assistant/AIStrategicRoadmapCard";
import ConversationsArchiveSidebar from "@/components/ai-assistant/ConversationsArchiveSidebar";
import FileAttachment, { type AttachedFile } from "@/components/ai-assistant/FileAttachment";
import MessageActions from "@/components/ai-assistant/MessageActions";
import QuickActions from "@/components/ai-assistant/QuickActions";
import ExportConversation from "@/components/ai-assistant/ExportConversation";
import SlashCommandMenu, { type SlashCommand } from "@/components/ai-assistant/SlashCommandMenu";
import ModelSelector, { getStoredModelChoice, MODEL_OPTIONS, type ModelChoice } from "@/components/ai-assistant/ModelSelector";
import ModelCompareDialog from "@/components/ai-assistant/ModelCompareDialog";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import SpeakButton from "@/components/ai-assistant/SpeakButton";
import { cleanAIMessageContent } from "@/lib/cleanAiMessage";
import CandidateComparisonCard, { type CandidateComparisonData } from "@/components/ai-assistant/CandidateComparisonCard";
import InterviewGuideCard, { type InterviewGuideData } from "@/components/ai-assistant/InterviewGuideCard";
import WhatsappSmsCard, { type WhatsappSmsData } from "@/components/ai-assistant/WhatsappSmsCard";
import VoiceBriefingCard, { type VoiceBriefingData } from "@/components/ai-assistant/VoiceBriefingCard";
import InteractiveOfferCard, { type OfferData } from "@/components/ai-assistant/InteractiveOfferCard";

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
  copilotAction?: CopilotActionData;
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

function extractJobFromMessage(content: string): JobData | null {
  if (!content) return null;

  const getField = (labels: string[]) => {
    const pattern = new RegExp(
      `(?:[*•#\\-\\s])*\\*?(?:${labels.join("|")})\\*?\\s*:\\s*\\*?([^\\n*]+)\\*?`,
      "i"
    );
    const m = content.match(pattern);
    return m ? m[1].replace(/[*_#•-]/g, "").trim() : null;
  };

  const title = getField(["المسمى الوظيفي", "عنوان الوظيفة", "الوظيفة", "المسمى", "Title"]);
  if (!title) return null;

  const department = getField(["القسم", "الإدارة", "Department"]) || "العامة";
  const location = getField(["الموقع", "المدينة", "Location"]) || "الرياض";
  const type = getField(["نوع التوظيف", "نوع الدوام", "النوع", "Type"]) || "دوام كامل";
  const experience_level = getField(["الخبرة", "مستوى الخبرة", "Experience"]) || "3-5 سنوات";
  const salaryStr = getField(["الراتب", "نطاق الراتب", "Salary"]);

  let salary_min: number | undefined = undefined;
  let salary_max: number | undefined = undefined;
  if (salaryStr) {
    const nums = salaryStr.match(/\d+/g);
    if (nums && nums.length >= 2) {
      salary_min = Number(nums[0]);
      salary_max = Number(nums[1]);
    } else if (nums && nums.length === 1) {
      salary_min = Number(nums[0]);
    }
  }

  return {
    title,
    department,
    location,
    type,
    experience_level,
    description: content.slice(0, 1000),
    salary_min: salary_min ?? 6000,
    salary_max: salary_max ?? 9500,
  };
}

const WELCOME_MSG: Message = {
  role: "assistant",
  content: `مرحباً! أنا مساعدك الذكي للتوظيف 🤖\n\nيمكنني مساعدتك في:\n\n• 🚀 **إنشاء وظائف** مع رمز QR للمشاركة\n• ✏️ **تعديل الوظائف** الحالية\n• 🔄 **نقل المرشحين** بين المراحل\n• 📅 **جدولة المقابلات** مع رابط فيديو\n• 💼 **إنشاء العروض الوظيفية**\n• 📊 **عرض الإحصائيات** والتقارير\n• 📄 **تحليل السير الذاتية**\n\nجرّب أحد الاقتراحات أدناه أو اكتب ما تريد!`,
};

export default function AIAssistant() {
  const { t } = useI18n();
  const { user } = useAuth();
  const addJobMutation = useAddJob();
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState<{ open: boolean; jobId: string; jobTitle: string }>({ open: false, jobId: "", jobTitle: "" });
  const [editJobModal, setEditJobModal] = useState<{ open: boolean; data: any | null; msgIndex: number | null }>({ open: false, data: null, msgIndex: null });
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
  const { data: jobs = [] } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const { data: activeStages = [] } = useActiveStages();

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
    setMessages(loaded.length > 0 ? loaded : []);
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

      const { id, jobCreated, jobUpdated, jobPreview, candidateMoved, interviewScheduled, offerCreated, statsReport, proactiveInsights, emailSent, bulkMoved, candidateComparison, interviewGuide, whatsappSms, voiceBriefing, copilotAction, isStreaming, ...rest } = msg;
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
      if (copilotAction) metadata.copilotAction = copilotAction;

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
    setMessages([]);
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

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tx_pinned_chats") || "[]");
    } catch {
      return [];
    }
  });

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    const { error } = await supabase.from("chat_conversations").update({ title: newTitle }).eq("id", convId);
    if (error) {
      toast({ title: "خطأ في تعديل اسم المحادثة", description: error.message, variant: "destructive" });
      return;
    }
    refetchConversations();
    toast({ title: "تم تعديل اسم المحادثة بنجاح ✅" });
  };

  const handleTogglePinConversation = (convId: string) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(convId);
      const next = isPinned ? prev.filter((id) => id !== convId) : [...prev, convId];
      localStorage.setItem("tx_pinned_chats", JSON.stringify(next));
      toast({ title: isPinned ? "تم إلغاء تثبيت المحادثة" : "تم تثبيت المحادثة في الأعلى 📌" });
      return next;
    });
  };

  const conversationsWithPin = useMemo(() => {
    return (conversations || []).map((c) => ({
      ...c,
      is_pinned: pinnedIds.includes(c.id),
    }));
  }, [conversations, pinnedIds]);

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
            const cleanedText = cleanAIMessageContent(assistantSoFar);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanedText } : m);
              }
              return [...prev, { role: "assistant", content: cleanedText, isStreaming: true }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.isStreaming ? { ...m, content: cleanAIMessageContent(m.content), isStreaming: false } : m));
    return cleanAIMessageContent(assistantSoFar);
  }, []);

  const getFileText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".pdf")) {
        const { extractTextFromPDF } = await import("@/lib/fileParser");
        return await extractTextFromPDF(file);
      } else if (name.endsWith(".docx")) {
        const { extractTextFromDocx } = await import("@/lib/fileParser");
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

    const userPromptRaw = input.trim();
    const detectedCopilotAction = detectCopilotActionFromText(userPromptRaw, {
      jobs,
      candidates,
      stages: activeStages,
      currentUserId: user?.id,
    });

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

      let resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          ...(resumeText ? { resume_text: resumeText } : {}),
          ...(filesText ? { attached_files_text: filesText } : {}),
          ...(modelChoice !== "auto" ? { model_override: modelChoice } : {}),
        }),
      });

      // Silent automated exponential retries on 429 rate limit (up to 3 attempts)
      let attempts = 0;
      while (resp.status === 429 && attempts < 3) {
        attempts++;
        await new Promise(r => setTimeout(r, attempts * 1000));
        resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            ...(resumeText ? { resume_text: resumeText } : {}),
            ...(filesText ? { attached_files_text: filesText } : {}),
            ...(modelChoice !== "auto" ? { model_override: modelChoice } : {}),
          }),
        });
      }

      if (resp.status === 429) {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ **الخادم مشغول حالياً بكثرة الطلبات المتتابعة.** جاري تحسين الاستجابة، يرجى الانتظار بضع ثوانٍ وإعادة إرسال الطلب! 🚀",
          }
        ]);
        setIsLoading(false);
        return;
      }
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
          } catch (error) {
            console.warn("Failed to read error response body as text:", error);
          }
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
              if (detectedCopilotAction && !msg.copilotAction) {
                msg.copilotAction = detectedCopilotAction;
              }
              updated[lastIdx] = msg;
            }
            return updated;
          });
        } else if (detectedCopilotAction) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant" && !updated[lastIdx].copilotAction) {
              updated[lastIdx] = { ...updated[lastIdx], copilotAction: detectedCopilotAction };
            }
            return updated;
          });
        }
      } else {
        const data = await resp.json();
        if (data.error) { toast({ title: "خطأ", description: data.error, variant: "destructive" }); setIsLoading(false); return; }
        const newMsg: Message = { role: "assistant", content: cleanAIMessageContent(data.content || "") };
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
        if (detectedCopilotAction && !newMsg.copilotAction) { newMsg.copilotAction = detectedCopilotAction; }
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

  const handleConfirmJob = async (msgIndex: number, overrideData?: any) => {
    const msg = messages[msgIndex];
    const rawJob = overrideData || msg.jobPreview?.data || extractJobFromMessage(msg.content);
    if (!rawJob || !rawJob.title) {
      toast({ title: "لم يتم التعرف على مسمى الشاغر", description: "يرجى تحديد مسمى الوظيفة والمكان قبل النشر", variant: "destructive" });
      return;
    }
    const jobData = {
      title: rawJob.title,
      department: rawJob.department || "العامة",
      location: rawJob.location || "الرياض",
      type: rawJob.type || "دوام كامل",
      description: rawJob.description || undefined,
      requirements: rawJob.requirements,
      experience_level: rawJob.experience_level || rawJob.experience || undefined,
      salary_min: rawJob.salary_min ?? (rawJob.salaryMin ? Number(rawJob.salaryMin) : undefined),
      salary_max: rawJob.salary_max ?? (rawJob.salaryMax ? Number(rawJob.salaryMax) : undefined),
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" }); return; }
      
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

  const handleExecuteCopilotAction = async (action: CopilotActionData) => {
    try {
      const res = await executeCopilotAction(action, user?.id, getActiveCompanyId());
      
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });

      setMessages(prev =>
        prev.map(m => {
          if (m.copilotAction && m.copilotAction.id === action.id) {
            return {
              ...m,
              copilotAction: {
                ...action,
                status: "executed" as const,
                resultDetails: res.details,
                recordId: res.recordId,
                executedAt: new Date().toISOString(),
              },
            };
          }
          return m;
        })
      );

      toast({
        title: "تم التنفيذ بنجاح ⚡",
        description: res.details,
      });
    } catch (err: any) {
      toast({
        title: "خطأ في تنفيذ الأمر",
        description: err?.message || "تعذر تنفيذ العملية",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleCancelCopilotAction = (actionId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.copilotAction && m.copilotAction.id === actionId) {
          return {
            ...m,
            copilotAction: {
              ...m.copilotAction,
              status: "cancelled" as const,
              resultDetails: "تم إلغاء الأمر بناءً على طلبك.",
            },
          };
        }
        return m;
      })
    );
    toast({
      title: "تم إلغاء الأمر",
      description: "تم إلغاء الإجراء التنفيذي.",
    });
  };

  const handleRollbackCopilotAction = async (action: CopilotActionData) => {
    try {
      await rollbackCopilotAction(action);
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });

      setMessages(prev =>
        prev.map(m => {
          if (m.copilotAction && m.copilotAction.id === action.id) {
            return {
              ...m,
              copilotAction: {
                ...action,
                status: "pending_review" as const,
                resultDetails: "تم التراجع عن النقل واستعادة المرحلة السابقة بنجاح.",
              },
            };
          }
          return m;
        })
      );

      toast({
        title: "تم التراجع بنجاح ↩️",
        description: "تمت استعادة المرحلة السابقة للمرشح.",
      });
    } catch (err: any) {
      toast({
        title: "خطأ في التراجع",
        description: err?.message || "تعذر استعادة المرحلة",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleLaunchCopilotCommand = (type: CopilotActionType) => {
    let action: CopilotActionData | null = null;
    let introText = "";

    switch (type) {
      case "create_job": {
        introText = "لقد جهزت لك مسودة طرح شاغر وظيفي جديد بناءً على المعايير المعتمدة. يمكنك مراجعة الشاغر وتأكيد نشره في النظام فوراً:";
        action = {
          id: `action_job_${Date.now()}`,
          type: "create_job",
          title: "طرح شاغر: مهندس حلول ذكاء اصطناعي",
          description: "مراجعة وتأكيد نشر الوظيفة في النظام وتوليد رابط تقديم مباشر مع رمز QR.",
          status: "pending_review",
          jobPayload: {
            title: "مهندس حلول ذكاء اصطناعي",
            department: "التقنية والابتكار",
            location: "الرياض",
            type: "دوام كامل",
            salary_min: 14000,
            salary_max: 22000,
            experience_level: "متوسط إلى خبير (3-6 سنوات)",
            description: "نبحث عن مهندس ذكاء اصطناعي لقيادة مشاريع التعلم الآلي وأتمتة نماذج اللغة الكبيرة في بيئات الإنتاج.",
            requirements: ["إتقان Python و PyTorch أو TensorFlow", "خبرة في نشر نماذج LLM و Vector DBs", "مهارات تطوير برمجيات احترافية"],
          },
        };
        break;
      }
      case "schedule_interview": {
        const topCand = candidates[0];
        const candName = topCand ? topCand.name : "أحمد الشمري";
        const candRole = topCand ? topCand.role : "مطور واجهات أمامية";
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split("T")[0];
        const roomId = `room-${Math.random().toString(36).substring(2, 10)}`;
        const meetingUrl = `${window.location.origin}/video-room?room=${roomId}&role=recruiter`;

        introText = `لقد قمت بإعداد أمر حجز مقابلة فيديو ذكية للمرشح "${candName}". يرجى تأكيد الموعد لتوليد الغرفة وحفظها في جدول المقابلات:`;
        action = {
          id: `action_interview_${Date.now()}`,
          type: "schedule_interview",
          title: `جدولة مقابلة مع: ${candName}`,
          description: "حجز المقابلة في النظام وتوليد رابط غرفة المقابلة الذكية التفاعلية.",
          status: "pending_review",
          interviewPayload: {
            candidate_id: topCand?.id,
            candidate_name: candName,
            position: candRole,
            date: dateStr,
            time: "11:00",
            type: "فيديو أونلاين",
            meeting_url: meetingUrl,
            interviewer: "مدير التوظيف",
          },
        };
        break;
      }
      case "move_candidate": {
        const topCand = candidates[0];
        const candName = topCand ? topCand.name : "سارة القحطاني";
        const currentStg = topCand?.stage || "فرز أولي";
        const targetStg = "مقابلة تقنية";

        introText = `لقد جهزت أمر نقل المرشح "${candName}" إلى مرحلة جديدة. يمكنك تحديد المرحلة والنقر على تنفيذ فوري لتحديث خط الأنابيب:`;
        action = {
          id: `action_move_${Date.now()}`,
          type: "move_candidate",
          title: `نقل مرحلة المرشح: ${candName}`,
          description: "تغيير حالة ومرحلة المرشح في خط أنابيب التوظيف وقاعدة البيانات مباشرة.",
          status: "pending_review",
          movePayload: {
            candidate_id: topCand?.id || "cand-1",
            candidate_name: candName,
            current_stage: currentStg,
            target_stage: targetStg,
            previous_stage: currentStg,
          },
        };
        break;
      }
      case "filter_candidates": {
        introText = "إليك تحليل ترشيح ومطابقة المواهب الأعلى توافقاً مع شواغر الشركة الحالية بناءً على الذكاء الاصطناعي:";
        const matched = candidates.slice(0, 5).map((c, i) => ({
          id: c.id,
          name: c.name,
          role: c.role || "مرشح",
          stage: c.stage || "تقديم جديد",
          match_score: Math.max(78, 96 - i * 4),
          phone: c.phone,
          email: c.email,
          skills: c.skills || [],
        }));
        action = {
          id: `action_filter_${Date.now()}`,
          type: "filter_candidates",
          title: "ترشيح ومطابقة أفضل المواهب",
          description: "فرز آلي للمرشحين حسب نسبة التطابق وتسهيل الانتقال المباشر للملفات.",
          status: "pending_review",
          filterPayload: {
            job_title: jobs[0]?.title || "الوظائف المفتوحة",
            matched_candidates: matched,
          },
        };
        break;
      }
      case "whatsapp_dispatch": {
        const topCand = candidates[0];
        const candName = topCand ? topCand.name : "محمد الشهري";
        const phone = topCand?.phone || "966501234567";

        introText = `لقد جهزت قالب التواصل السريع عبر واتساب للمرشح "${candName}". انقر على تأكيد لتشغيل الإرسال الفوري:`;
        action = {
          id: `action_wa_${Date.now()}`,
          type: "whatsapp_dispatch",
          title: `تواصل واتساب مع: ${candName}`,
          description: "فتح محادثة WhatsApp مباشرة مع المرشح برسالة ترحيبية مخصصة.",
          status: "pending_review",
          whatsappPayload: {
            candidate_id: topCand?.id,
            candidate_name: candName,
            phone,
            message: `السلام عليكم ${candName}، معكم فريق التوظيف في منصة Tawzeef-X. يسعدنا إبلاغكم باجتياز مرحلة الفرز الأولي، ونرغب في تحديد موعد للمقابلة القادمة.`,
          },
        };
        break;
      }
    }

    if (action) {
      const newMsg: Message = {
        role: "assistant",
        content: introText,
        copilotAction: action,
      };
      setMessages(prev => [...prev, newMsg]);
    }
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
        .chat-prose {
          font-size: 0.875rem;
          line-height: 1.65;
          color: hsl(var(--foreground));
        }
        .chat-prose h1, .chat-prose h2, .chat-prose h3, .chat-prose h4 {
          font-weight: 800;
          color: hsl(var(--foreground));
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .chat-prose h1 { font-size: 1.2rem; }
        .chat-prose h2 { font-size: 1.05rem; }
        .chat-prose h3 { font-size: 0.95rem; }
        .chat-prose p {
          margin-bottom: 0.65rem;
          font-weight: 500;
          line-height: 1.7;
        }
        .chat-prose p:last-child {
          margin-bottom: 0;
        }
        .chat-prose strong {
          font-weight: 800;
          color: hsl(var(--primary));
        }
        .dark .chat-prose strong {
          color: hsl(var(--primary));
        }
        .chat-prose ul, .chat-prose ol {
          margin-bottom: 0.65rem;
          padding-right: 1.25rem;
        }
        .chat-prose ul { list-style-type: disc; }
        .chat-prose ol { list-style-type: decimal; }
        .chat-prose li {
          margin-bottom: 0.25rem;
          font-weight: 500;
          line-height: 1.6;
        }
        .chat-prose table {
          width: 100%;
          margin: 0.75rem 0;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 11.5px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid hsl(var(--border) / 0.5);
          display: table;
        }
        .chat-prose th {
          background-color: hsl(var(--muted) / 0.8);
          color: hsl(var(--foreground));
          font-weight: 800;
          padding: 0.5rem 0.75rem;
          text-align: right;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
        }
        .chat-prose td {
          padding: 0.5rem 0.75rem;
          text-align: right;
          border-bottom: 1px solid hsl(var(--border) / 0.3);
          background-color: hsl(var(--card) / 0.4);
        }
        .chat-prose tr:last-child td {
          border-bottom: none;
        }
        .chat-prose code {
          background-color: hsl(var(--muted) / 0.6);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: monospace;
        }
        .chat-prose pre {
          background-color: hsl(var(--muted) / 0.5);
          border: 1px solid hsl(var(--border) / 0.4);
          padding: 0.75rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.65rem 0;
        }
        .chat-prose blockquote {
          border-right: 3px solid hsl(var(--primary));
          padding-right: 0.75rem;
          margin: 0.65rem 0;
          color: hsl(var(--muted-foreground));
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
      <div className="-m-4 sm:-m-6 lg:-m-8 h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] flex overflow-hidden relative z-10 bg-background/50" dir="rtl">
        {/* Sidebar - Conversations Archive */}
        <ConversationsArchiveSidebar
          conversations={conversationsWithPin}
          activeConversationId={activeConversationId}
          sidebarOpen={sidebarOpen}
          onSelectConversation={loadConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onClearAll={handleClearAllConversations}
          onRenameConversation={handleRenameConversation}
          onTogglePinConversation={handleTogglePinConversation}
          onToggleSidebar={() => setSidebarOpen(false)}
        />

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          {/* Unified Clean Header */}
          <AIChatHeader
            onClearChat={handleNewChat}
            messageCount={messages.length}
            isStreaming={isLoading}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          >
            <ExportConversation messages={messages.map(m => ({ role: m.role, content: m.content }))} />
            <ModelSelector value={modelChoice} onChange={setModelChoice} />
          </AIChatHeader>

          {/* Executive AI Copilot Command Bar & Launcher Dock */}
          <div className="px-4 py-2 border-b border-border/30 bg-card/60 backdrop-blur-md flex items-center justify-between text-xs gap-3 overflow-x-auto no-scrollbar">
            <CopilotCommandBar onLaunch={handleLaunchCopilotCommand} disabled={isLoading} />

            <div className="flex items-center gap-2 shrink-0 border-r border-border/40 pr-3 mr-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Badge variant="outline" className="text-[10px] font-black rounded-md3-full bg-md-primary-container text-md-on-primary-container border-0 px-2.5 py-0.5">
                {MODEL_OPTIONS.find(m => m.id === modelChoice)?.name || "Gemini 3.7"} ⚡
              </Badge>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-transparent min-h-0">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center my-auto min-h-full py-8 max-w-xl mx-auto px-4"
              >
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary via-primary/80 to-purple-600 flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 border border-primary/20">
                    <Bot className="w-8 h-8" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                </div>
                
                <Badge variant="outline" className="mb-2.5 bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[11px] gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  مساعد التوظيف الذكي v2.0
                </Badge>

                <h2 className="text-xl font-extrabold text-foreground mb-1">كيف تود تطوير عملية التوظيف اليوم؟</h2>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6 font-medium">
                  أنا مستشارك الذكي المتقدم في منصة Tawzeef-X. اختر إحدى المهام أدناه أو اكتب سؤالك لتلقي تقارير وتحليلات فورية.
                </p>

                <AISuggestionChips
                  onSelectSuggestion={(prompt) => {
                    setInput(prompt);
                    setTimeout(() => handleSend(), 50);
                  }}
                  className="w-full"
                />
              </motion.div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    custom={msg.role}
                    initial="hidden" 
                    animate="show" 
                    variants={messageAnimation}
                    className={cn("flex gap-3 items-start", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {/* Assistant Bot Avatar (Right side) */}
                    {msg.role === "assistant" && (
                      <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
                        <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                      </div>
                    )}

                    <div className={cn(
                      "max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-xs transition-all duration-200 relative overflow-hidden",
                      msg.role === "user"
                        ? "bg-md-primary text-md-on-primary font-medium rounded-tr-xs shadow-md3-1"
                        : "bg-card/90 border border-border/60 rounded-tl-xs text-foreground shadow-xs backdrop-blur-md dark:bg-card/70"
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

                        {/* Job Preview & Instant Publish Card */}
                        {(msg.jobPreview || (msg.role === "assistant" && extractJobFromMessage(msg.content))) && !msg.jobCreated && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }}
                            className={cn("mt-3 p-4 rounded-2xl border space-y-3 shadow-md transition-all",
                              msg.jobPreview?.status === "confirmed" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" :
                              msg.jobPreview?.status === "rejected" ? "bg-red-500/5 border-red-500/25 text-red-700 dark:text-red-300 opacity-60" :
                              "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-card border-2 border-emerald-500/40 text-foreground")}>
                            <div className="flex items-center justify-between text-xs font-bold">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
                                <span className={msg.jobPreview?.status === "confirmed" ? "text-emerald-800 dark:text-emerald-300" : msg.jobPreview?.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-emerald-800 dark:text-emerald-300 font-black"}>
                                  {msg.jobPreview?.status === "confirmed" ? "✅ تم إضافة الوظيفة في النظام" : msg.jobPreview?.status === "rejected" ? "❌ تم إلغاء الإضافة" : "✨ تمت مراجعة وصياغة الشاغر - إضافة فوري للنظام:"}
                                </span>
                              </div>
                              {(!msg.jobPreview || msg.jobPreview.status === "pending") && (
                                <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">جاهز للنشر 🚀</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold bg-card/60 p-2.5 rounded-xl border border-border/40">
                              <div><span className="text-muted-foreground">المسمى:</span> <span className="font-bold text-foreground/90">{msg.jobPreview?.data.title || extractJobFromMessage(msg.content)?.title}</span></div>
                              <div><span className="text-muted-foreground">القسم:</span> <span className="font-bold text-foreground/90">{msg.jobPreview?.data.department || extractJobFromMessage(msg.content)?.department}</span></div>
                              <div><span className="text-muted-foreground">الموقع:</span> <span className="font-bold text-foreground/90">{msg.jobPreview?.data.location || extractJobFromMessage(msg.content)?.location}</span></div>
                              <div><span className="text-muted-foreground">النوع:</span> <span className="font-bold text-foreground/90">{msg.jobPreview?.data.type || extractJobFromMessage(msg.content)?.type}</span></div>
                            </div>
                            {(!msg.jobPreview || msg.jobPreview.status === "pending") && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                <Button size="sm" className="flex-1 text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-transform hover:scale-[1.01]" onClick={() => handleConfirmJob(i)}>
                                  <Check className="w-4 h-4" />إضافة ونشر الشاغر في النظام الآن 🚀
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs h-9 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-xl px-3" onClick={() => {
                                  const jobData = msg.jobPreview?.data || extractJobFromMessage(msg.content);
                                  if (jobData) setEditJobModal({ open: true, data: jobData, msgIndex: i });
                                }}>
                                  <Pencil className="w-3.5 h-3.5" />تعديل قبل النشر
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs h-9 gap-1 text-red-600 border-red-200 hover:bg-red-50 font-bold rounded-xl px-3" onClick={() => handleRejectJob(i)}>
                                  <XCircle className="w-3.5 h-3.5" />إلغاء
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
                          <InteractiveOfferCard offer={msg.offerCreated} />
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

                        {/* Copilot Action Card */}
                        {msg.copilotAction && (
                          <CopilotActionCard
                            action={msg.copilotAction}
                            onExecute={handleExecuteCopilotAction}
                            onCancel={handleCancelCopilotAction}
                            onRollback={handleRollbackCopilotAction}
                            jobs={jobs}
                            candidates={candidates}
                            stages={activeStages}
                          />
                        )}
                      </div>
                    ) : msg.content}
                  </div>

                    {/* User Avatar (Left side) */}
                    {msg.role === "user" && (
                      <div className="w-8.5 h-8.5 rounded-xl bg-md-primary-container text-md-on-primary-container border border-primary/30 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <span className="text-[10px] font-black">أنت</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {isLoading && !messages[messages.length - 1]?.isStreaming && (
              <div className="flex justify-start items-start gap-3">
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
                  <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <div className="bg-card/90 border border-border/40 rounded-2xl rounded-tl-xs px-5 py-3.5 shadow-md">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legacy resume indicator (kept for backward-compat) */}
          {resumeFile && (
            <div className="px-4 pb-1.5 w-full max-w-full mx-auto shrink-0">
              <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg w-fit shadow-sm border border-primary/20 backdrop-blur-sm">
                <FileText className="w-3 h-3" />
                <span>{resumeFile.name}</span>
                <button onClick={() => setResumeFile(null)} className="hover:text-destructive"><XCircle className="w-3 h-3" /></button>
              </div>
            </div>
          )}

          {/* Multi-file attachments preview (badges list only) */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pb-1.5 w-full max-w-full mx-auto shrink-0">
              <FileAttachment
                files={attachedFiles}
                onAdd={(newOnes) => setAttachedFiles(prev => [...prev, ...newOnes])}
                onRemove={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                disabled={isLoading}
                hideButton={true}
              />
            </div>
          )}

          {/* Input Floating Capsule Card */}
          <div className="p-3 sm:p-4 pt-1 pb-4 shrink-0 relative w-full max-w-full mx-auto z-20 bg-background/70 backdrop-blur-md border-t border-border/20">
            <SlashCommandMenu
              query={input}
              onSelect={(cmd: SlashCommand) => {
                setInput(cmd.prompt);
                if (cmd.autoSend) {
                  setTimeout(() => handleSend(), 50);
                }
              }}
            />
            <div className="bg-card/90 border border-border/60 p-2 rounded-full shadow-md flex gap-2 items-center relative max-w-4xl mx-auto backdrop-blur-md">
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
                placeholder="اكتب أمرك للمساعد الذكي أو / للأوامر السريعة..."
                className="flex-1 rounded-full bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm shadow-none" />
              <Button onClick={handleSend} disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 w-10 h-10 rounded-full shrink-0 shadow-sm hover:scale-105 transition-transform duration-200">
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

      <AddJobDialog
        open={editJobModal.open}
        onClose={() => setEditJobModal({ open: false, data: null, msgIndex: null })}
        initialData={editJobModal.data}
        onAdd={async (job) => {
          if (editJobModal.msgIndex !== null) {
            await handleConfirmJob(editJobModal.msgIndex, job);
          }
          setEditJobModal({ open: false, data: null, msgIndex: null });
        }}
      />
    </DashboardLayout>
  );
}
