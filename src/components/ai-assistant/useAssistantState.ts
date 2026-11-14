import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getActiveCompanyId, useAddJob, useCandidates, useJobs } from "@/hooks/useJobs";
import { useActiveStages } from "@/hooks/usePipelineStages";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import type { AssistantService } from "@/lib/assistantServices";
import { cleanAIMessageContent } from "@/lib/cleanAiMessage";
import { executeCopilotAction, rollbackCopilotAction } from "@/lib/copilotActionEngine";
import type { CopilotActionData, CopilotActionType } from "@/types/copilotActions";
import type { AttachedFile } from "./FileAttachment";
import { getStoredModelChoice, type ModelChoice } from "./ModelSelector";
import {
  applyActionToMessage,
  buildMessageMetadata,
  extractJobFromMessage,
  getErrorMessage,
  parseChatMessageRow,
  readAssistantFileText,
  toAddJobInitialData,
} from "./assistantHelpers";
import type {
  AssistantMessage,
  ChatJsonResponse,
  CompareDialogState,
  ConversationRecord,
  EditJobModalState,
  JobConfirmOverride,
  JobData,
  JobPreviewState,
  QrDialogState,
  StreamActionPayload,
} from "./assistantTypes";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface ParsedStreamChunk {
  error?: unknown;
  type?: unknown;
  actions?: StreamActionPayload[];
  choices?: Array<{ delta?: { content?: string } }>;
}

function normalizeJobConfirmation(
  rawJob: JobData | JobConfirmOverride
): {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string;
  requirements?: string;
  experience?: string;
  salaryMinNum?: number;
  salaryMaxNum?: number;
} {
  const requirements = Array.isArray(rawJob.requirements)
    ? rawJob.requirements.join("\n")
    : typeof rawJob.requirements === "string"
      ? rawJob.requirements
      : undefined;

  const experience =
    ("experience" in rawJob ? rawJob.experience : undefined) ||
    rawJob.experience_level ||
    undefined;

  const salaryMinNum =
    rawJob.salary_min ?? ("salaryMin" in rawJob && rawJob.salaryMin ? Number(rawJob.salaryMin) : undefined);
  const salaryMaxNum =
    rawJob.salary_max ?? ("salaryMax" in rawJob && rawJob.salaryMax ? Number(rawJob.salaryMax) : undefined);

  return {
    title: rawJob.title,
    department: rawJob.department,
    location: rawJob.location,
    type: rawJob.type,
    description: rawJob.description || undefined,
    requirements,
    experience,
    salaryMinNum: salaryMinNum ?? undefined,
    salaryMaxNum: salaryMaxNum ?? undefined,
  };
}

export function useAssistantState() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { hasActionPermission } = useScreenPermissions();
  const addJobMutation = useAddJob();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState<QrDialogState>({ open: false, jobId: "", jobTitle: "" });
  const [editJobModal, setEditJobModal] = useState<EditJobModalState>({ open: false, data: null, msgIndex: null });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState<ModelChoice>(() => getStoredModelChoice());
  const [compareDialog, setCompareDialog] = useState<CompareDialogState>({
    open: false,
    reply: "",
    baseMessages: [],
    modelLabel: "",
  });
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem("tx_pinned_chats") || "[]");
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedReportRef = useRef<{ type: NonNullable<AssistantService["reportType"]>; prompt: string } | null>(null);
  const inFlightRef = useRef(false);
  const savingRef = useRef(false);

  const { data: jobs = [] } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const activeStages = useActiveStages();

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["chat_conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ConversationRecord[];
    },
    enabled: !!user,
  });

  const conversationsWithPin = useMemo(
    () =>
      conversations.map((c) => ({
        ...c,
        is_pinned: pinnedIds.includes(c.id),
      })),
    [conversations, pinnedIds]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selectAssistantService = useCallback(
    (service: AssistantService) => {
      if (service.mode) {
        navigate(`/ai-tools?mode=${service.mode}`);
        return;
      }
      if (service.route) {
        navigate(service.route);
        return;
      }
      if (service.prompt) {
        selectedReportRef.current = service.reportType
          ? { type: service.reportType, prompt: service.prompt }
          : null;
        setInput(service.prompt);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [navigate]
  );

  const loadConversation = useCallback(async (convId: string) => {
    if (inFlightRef.current || savingRef.current) {
      toast({ title: "انتظر حفظ الرد الحالي أولاً" });
      return;
    }
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "خطأ في تحميل المحادثة", variant: "destructive" });
      return;
    }
    const loaded = (data || []).map(parseChatMessageRow);
    setMessages(loaded.length > 0 ? loaded : []);
    setActiveConversationId(convId);
    setSidebarOpen(false);
  }, []);

  const saveMessages = useCallback(
    async (msgs: AssistantMessage[], convId?: string | null) => {
      if (!user) return null;
      const userMessages = msgs.filter((m) => m.role === "user");
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
        if (error) {
          toast({ title: "تعذر حفظ المحادثة", variant: "destructive" });
          return null;
        }
        conversationId = data.id;
        setActiveConversationId(conversationId);
      } else {
        await supabase
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      const unsaved = msgs.filter((m) => !m.id && !m.isStreaming);
      const savedIds = new Map<AssistantMessage, string>();

      for (const msg of unsaved) {
        const metadata = buildMessageMetadata(msg);
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: msg.role,
            content: msg.content,
            metadata,
          })
          .select("id")
          .single();

        if (!error && data) {
          savedIds.set(msg, data.id);
        } else if (error) {
          console.error("Failed to insert message:", error);
          toast({ title: "تعذر حفظ بعض الرسائل", variant: "destructive" });
        }
      }

      if (savedIds.size) {
        setMessages((current) =>
          current.map((m) => (savedIds.has(m) ? { ...m, id: savedIds.get(m) } : m))
        );
      }

      void refetchConversations();
      return conversationId;
    },
    [user, refetchConversations]
  );

  useEffect(() => {
    if (
      isLoading ||
      savingRef.current ||
      !user ||
      !messages.some((m) => m.role === "user") ||
      messages[messages.length - 1]?.role !== "assistant" ||
      messages[messages.length - 1]?.isStreaming ||
      !messages.slice(-2).some((m) => !m.id)
    ) {
      return;
    }
    const timer = window.setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        await saveMessages(messages, activeConversationId);
      } finally {
        savingRef.current = false;
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [messages, isLoading, activeConversationId, user, saveMessages]);

  const handleNewChat = useCallback(() => {
    if (inFlightRef.current || savingRef.current) {
      toast({ title: "انتظر حفظ الرد الحالي أولاً" });
      return;
    }
    setMessages([]);
    setActiveConversationId(null);
    setSidebarOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (convId: string, e: MouseEvent) => {
      e.stopPropagation();
      const confirmed = window.confirm("هل أنت متأكد من حذف هذه المحادثة؟");
      if (!confirmed) return;
      const { error } = await supabase.from("chat_conversations").delete().eq("id", convId);
      if (error) {
        toast({ title: "خطأ في حذف المحادثة", variant: "destructive" });
        return;
      }
      if (activeConversationId === convId) handleNewChat();
      void refetchConversations();
      toast({ title: "تم حذف المحادثة ✅" });
    },
    [activeConversationId, handleNewChat, refetchConversations]
  );

  const handleClearAllConversations = useCallback(async () => {
    if (!user) return;
    const confirmed = window.confirm("هل أنت متأكد من حذف جميع المحادثات نهائياً؟ لا يمكن التراجع عن هذه الخطوة.");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("chat_conversations").delete().eq("user_id", user.id);
      if (error) throw error;

      handleNewChat();
      void refetchConversations();
      toast({ title: "تم حذف جميع المحادثات بنجاح 🗑️" });
    } catch (e: unknown) {
      toast({
        title: "خطأ في حذف المحادثات",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  }, [user, handleNewChat, refetchConversations]);

  const handleRenameConversation = useCallback(
    async (convId: string, newTitle: string) => {
      const { error } = await supabase.from("chat_conversations").update({ title: newTitle }).eq("id", convId);
      if (error) {
        toast({ title: "خطأ في تعديل اسم المحادثة", description: error.message, variant: "destructive" });
        return;
      }
      void refetchConversations();
      toast({ title: "تم تعديل اسم المحادثة بنجاح ✅" });
    },
    [refetchConversations]
  );

  const handleTogglePinConversation = useCallback((convId: string) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(convId);
      const next = isPinned ? prev.filter((id) => id !== convId) : [...prev, convId];
      localStorage.setItem("tx_pinned_chats", JSON.stringify(next));
      toast({ title: isPinned ? "تم إلغاء تثبيت المحادثة" : "تم تثبيت المحادثة في الأعلى 📌" });
      return next;
    });
  }, []);

  const parseSSEStream = useCallback(
    async (resp: Response, onActions: (actions: StreamActionPayload[]) => void) => {
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
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed: unknown = JSON.parse(jsonStr);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
            const chunk = parsed as ParsedStreamChunk;
            if (chunk.error) {
              throw new Error(typeof chunk.error === "string" ? chunk.error : "تعذر إكمال الرد");
            }
            if (chunk.type === "actions" && Array.isArray(chunk.actions)) {
              onActions(chunk.actions);
              continue;
            }
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const cleanedText = cleanAIMessageContent(assistantSoFar);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: cleanedText } : m));
                }
                return [...prev, { role: "assistant", content: cleanedText, isStreaming: true }];
              });
            }
          } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
          }
        }
      }

      if (!assistantSoFar.trim()) throw new Error("وصل رد فارغ من خدمة الذكاء الاصطناعي. حاول مجددًا.");
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.isStreaming
            ? { ...m, content: cleanAIMessageContent(m.content), isStreaming: false }
            : m
        )
      );
      return cleanAIMessageContent(assistantSoFar);
    },
    []
  );

  const handleSend = useCallback(
    async (promptOverride?: string) => {
      const prompt = promptOverride ?? input;
      if ((!prompt.trim() && attachedFiles.length === 0 && !resumeFile) || inFlightRef.current || savingRef.current) {
        return;
      }
      const reportType =
        selectedReportRef.current?.prompt === prompt && !attachedFiles.length && !resumeFile
          ? selectedReportRef.current.type
          : undefined;
      selectedReportRef.current = null;
      inFlightRef.current = true;
      setIsLoading(true);

      if (attachedFiles.length > 0 || resumeFile) {
        toast({
          title: "جاري قراءة الملفات المرفقة...",
          description: "الرجاء الانتظار حتى يستخرج المساعد النصوص تلقائياً.",
        });
      }

      let resumeText = "";
      const attachedResumeName = resumeFile?.name;
      if (resumeFile) {
        try {
          resumeText = await readAssistantFileText(resumeFile);
        } catch {
          toast({ title: "تعذر قراءة ملف السيرة الذاتية", variant: "destructive" });
        }
        setResumeFile(null);
      }

      const fileSummaries: string[] = [];
      for (const af of attachedFiles) {
        try {
          const fileExt = af.file.name.split(".").pop()?.toLowerCase();
          if (
            af.type === "resume" ||
            af.file.type.startsWith("text/") ||
            fileExt === "pdf" ||
            fileExt === "docx" ||
            fileExt === "doc"
          ) {
            const txt = await readAssistantFileText(af.file);
            fileSummaries.push(`--- ملف: ${af.file.name} ---\n${txt.slice(0, 8000)}`);
          } else {
            fileSummaries.push(`📎 ${af.file.name} (${af.type})`);
          }
        } catch {
          fileSummaries.push(`📎 ${af.file.name}`);
        }
      }
      const filesText = fileSummaries.join("\n\n");
      const fileLabels = attachedFiles.map((f) => `📎 ${f.file.name}`).join(" ");

      const userContent =
        prompt.trim() +
        (attachedResumeName ? ` 📎 ${attachedResumeName}` : "") +
        (fileLabels ? ` ${fileLabels}` : "");
      const userMsg: AssistantMessage = { role: "user", content: userContent || "تحليل الملفات المرفقة" };
      setInput("");
      setAttachedFiles([]);
      setMessages((prev) => [...prev, userMsg]);

      const allMessages = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-40);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("انتهت الجلسة. سجل دخولك ثم أعد المحاولة.");
        const requestBody = JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          ...(resumeText ? { resume_text: resumeText } : {}),
          ...(filesText ? { attached_files_text: filesText } : {}),
          ...(modelChoice !== "auto" ? { model_override: modelChoice } : {}),
          ...(reportType ? { report_type: reportType } : {}),
        });

        let resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: requestBody,
        });

        let attempts = 0;
        while (resp.status === 429 && attempts < 3) {
          attempts++;
          await new Promise((r) => setTimeout(r, attempts * 1000));
          resp = await fetch(CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: requestBody,
          });
        }

        if (resp.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "⚠️ **الخادم مشغول حالياً بكثرة الطلبات المتتابعة.** جاري تحسين الاستجابة، يرجى الانتظار بضع ثوانٍ وإعادة إرسال الطلب! 🚀",
            },
          ]);
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast({ title: "يرجى إضافة رصيد للاستمرار", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!resp.ok) {
          let errorMessage = "Failed";
          try {
            const errData: unknown = await resp.json();
            if (errData && typeof errData === "object" && "error" in errData && typeof errData.error === "string") {
              errorMessage = errData.error;
            }
          } catch {
            try {
              const txt = await resp.text();
              if (txt) errorMessage = txt.slice(0, 150);
            } catch {
              /* Use the generic request error. */
            }
          }
          throw new Error(errorMessage);
        }

        const contentType = resp.headers.get("Content-Type") || "";

        if (contentType.includes("text/event-stream") && resp.body) {
          let pendingActions: StreamActionPayload[] = [];
          await parseSSEStream(resp, (actions) => {
            pendingActions = actions;
          });

          if (pendingActions.length > 0) {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                const msg = { ...updated[lastIdx] };
                for (const action of pendingActions) {
                  applyActionToMessage(msg, action, queryClient, true);
                }
                updated[lastIdx] = msg;
              }
              return updated;
            });
          }
        } else {
          const data = (await resp.json()) as ChatJsonResponse;
          if (data.error) {
            toast({ title: "خطأ", description: data.error, variant: "destructive" });
            setIsLoading(false);
            return;
          }
          const newMsg: AssistantMessage = {
            role: "assistant",
            content: cleanAIMessageContent(data.content || ""),
          };
          applyActionToMessage(newMsg, data, queryClient, false);
          setMessages((prev) => [...prev, newMsg]);
        }
      } catch (e) {
        console.error(e);
        setMessages((prev) => {
          const withoutPartial = prev.filter((m) => !(m.role === "assistant" && m.isStreaming));
          return [...withoutPartial, { role: "assistant", content: "تعذر إكمال الرد. يمكنك إعادة إرسال طلبك." }];
        });
        const msg = e instanceof Error ? e.message : "Failed";
        toast({
          title: msg === "Failed" ? "خطأ في الاتصال" : "خطأ في مساعد AI",
          description: msg === "Failed" ? "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى." : msg,
          variant: "destructive",
        });
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [input, attachedFiles, resumeFile, messages, modelChoice, parseSSEStream, queryClient]
  );

  const handleConfirmJob = useCallback(
    async (msgIndex: number, overrideData?: JobConfirmOverride) => {
      const msg = messages[msgIndex];
      const rawJob = overrideData || msg.jobPreview?.data || extractJobFromMessage(msg.content);
      if (!rawJob?.title || !rawJob.department || !rawJob.location || !rawJob.type) {
        toast({
          title: "بيانات الشاغر غير مكتملة",
          description: "راجع المسمى والقسم والموقع ونوع الدوام قبل النشر",
          variant: "destructive",
        });
        return;
      }

      const normalized = normalizeJobConfirmation(rawJob);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
          return;
        }

        const job = await addJobMutation.mutateAsync({
          title: normalized.title,
          department: normalized.department,
          location: normalized.location,
          type: normalized.type,
          description: normalized.description,
          requirements: normalized.requirements,
          experience: normalized.experience,
          salaryMin: normalized.salaryMinNum !== undefined ? String(normalized.salaryMinNum) : undefined,
          salaryMax: normalized.salaryMaxNum !== undefined ? String(normalized.salaryMaxNum) : undefined,
        });

        void queryClient.invalidateQueries({ queryKey: ["my-subscription"] });

        const previewData: JobData = msg.jobPreview?.data ?? {
          title: normalized.title,
          department: normalized.department,
          location: normalized.location,
          type: normalized.type,
          description: normalized.description ?? null,
          requirements: rawJob.requirements ?? null,
          experience_level: normalized.experience ?? null,
          salary_min: normalized.salaryMinNum ?? null,
          salary_max: normalized.salaryMaxNum ?? null,
        };
        const confirmedPreview: JobPreviewState = { data: previewData, status: "confirmed" };
        const createdJob = { id: job.id, title: job.title };

        setMessages((prev) =>
          prev.map((m, i) => (i === msgIndex ? { ...m, jobPreview: confirmedPreview, jobCreated: createdJob } : m))
        );
        void queryClient.invalidateQueries({ queryKey: ["jobs"] });

        if (msg.id) {
          const metadata = buildMessageMetadata(msg, {
            jobPreview: confirmedPreview,
            jobCreated: createdJob,
          });
          await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
        }
      } catch (e: unknown) {
        toast({
          title: "خطأ",
          description: getErrorMessage(e, "خطأ في الاتصال"),
          variant: "destructive",
        });
      }
    },
    [messages, addJobMutation, queryClient]
  );

  const handleRejectJob = useCallback(
    async (msgIndex: number) => {
      const msg = messages[msgIndex];
      const rejectedPreview = msg.jobPreview ? { ...msg.jobPreview, status: "rejected" as const } : undefined;
      setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, jobPreview: rejectedPreview } : m)));

      if (msg.id && rejectedPreview) {
        const metadata = buildMessageMetadata(msg, { jobPreview: rejectedPreview });
        await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
      }
      toast({ title: "تم إلغاء إنشاء الوظيفة" });
    },
    [messages]
  );

  const handleDeleteJob = useCallback(
    async (msgIndex: number) => {
      const msg = messages[msgIndex];
      if (!msg.jobCreated?.id) return;
      const confirmed = window.confirm(`هل أنت متأكد من حذف وظيفة "${msg.jobCreated.title}"؟`);
      if (!confirmed) return;
      const { error } = await supabase.from("jobs").delete().eq("id", msg.jobCreated.id);
      if (error) {
        toast({ title: "فشل حذف الوظيفة", description: error.message, variant: "destructive" });
        return;
      }

      const rejectedPreview = msg.jobPreview ? { ...msg.jobPreview, status: "rejected" as const } : undefined;
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, jobCreated: undefined, jobPreview: rejectedPreview } : m))
      );
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });

      if (msg.id) {
        const metadata = buildMessageMetadata(msg, {
          jobPreview: rejectedPreview,
          jobCreated: null,
        });
        await supabase.from("chat_messages").update({ metadata }).eq("id", msg.id);
      }
      toast({ title: "تم حذف الوظيفة 🗑️" });
    },
    [messages, queryClient]
  );

  const handleExecuteCopilotAction = useCallback(
    async (action: CopilotActionData) => {
      try {
        const res = await executeCopilotAction(action, user?.id, getActiveCompanyId());

        void queryClient.invalidateQueries({ queryKey: ["jobs"] });
        void queryClient.invalidateQueries({ queryKey: ["candidates"] });
        void queryClient.invalidateQueries({ queryKey: ["interviews"] });
        void queryClient.invalidateQueries({ queryKey: ["reports"] });

        setMessages((prev) =>
          prev.map((m) => {
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
      } catch (err: unknown) {
        toast({
          title: "خطأ في تنفيذ الأمر",
          description: getErrorMessage(err, "تعذر تنفيذ العملية"),
          variant: "destructive",
        });
        throw err;
      }
    },
    [user?.id, queryClient]
  );

  const handleCancelCopilotAction = useCallback((actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
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
  }, []);

  const handleRollbackCopilotAction = useCallback(
    async (action: CopilotActionData) => {
      try {
        await rollbackCopilotAction(action);
        void queryClient.invalidateQueries({ queryKey: ["candidates"] });
        void queryClient.invalidateQueries({ queryKey: ["pipeline"] });

        setMessages((prev) =>
          prev.map((m) => {
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
      } catch (err: unknown) {
        toast({
          title: "خطأ في التراجع",
          description: getErrorMessage(err, "تعذر استعادة المرحلة"),
          variant: "destructive",
        });
        throw err;
      }
    },
    [queryClient]
  );

  const handleLaunchCopilotCommand = useCallback((type: CopilotActionType) => {
    const prompts: Partial<Record<CopilotActionType, string>> = {
      create_job: "ساعدني في صياغة وظيفة جديدة. المسمى الوظيفي: ",
      schedule_interview: "ساعدني في جدولة مقابلة. اسم المرشح والموعد: ",
      move_candidate: "ساعدني في نقل مرشح إلى مرحلة أخرى. اسم المرشح والمرحلة: ",
      filter_candidates: "اعرض المرشحين الحاليين للوظيفة التالية مع الأدلة المتاحة دون اتخاذ قرار: ",
      whatsapp_dispatch: "اكتب مسودة رسالة واتساب لمرشح، ولا ترسلها. اسم المرشح والغرض: ",
    };
    setInput(prompts[type] || "");
    inputRef.current?.focus();
  }, []);

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: "حجم الملف كبير جداً (الحد 5MB)", variant: "destructive" });
          return;
        }
        setResumeFile(file);
        if (!input.trim()) setInput("حلل هذه السيرة الذاتية وقارنها بالوظائف المتاحة");
      }
    },
    [input]
  );

  const handleInputChange = useCallback((value: string) => {
    selectedReportRef.current = null;
    setInput(value);
  }, []);

  const prefillInput = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, []);

  const openEditJobModal = useCallback((jobData: JobData, msgIndex: number) => {
    setEditJobModal({
      open: true,
      data: toAddJobInitialData(jobData),
      msgIndex,
    });
  }, []);

  return {
    canManage: role === "admin" || role === "recruiter",
    canScheduleInterviews: hasActionPermission("action.create_interviews"),
    messages,
    input,
    setInput,
    servicesOpen,
    setServicesOpen,
    isLoading,
    qrDialog,
    setQrDialog,
    editJobModal,
    setEditJobModal,
    resumeFile,
    setResumeFile,
    attachedFiles,
    setAttachedFiles,
    sidebarOpen,
    setSidebarOpen,
    activeConversationId,
    modelChoice,
    setModelChoice,
    compareDialog,
    setCompareDialog,
    scrollRef,
    fileInputRef,
    inputRef,
    jobs,
    candidates,
    activeStages,
    conversationsWithPin,
    navigate,
    selectAssistantService,
    loadConversation,
    handleNewChat,
    handleDeleteConversation,
    handleClearAllConversations,
    handleRenameConversation,
    handleTogglePinConversation,
    handleSend,
    handleConfirmJob,
    handleRejectJob,
    handleDeleteJob,
    handleExecuteCopilotAction,
    handleCancelCopilotAction,
    handleRollbackCopilotAction,
    handleLaunchCopilotCommand,
    handleFileSelect,
    handleInputChange,
    prefillInput,
    openEditJobModal,
  };
}
