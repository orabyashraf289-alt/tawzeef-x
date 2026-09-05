import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Video, PhoneOff, Copy, Check, ExternalLink, Mic, MicOff,
  CircleDot, Square, FileText, Download, Save, Loader2, Sparkles, Brain,
  Star, Printer, HelpCircle, ListChecks, CheckCircle2, MessageSquare,
  Plus, RotateCcw, ThumbsUp, ThumbsDown, AlertCircle, Award, Scale, CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";

// ——— Web Speech API hook for live transcription ———
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const start = useCallback((lang = "ar-SA") => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "المتصفح لا يدعم النسخ النصي", description: "يرجى استخدام Google Chrome", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + " ";
        } else {
          interim += t;
        }
      }
      if (final) setTranscript(prev => prev + final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.error("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return { isListening, transcript, interimTranscript, start, stop, reset, setTranscript };
}

// ——— Audio Recorder hook ———
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      toast({ title: "لا يمكن الوصول للميكروفون", variant: "destructive" });
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { isRecording, duration, audioBlob, start, stop };
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VideoRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  const candidateName = searchParams.get("name") || "";
  const position = searchParams.get("position") || "";
  const intId = searchParams.get("interviewId") || "";

  const speech = useSpeechRecognition();
  const recorder = useAudioRecorder();

  useEffect(() => { if (intId) setInterviewId(intId); }, [intId]);

  // Sidebar state (4 tabs: transcript, scorecard, questions, ai)
  const [sidebarTab, setSidebarTab] = useState<"transcript" | "scorecard" | "questions" | "ai">("transcript");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  // Live Scorecard Rubric State
  const [rubricScores, setRubricScores] = useState({
    technical: 3,
    communication: 3,
    problemSolving: 3,
    cultureFit: 3,
  });
  const [scorecardRecommendation, setScorecardRecommendation] = useState<"strong_hire" | "hire" | "maybe" | "no_hire">("hire");
  const [scorecardNotes, setScorecardNotes] = useState("");
  const [scorecardSaving, setScorecardSaving] = useState(false);

  const totalRubricScore = useMemo(() => {
    const sum = rubricScores.technical + rubricScores.communication + rubricScores.problemSolving + rubricScores.cultureFit;
    return Math.round((sum / 20) * 100);
  }, [rubricScores]);

  // Live Question Bank State
  const DEFAULT_INTERVIEW_QUESTIONS = useMemo(() => [
    {
      id: "q1",
      category: "افتتاحي",
      question: "عرّفنا بنفسك وبأبرز محطات مسيرتك المهنية والإنجازات التي تفتخر بها؟",
      tip: "ابحث عن: تسلسل زمني منطقي، ثقة بالنفس، تركيز على النتائج الملموسة.",
    },
    {
      id: "q2",
      category: "تخصصي وفني",
      question: `ما هي المنهجيات والأساليب الحديثة التي تعتمد عليها في أداء مهام وظيفة (${position || "المعلن عنها"})؟`,
      tip: "ابحث عن: عمق المعرفة الفنية، الإلمام بالأدوات الحديثة والابتكار.",
    },
    {
      id: "q3",
      category: "سلوكي (STAR)",
      question: "اذكر موقفاً عملياً معقداً واجهته مؤخراً، ما كان دورك المحدد وكيف تجاوزت التحدي؟",
      tip: "منهجية STAR: الموقف (Situation)، المهمة (Task)، الإجراء (Action)، النتيجة (Result).",
    },
    {
      id: "q4",
      category: "حل المشكلات",
      question: "إذا تعارضت أولويات الإدارة مع ضيق الوقت المتاح لتسليم مشروع هام، كيف تتصرف؟",
      tip: "ابحث عن: مهارات التفاوض، ترتيب الأولويات، التواصل الشفاف مع أصحاب المصلحة.",
    },
    {
      id: "q5",
      category: "ملاءمة وثقافة",
      question: "ما هي البيئة التي تحفزك على العطاء، وما هي تطلعاتك للتطور خلال السنوات القادمة؟",
      tip: "ابحث عن: الشغف المهني، التوافق مع قيم وثقافة المؤسسة.",
    },
  ], [position]);

  const [questionsList, setQuestionsList] = useState(DEFAULT_INTERVIEW_QUESTIONS);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [generatingCustomQs, setGeneratingCustomQs] = useState(false);

  const toggleQuestionAsked = (id: string) => {
    setAskedQuestions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveScorecard = async () => {
    if (!interviewId) {
      toast({ title: "لم يتم تحديد معرّف المقابلة للحفظ", variant: "destructive" });
      return;
    }
    setScorecardSaving(true);
    try {
      const starRating = Math.max(1, Math.round(totalRubricScore / 20));
      const formattedScorecard = `--- بطاقة التقييم اللحظية للمقابلة ---
النتيجة الكلية: ${totalRubricScore}% (${starRating}/5 نجوم)
التوصية: ${
  scorecardRecommendation === "strong_hire"
    ? "موصى به بقوة (Strong Hire) ⭐"
    : scorecardRecommendation === "hire"
    ? "مقبول (Hire) ✓"
    : scorecardRecommendation === "maybe"
    ? "قيد الانتظار / احتياط (On Hold) ⏸️"
    : "غير ملائم (No Hire) ❌"
}

تفاصيل المعايير:
- المهارات الفنية والتخصصية: ${rubricScores.technical}/5
- مهارات التواصل والحضور: ${rubricScores.communication}/5
- حل المشكلات والتفكير النقدي: ${rubricScores.problemSolving}/5
- التوافق الثقافي والدافعية: ${rubricScores.cultureFit}/5

ملاحظات المقيم:
${scorecardNotes || "لا توجد ملاحظات إضافية."}`;

      const { error } = await supabase
        .from("interviews")
        .update({
          rating: starRating,
          notes: formattedScorecard,
          status: "مكتملة",
        })
        .eq("id", interviewId);

      if (error) throw error;

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      toast({
        title: "✅ تم اعتماد بطاقة التقييم اللحظية بنجاح",
        description: `الدرجة الكلية: ${totalRubricScore}% — تم تحديث حالة المقابلة إلى مكتملة`,
      });
    } catch (err: any) {
      toast({ title: "فشل حفظ التقييم", description: err.message, variant: "destructive" });
    } finally {
      setScorecardSaving(false);
    }
  };

  const handleGenerateAIQuestions = async () => {
    setGeneratingCustomQs(true);
    try {
      const prompt = `أنت خبير توظيف. قم باقتراح 3 أسئلة مقابلة احترافية باللغة العربية متقدمة ومخصصة لوظيفة "${position || "غير محددة"}" واسم المرشح "${candidateName || "مرشح"}".
يرجى إرجاع مصفوفة JSON نظيفة تحتوي على كائنات بالحقول:
- question: نص السؤال باللغة العربية
- category: تصنيف السؤال (مثل: تخصصي، ذكاء عاطفي، قيادة)
- tip: توجيه مختصر للمحاور عما يجب البحث عنه في الإجابة

أعد النتيجة فقط داخل كود بلوك \`\`\`json.`;

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            { role: "system", content: "أنت خبير صياغة أسئلة مقابلات. أرجع JSON فقط." },
            { role: "user", content: prompt }
          ],
          disable_tools: true,
          stream: false,
        }
      });

      if (error) throw error;
      const content = data?.choices?.[0]?.message?.content || "";
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const raw = match ? match[1] : content;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const formatted = parsed.map((item: any, i: number) => ({
          id: `ai-q-${Date.now()}-${i}`,
          category: item.category || "ذكاء اصطناعي ✨",
          question: item.question,
          tip: item.tip || "ابحث عن العمق والأدلة العملية.",
        }));
        setQuestionsList((prev) => [...prev, ...formatted]);
        toast({ title: `تم توليد ${formatted.length} أسئلة ذكية إضافية بنجاح ✨` });
      }
    } catch (e: any) {
      toast({ title: "تعذر توليد الأسئلة", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingCustomQs(false);
    }
  };

  const handlePrintEvaluationReport = () => {
    const printWin = window.open("", "_blank", "width=850,height=1000");
    if (!printWin) {
      toast({ title: "يرجى السماح بالنوافذ المنبثقة للطباعة", variant: "destructive" });
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>تقرير تقييم المقابلة — ${candidateName || "المرشح"}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
          .section { margin-bottom: 24px; background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          th { background: #f1f5f9; color: #475569; }
          .score-total { font-size: 32px; font-weight: 900; color: #059669; }
          @media print { body { padding: 15px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">تقرير تقييم المقابلة الشخصية</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">منصة Tawzeef-X — قسم التوظيف والاستقطاب</p>
          </div>
          <div style="text-align: left;">
            <span class="badge">توثيق رسمي معتمد</span>
            <p style="font-size: 12px; color: #94a3b8; margin: 6px 0 0 0;">التاريخ: ${new Date().toLocaleDateString("ar-SA")}</p>
          </div>
        </div>

        <div class="section" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-size: 13px; color: #64748b;">اسم المرشح:</p>
            <h2 style="margin: 4px 0; font-size: 18px;">${candidateName || "مرشح مسجل"}</h2>
            <p style="margin: 0; font-size: 13px; color: #64748b;">الوظيفة: <strong>${position || "غير محدد"}</strong></p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">النتيجة الكلية للتقييم</p>
            <div class="score-total">${totalRubricScore}%</div>
            <span class="badge">${scorecardRecommendation.toUpperCase()}</span>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">📊 نتائج معايير بطاقة التقييم</h3>
          <table>
            <thead>
              <tr>
                <th>المعيار التقييمي</th>
                <th>الدرجة الممنوحة</th>
                <th>التقييم من 5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>المهارات الفنية والتخصصية</td>
                <td>${rubricScores.technical} / 5</td>
                <td>${"★".repeat(rubricScores.technical)}${"☆".repeat(5 - rubricScores.technical)}</td>
              </tr>
              <tr>
                <td>مهارات التواصل والحضور والثقة</td>
                <td>${rubricScores.communication} / 5</td>
                <td>${"★".repeat(rubricScores.communication)}${"☆".repeat(5 - rubricScores.communication)}</td>
              </tr>
              <tr>
                <td>حل المشكلات والتفكير النقدي</td>
                <td>${rubricScores.problemSolving} / 5</td>
                <td>${"★".repeat(rubricScores.problemSolving)}${"☆".repeat(5 - rubricScores.problemSolving)}</td>
              </tr>
              <tr>
                <td>التوافق الثقافي والدافعية</td>
                <td>${rubricScores.cultureFit} / 5</td>
                <td>${"★".repeat(rubricScores.cultureFit)}${"☆".repeat(5 - rubricScores.cultureFit)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${
          scorecardNotes
            ? `
        <div class="section">
          <h3 class="section-title">📝 ملاحظات المقيم</h3>
          <p style="font-size: 13px; white-space: pre-wrap; margin: 0;">${scorecardNotes}</p>
        </div>
        `
            : ""
        }

        ${
          aiReport
            ? `
        <div class="section">
          <h3 class="section-title">✨ تحليل مساعد الذكاء الاصطناعي</h3>
          <p style="font-size: 13px;"><strong>الملخص:</strong> ${aiReport.summary || ""}</p>
          <div style="margin-top: 10px;">
            <strong style="color: #059669; font-size: 13px;">أبرز نقاط القوة:</strong>
            <ul style="font-size: 13px; margin: 4px 0;">
              ${aiReport.strengths?.map((s: string) => `<li>${s}</li>`).join("") || ""}
            </ul>
          </div>
          <div style="margin-top: 10px;">
            <strong style="color: #dc2626; font-size: 13px;">جوانب التطوير:</strong>
            <ul style="font-size: 13px; margin: 4px 0;">
              ${aiReport.weaknesses?.map((w: string) => `<li>${w}</li>`).join("") || ""}
            </ul>
          </div>
        </div>
        `
            : ""
        }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
          <div>توقيع مسؤول المقابلة: __________________</div>
          <div>اعتماد إدارة الموارد البشرية: __________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWin.document.write(reportHtml);
    printWin.document.close();
  };

  const handleAIAnalysis = async () => {
    if (!speech.transcript.trim()) return;
    setAiLoading(true);
    try {
      const prompt = `
أنت خبير تقييم مقابلات توظيف ذكي ومحترف.
قم بتحليل نص المقابلة الشخصية التالي للمرشح للوظيفة "${position || "غير محددة"}" واسمه "${candidateName || "غير محدد"}".
قم بصياغة تقييم شامل في صيغة JSON تحتوي على الحقول التالية:
- score: درجة الأداء العام للمرشح (عدد صحيح من 0 إلى 100)
- summary: ملخص أداء المرشح خلال المقابلة في 3-4 جمل باللغة العربية
- strengths: مصفوفة سلاسل نصية (strings) تحتوي على 3-4 من نقاط القوة البارزة لديه
- weaknesses: مصفوفة سلاسل نصية (strings) تحتوي على 2-3 من الفجوات أو نقاط الضعف أو الأسئلة التي لم يجب عليها جيداً
- communication: فقرة قصيرة تقيم مهارات التواصل واللغة والثقة بالنفس لدى المرشح
- recommendation: التوصية النهائية (إما "مقبول" أو "مرفوض" أو "مرحلة تالية")

نص المقابلة المقروء:
"${speech.transcript}"
`;

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "system",
              content: "أنت مقيم مقابلات خبير. يجب أن تعود النتيجة دائماً بصيغة JSON نظيفة فقط بداخل كود بلوك ```json"
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
      const contentText = data?.choices?.[0]?.message?.content || "";
      if (!contentText) throw new Error("لم يتم تلقي استجابة من الذكاء الاصطناعي");

      const match = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const rawJson = match ? match[1] : contentText;
      const parsed = JSON.parse(rawJson);
      
      setAiReport(parsed);
      toast({ title: "تم تحليل المقابلة بنجاح ✨" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "فشل تحليل المقابلة", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIResult = async () => {
    if (!interviewId || !aiReport) return;
    setAiSaving(true);
    try {
      const summaryText = `--- تقييم الذكاء الاصطناعي للمقابلة ---
التوصية: ${aiReport.recommendation}
التقييم العام: ${aiReport.score}/100

الملخص:
${aiReport.summary}

نقاط القوة:
${aiReport.strengths?.map((s: string) => `- ${s}`).join("\n")}

نقاط الضعف:
${aiReport.weaknesses?.map((w: string) => `- ${w}`).join("\n")}

مهارات التواصل:
${aiReport.communication}`;

      const { error } = await supabase
        .from("interviews")
        .update({
          notes: summaryText,
          rating: Math.round(aiReport.score / 20)
        })
        .eq("id", interviewId);

      if (error) throw error;
      toast({ title: "تم حفظ التحليل الذكي وتحديث تقييم المرشح بنجاح ✅" });
    } catch (e: any) {
      toast({ title: "فشل حفظ التحليل", description: e.message, variant: "destructive" });
    } finally {
      setAiSaving(false);
    }
  };

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [speech.transcript, speech.interimTranscript]);

  const jitsiDomain = "meet.jit.si";
  const roomName = roomId || `tawzeef-x-interview-${Date.now()}`;
  const jitsiUrl = `https://${jitsiDomain}/${roomName}#config.prejoinConfig.enabled=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.DEFAULT_BACKGROUND="#1a1a2e"`;

  const shareLink = `${window.location.origin}/meeting/${roomName}${candidateName ? `?name=${encodeURIComponent(candidateName)}&position=${encodeURIComponent(position)}` : ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "تم نسخ رابط المقابلة ✅" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartRecording = () => {
    recorder.start();
    speech.start("ar-SA");
  };

  const handleStopRecording = () => {
    recorder.stop();
    speech.stop();
  };

  const handleSave = async () => {
    if (!user || !interviewId) {
      toast({ title: "لا يمكن الحفظ", description: "لم يتم تحديد المقابلة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updates: any = {};

      // Save transcript
      if (speech.transcript.trim()) {
        updates.transcript = speech.transcript.trim();
      }

      // Upload recording
      if (recorder.audioBlob) {
        const ext = recorder.audioBlob.type.includes("webm") ? "webm" : "mp4";
        const filePath = `${user.id}/${interviewId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("interview-recordings")
          .upload(filePath, recorder.audioBlob, { upsert: true });
        if (uploadErr) throw uploadErr;
        updates.recording_url = filePath;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("interviews").update(updates as any).eq("id", interviewId);
        if (error) throw error;
        toast({ title: "تم حفظ التسجيل والنسخ النصي ✅" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTranscript = () => {
    if (!speech.transcript) return;
    const blob = new Blob([speech.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${candidateName || roomName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEndMeeting = () => {
    if (recorder.isRecording) handleStopRecording();
    navigate("/interviews");
  };

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border shrink-0"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              مقابلة أونلاين
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block ml-1 animate-pulse" />
                مباشر
              </Badge>
            </h1>
            {candidateName && (
              <p className="text-xs text-muted-foreground">{candidateName} — {position}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recording Controls */}
          {!recorder.isRecording ? (
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleStartRecording}
            >
              <CircleDot className="w-3.5 h-3.5" />
              بدء التسجيل
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-destructive/50 text-destructive"
              onClick={handleStopRecording}
            >
              <Square className="w-3 h-3 fill-destructive" />
              إيقاف
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 animate-pulse mr-1">
                {formatDuration(recorder.duration)}
              </Badge>
            </Button>
          )}

          {/* Transcript toggle */}
          <Button
            size="sm"
            variant={showTranscript ? "default" : "outline"}
            className="text-xs gap-1.5"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <FileText className="w-3.5 h-3.5" />
            النسخ النصي
          </Button>

          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open(jitsiUrl, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleEndMeeting}>
            <PhoneOff className="w-3.5 h-3.5" />
            إنهاء
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full mb-4"
              />
              <p className="text-sm text-muted-foreground">جاري تحميل غرفة المقابلة...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={jitsiUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            onLoad={() => setIsLoaded(true)}
          />

          {/* Live caption overlay */}
          <AnimatePresence>
            {speech.isListening && (speech.interimTranscript || speech.transcript) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-md border border-border rounded-xl px-4 py-3 max-w-2xl mx-auto shadow-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium">نسخ مباشر</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed" dir="rtl">
                  {speech.interimTranscript && (
                    <span className="text-muted-foreground">{speech.interimTranscript}</span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced Multi-Tab Interactive Sidebar */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-r border-border bg-card flex flex-col overflow-hidden shrink-0"
            >
              {/* Sidebar Tabs (4 tabs) */}
              <div className="flex border-b border-border bg-muted/30 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSidebarTab("transcript")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-[11px] font-bold border-b-2 transition-all flex items-center justify-center gap-1 shrink-0",
                    sidebarTab === "transcript"
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3 h-3" />
                  النسخ 🎙️
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("scorecard")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-[11px] font-bold border-b-2 transition-all flex items-center justify-center gap-1 shrink-0",
                    sidebarTab === "scorecard"
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Star className="w-3 h-3" />
                  التقييم 📝
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("questions")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-[11px] font-bold border-b-2 transition-all flex items-center justify-center gap-1 shrink-0",
                    sidebarTab === "questions"
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <HelpCircle className="w-3 h-3" />
                  الأسئلة ❓
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("ai")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-[11px] font-bold border-b-2 transition-all flex items-center justify-center gap-1 shrink-0",
                    sidebarTab === "ai"
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Brain className="w-3 h-3" />
                  الذكاء ✨
                </button>
              </div>

              {/* 1. Live Transcript Tab */}
              {sidebarTab === "transcript" && (
                <>
                  <div className="p-3 border-b border-border flex items-center justify-between bg-card">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      محتوى النسخ النصي المباشر
                    </h3>
                    <div className="flex items-center gap-1">
                      {speech.transcript && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownloadTranscript} title="تحميل">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          {interviewId && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={saving} title="حفظ">
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm leading-relaxed" dir="rtl">
                    {!speech.transcript && !speech.isListening ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                        <Mic className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-xs">اضغط "بدء التسجيل" لبدء النسخ النصي المباشر</p>
                      </div>
                    ) : (
                      <>
                        {speech.transcript && (
                          <p className="text-foreground whitespace-pre-wrap">{speech.transcript}</p>
                        )}
                        {speech.interimTranscript && (
                          <p className="text-muted-foreground italic">{speech.interimTranscript}</p>
                        )}
                        <div ref={transcriptEndRef} />
                      </>
                    )}
                  </div>
                  {speech.isListening && (
                    <div className="p-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      جاري الاستماع والنسخ...
                    </div>
                  )}
                </>
              )}

              {/* 2. Live Scorecard Rubric Tab */}
              {sidebarTab === "scorecard" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" dir="rtl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        بطاقة التقييم اللحظية
                      </h3>
                      <p className="text-[10px] text-muted-foreground">قيّم المرشح أثناء حديثه لحساب النتيجة آلياً</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintEvaluationReport}
                      className="h-7 text-[10px] font-bold gap-1 rounded-lg"
                      title="طباعة تقرير المقابلة الشامل"
                    >
                      <Printer className="w-3 h-3" />
                      طباعة
                    </Button>
                  </div>

                  {/* Total Score Meter */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold block">الدرجة الكلية الموزونة</span>
                      <span className="text-2xl font-black font-mono text-primary">{totalRubricScore}%</span>
                    </div>
                    <Badge className={cn(
                      "font-bold text-xs py-1 px-3",
                      scorecardRecommendation === "strong_hire" ? "bg-emerald-600 text-white" :
                      scorecardRecommendation === "hire" ? "bg-green-600 text-white" :
                      scorecardRecommendation === "maybe" ? "bg-amber-600 text-white" : "bg-red-600 text-white"
                    )}>
                      {scorecardRecommendation === "strong_hire" ? "موصى به بقوة ⭐" :
                       scorecardRecommendation === "hire" ? "مقبول ✓" :
                       scorecardRecommendation === "maybe" ? "قيد الانتظار ⏸️" : "غير ملائم ❌"}
                    </Badge>
                  </div>

                  {/* Rubric Criteria with Star Selection */}
                  <div className="space-y-3">
                    {[
                      { key: "technical", label: "المهارات الفنية والتخصصية", desc: "الإلمام بالمعرفة والخبرة العملية والأدوات" },
                      { key: "communication", label: "التواصل والحضور والثقة", desc: "وضوح الحديث، لغة الجسد، والإقناع" },
                      { key: "problemSolving", label: "حل المشكلات والتفكير النقدي", desc: "التعامل مع التحديات وإدارة الأزمات" },
                      { key: "cultureFit", label: "التوافق الثقافي والدافعية", desc: "الشغف، الالتزام، والانسجام مع الفريق" },
                    ].map((crit) => {
                      const score = (rubricScores as any)[crit.key];
                      return (
                        <div key={crit.key} className="p-3 rounded-xl bg-card border border-border/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">{crit.label}</span>
                            <span className="text-xs font-mono font-bold text-primary">{score} / 5</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{crit.desc}</p>
                          <div className="flex items-center gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRubricScores((prev) => ({ ...prev, [crit.key]: star }))}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star className={cn("w-4 h-4", star <= score ? "fill-amber-400 text-amber-400" : "text-border")} />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommendation Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground">التوصية النهائية للمرشح:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "strong_hire", label: "موصى به بقوة ⭐" },
                        { id: "hire", label: "مقبول ✓" },
                        { id: "maybe", label: "قيد الانتظار ⏸️" },
                        { id: "no_hire", label: "غير ملائم ❌" },
                      ].map((rec) => (
                        <Button
                          key={rec.id}
                          type="button"
                          variant={scorecardRecommendation === rec.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setScorecardRecommendation(rec.id as any)}
                          className={cn(
                            "h-8 text-[10px] font-bold rounded-xl",
                            scorecardRecommendation === rec.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          {rec.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground">ملاحظات المقيم الخاصة:</label>
                    <Textarea
                      value={scorecardNotes}
                      onChange={(e) => setScorecardNotes(e.target.value)}
                      placeholder="سجّل انطباعاتك وملاحظاتك أثناء إجابة المرشح..."
                      rows={3}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    type="button"
                    onClick={handleSaveScorecard}
                    disabled={scorecardSaving}
                    className="w-full h-9 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-sm"
                  >
                    {scorecardSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    حفظ التقييم واعتماد النتيجة
                  </Button>
                </div>
              )}

              {/* 3. Live Question Bank Tab */}
              {sidebarTab === "questions" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" dir="rtl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        أسئلة المقابلة المقترحة
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {askedQuestions.length} من {questionsList.length} تم طرحها
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateAIQuestions}
                      disabled={generatingCustomQs}
                      className="h-7 text-[10px] font-bold gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {generatingCustomQs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      توليد AI
                    </Button>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-2.5">
                    {questionsList.map((q, idx) => {
                      const isAsked = askedQuestions.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          className={cn(
                            "p-3 rounded-2xl border transition-all space-y-2",
                            isAsked ? "bg-muted/50 border-border/40 opacity-70" : "bg-card border-border/70 hover:border-primary/30 shadow-xs"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleQuestionAsked(q.id)}
                              className="flex items-center gap-2 text-right flex-1"
                            >
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                isAsked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                              )}>
                                {isAsked && <Check className="w-3 h-3" />}
                              </div>
                              <span className={cn(
                                "text-xs font-bold leading-relaxed",
                                isAsked ? "line-through text-muted-foreground" : "text-foreground"
                              )}>
                                {idx + 1}. {q.question}
                              </span>
                            </button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(q.question);
                                toast({ title: "تم نسخ السؤال ✅" });
                              }}
                              title="نسخ نص السؤال"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40 text-[10px]">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border">
                              {q.category}
                            </Badge>
                            <span className="text-muted-foreground truncate">{q.tip}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. AI Analyst Tab */}
              {sidebarTab === "ai" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4" dir="rtl">
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                      <Brain className="w-12 h-12 text-primary animate-bounce" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold">جاري تحليل المقابلة بالذكاء الاصطناعي...</p>
                        <p className="text-xs text-muted-foreground">قد يستغرق ذلك بضع ثوانٍ لقراءة النص بالكامل وصياغة النتائج</p>
                      </div>
                    </div>
                  ) : !aiReport ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <Brain className="w-16 h-16 text-primary/20" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold">مساعد المقابلات بالذكاء الاصطناعي</h4>
                        <p className="text-xs text-muted-foreground px-4">
                          يقوم المساعد الذكي بتحليل نص المقابلة الشخصية لاستخلاص التوصية ونقاط القوة والضعف والتقييم النهائي.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAIAnalysis}
                        disabled={!speech.transcript.trim() || speech.transcript.length < 20}
                        className="text-xs gap-1.5 font-bold mt-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        تحليل نص المقابلة الآن
                      </Button>
                      {!speech.transcript.trim() && (
                        <p className="text-[10px] text-destructive/80">⚠️ يجب التحدث وتسجيل المقابلة أولاً للحصول على نص كافي للتحليل.</p>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 text-xs"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-primary" />
                          نتيجة التحليل الذكي
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePrintEvaluationReport}
                          className="h-7 text-[10px] font-bold gap-1 rounded-lg"
                        >
                          <Printer className="w-3 h-3" />
                          طباعة التقرير
                        </Button>
                      </div>

                      {/* Score Card */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">الدرجة التقديرية</span>
                          <span className="text-2xl font-black text-primary">{aiReport.score || 0} / 100</span>
                        </div>
                        <Badge 
                          className={cn(
                            "font-bold text-xs py-1 px-3",
                            aiReport.recommendation === "مقبول" ? "bg-green-500 hover:bg-green-600 text-white" :
                            aiReport.recommendation === "مرفوض" ? "bg-red-500 hover:bg-red-600 text-white" :
                            "bg-amber-500 hover:bg-amber-600 text-white"
                          )}
                        >
                          {aiReport.recommendation || "معلق"}
                        </Badge>
                      </div>

                      {/* Summary */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-muted-foreground">ملخص الأداء:</h4>
                        <p className="text-xs leading-relaxed text-foreground/80 bg-muted/30 p-3 rounded-lg border">
                          {aiReport.summary}
                        </p>
                      </div>

                      {/* Strengths */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-green-600">نقاط القوة البارزة:</h4>
                        <ul className="text-xs space-y-1 bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                          {aiReport.strengths?.map((str: string, i: number) => (
                            <li key={i} className="flex gap-1.5 items-start">
                              <span className="text-green-600 font-bold shrink-0">✓</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-red-600">فجوات ونقاط ضعف:</h4>
                        <ul className="text-xs space-y-1 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                          {aiReport.weaknesses?.map((weak: string, i: number) => (
                            <li key={i} className="flex gap-1.5 items-start">
                              <span className="text-red-600 font-bold shrink-0">•</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Communication */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-muted-foreground">مهارات التواصل واللغة:</h4>
                        <p className="text-xs leading-relaxed text-foreground/80 bg-muted/30 p-3 rounded-lg border">
                          {aiReport.communication}
                        </p>
                      </div>

                      {/* Save Action */}
                      <Button
                        type="button"
                        onClick={handleSaveAIResult}
                        disabled={aiSaving}
                        className="w-full text-xs gap-1.5 font-bold mt-2"
                      >
                        {aiSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        اعتماد النتيجة وتحديث تقييم المرشح
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
