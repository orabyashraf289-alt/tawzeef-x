import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/getPublicUrl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, ArrowLeft, Loader2, Send, FileText, Copy, Video, Calendar, Link2, ExternalLink, RefreshCw, XCircle, Mail, MessageCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useOffers, useCreateOffer, useSendOffer } from "@/hooks/useOffers";
import { useInterviews, useAddInterview, useUpdateInterview, useCancelInterview } from "@/hooks/useJobs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useActiveStages } from "@/hooks/usePipelineStages";

const FALLBACK_STAGES = [
  "تقديم الطلب",
  "مراجعة السيرة",
  "فحص هاتفي",
  "مقابلة تقنية",
  "مقابلة نهائية",
  "العرض الوظيفي",
];

const INTERVIEW_STAGES = ["مقابلة تقنية", "مقابلة نهائية"];

function generateRoomId() {
  return `tawzeef-x-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface StageActionsProps {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string | null;
  currentStage: string;
  status: string;
  jobId?: string | null;
  candidateRole?: string | null;
}

export default function StageActions({ candidateId, candidateName, candidateEmail, currentStage, status, jobId, candidateRole }: StageActionsProps) {
  const queryClient = useQueryClient();
  const activeStages = useActiveStages();
  const STAGES = activeStages.length > 0 ? activeStages.map(s => s.name) : FALLBACK_STAGES;
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Interview scheduling
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    date: "",
    time: "",
    interviewer: "",
    meeting_type: "jitsi" as "jitsi" | "external",
    external_link: "",
  });
  const addInterview = useAddInterview();
  const updateInterview = useUpdateInterview();
  const cancelInterview = useCancelInterview();
  const { data: interviews } = useInterviews();
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "", interviewer: "" });

  // Offers
  const { data: offers } = useOffers();
  const createOffer = useCreateOffer();
  const sendOffer = useSendOffer();

  // Offer creation dialog
  const [showOfferCreateDialog, setShowOfferCreateDialog] = useState(false);
  const [offerForm, setOfferForm] = useState({
    position: candidateRole || "",
    department: "",
    salary: "",
    currency: "SAR",
    start_date: "",
    offer_type: "full-time",
    benefits: "",
    additional_terms: "",
    expires_days: "7",
  });

  const candidateInterview = (interviews || []).find(
    i => i.candidate_id === candidateId && i.status === "مجدولة"
  ) || (interviews || []).find(
    i => i.candidate_id === candidateId
  );

  const currentIdx = STAGES.indexOf(currentStage);
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const isRejected = status === "مرفوض";
  const isAccepted = status === "مقبول";
  const isLastStage = currentIdx === STAGES.length - 1;
  const isInterviewStage =
    INTERVIEW_STAGES.includes(currentStage) ||
    /مقابلة|interview|فحص|فنية|فني|شخصية|تقنية|مبدئي/i.test(currentStage) ||
    !!(activeStages.find(s => s.name === currentStage)?.transition_rules?.require_interview) ||
    !!candidateInterview;

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
    sent: { label: "مُرسل", color: "bg-primary/10 text-primary" },
    viewed: { label: "تم العرض", color: "bg-warning/10 text-warning" },
    accepted: { label: "مقبول", color: "bg-success/10 text-success" },
    rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
  };

  const triggerAIEvaluation = async () => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-candidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ candidateId, jobId }),
      });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "تم تشغيل التقييم الذكي تلقائياً ✅" });
    } catch {
      // silent fail
    }
  };

  const updateCandidateStatus = async (newStatus: string) => {
    await supabase
      .from("candidates")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", candidateId);
    await queryClient.invalidateQueries({ queryKey: ["candidates"] });
  };

  const handleCreateAndSendOffer = async () => {
    if (!offerForm.position || !offerForm.salary) {
      toast({ title: "خطأ", description: "يرجى إدخال المسمى الوظيفي والراتب", variant: "destructive" });
      return;
    }
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(offerForm.expires_days));
      const result = await createOffer.mutateAsync({
        candidate_id: candidateId,
        job_id: jobId || undefined,
        position: offerForm.position,
        department: offerForm.department || undefined,
        salary: parseFloat(offerForm.salary),
        currency: offerForm.currency,
        start_date: offerForm.start_date || undefined,
        offer_type: offerForm.offer_type,
        benefits: offerForm.benefits ? offerForm.benefits.split("\n").filter(Boolean) : undefined,
        additional_terms: offerForm.additional_terms || undefined,
        expires_at: expiresAt.toISOString(),
      });
      await sendOffer.mutateAsync(result.id);
      await updateCandidateStatus("مكتمل");
      setShowOfferCreateDialog(false);
      triggerAIEvaluation();
    } catch {
      // errors handled by mutation hooks
    }
  };

  const handleSendExistingOffer = async () => {
    if (!candidateOffer) return;
    await sendOffer.mutateAsync(candidateOffer.id);
    await updateCandidateStatus("مكتمل");
    triggerAIEvaluation();
  };

  const sendInterviewEmail = async (email: string, meetingUrl: string, date: string, time: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Build ICS invite file content
      const pad = (num: number) => String(num).padStart(2, "0");
      const dt = new Date(`${date}T${time.slice(0, 5)}:00`);
      
      let startStr = "";
      let endStr = "";
      if (!isNaN(dt.getTime())) {
        startStr = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
        const endDt = new Date(dt.getTime() + 60 * 60000); // Default 60 mins duration
        endStr = `${endDt.getFullYear()}${pad(endDt.getMonth() + 1)}${pad(endDt.getDate())}T${pad(endDt.getHours())}${pad(endDt.getMinutes())}00`;
      } else {
        const cleanDate = date.replace(/-/g, "");
        const cleanTime = time.replace(/:/g, "").slice(0, 4);
        startStr = `${cleanDate}T${cleanTime}00`;
        endStr = `${cleanDate}T${String(Number(cleanTime) + 100).padStart(4, "0")}00`;
      }
      
      const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@tawzeef-x`;
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tawzeef-X//Interview//AR",
        "BEGIN:VEVENT",
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:مقابلة شخصية - ${candidateRole || "وظيفة"}`,
        `DESCRIPTION:دعوة لحضور مقابلة بخصوص وظيفة ${candidateRole || ""}. رابط اللقاء: ${meetingUrl}`,
        `LOCATION:${meetingUrl}`,
        `UID:${uid}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `دعوة لحضور مقابلة — ${candidateRole || "وظيفة"}`,
          user_id: user?.id,
          html: `
            <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
              <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 24px 32px; border-radius: 12px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">دعوة لحضور مقابلة 🎯</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b; margin-bottom: 8px;">مرحباً،</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.8;">يسعدنا إعلامك بأنه تمت جدولة مقابلة بخصوص وظيفة <strong>${candidateRole || ""}</strong>.</p>
                <div style="background: #f1f5f9; padding: 16px 20px; border-radius: 10px; margin: 20px 0;">
                  <p style="margin: 4px 0; font-size: 14px; color: #334155;">📅 <strong>التاريخ:</strong> ${new Date(date).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #334155;">⏰ <strong>الوقت:</strong> ${time}</p>
                </div>
                <a href="${meetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: bold; margin-top: 12px;">
                  🎥 انضم للمقابلة
                </a>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">تم إرفاق ملف التقويم (invite.ics) لإضافته لتقويمك الشخصي مباشرة.</p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">أو انسخ الرابط التالي:</p>
                <p style="font-size: 12px; color: #64748b; word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 6px;">${meetingUrl}</p>
              </div>
              <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">بالتوفيق! — فريق التوظيف</p>
            </div>
          `,
          attachments: [
            {
              filename: "invite.ics",
              content: icsContent,
              contentType: "text/calendar",
            }
          ]
        }),
      });
      toast({ title: "تم إرسال رابط المقابلة وملف التقويم بالبريد الإلكتروني ✅" });
    } catch (e) {
      console.error("Failed to send interview email:", e);
    }
  };

  const sendRescheduleEmail = async (email: string, meetingUrl: string, oldDate: string, oldTime: string, newDate: string, newTime: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `تحديث موعد المقابلة — ${candidateRole || "وظيفة"}`,
          user_id: user?.id,
          html: `
            <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
              <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 24px 32px; border-radius: 12px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">تم إعادة جدولة المقابلة 🔄</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b; margin-bottom: 8px;">مرحباً <strong>${candidateName}</strong>،</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.8;">نود إعلامك بأنه تم تعديل موعد المقابلة الخاصة بك.</p>
                <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0; text-decoration: line-through; opacity: 0.7;">
                  <p style="margin: 2px 0; font-size: 13px; color: #92400e;">📅 الموعد السابق: ${new Date(oldDate).toLocaleDateString("ar-SA")} — ${oldTime}</p>
                </div>
                <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; margin: 16px 0; border: 1px solid #bbf7d0;">
                  <p style="margin: 4px 0; font-size: 14px; color: #166534;">📅 <strong>الموعد الجديد:</strong> ${new Date(newDate).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #166534;">⏰ <strong>الوقت:</strong> ${newTime}</p>
                </div>
                ${meetingUrl ? `<a href="${meetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: bold; margin-top: 12px;">🎥 رابط المقابلة</a>` : ""}
              </div>
              <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">بالتوفيق! — فريق التوظيف</p>
            </div>
          `,
        }),
      });
      toast({ title: "تم إرسال إشعار إعادة الجدولة للمرشح ✅" });
    } catch {
      console.error("Failed to send reschedule email");
    }
  };

  const sendCancellationEmail = async (email: string, date: string, time: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `إلغاء موعد المقابلة — ${candidateRole || "وظيفة"}`,
          user_id: user?.id,
          html: `
            <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
              <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 24px 32px; border-radius: 12px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">تم إلغاء المقابلة ❌</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b; margin-bottom: 8px;">مرحباً <strong>${candidateName}</strong>،</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.8;">نعتذر عن إبلاغك بأنه تم إلغاء موعد المقابلة التالي:</p>
                <div style="background: #fef2f2; padding: 16px 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #fecaca;">
                  <p style="margin: 4px 0; font-size: 14px; color: #991b1b;">📅 <strong>التاريخ:</strong> ${new Date(date).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #991b1b;">⏰ <strong>الوقت:</strong> ${time}</p>
                </div>
                <p style="font-size: 15px; color: #475569; line-height: 1.8;">سيتم التواصل معك قريباً بخصوص الخطوات التالية.</p>
              </div>
              <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">شكراً لتفهمك — فريق التوظيف</p>
            </div>
          `,
        }),
      });
      toast({ title: "تم إرسال إشعار الإلغاء للمرشح ✅" });
    } catch {
      console.error("Failed to send cancellation email");
    }
  };

  const handleRescheduleInterview = async () => {
    if (!candidateInterview || !rescheduleForm.date || !rescheduleForm.time) {
      toast({ title: "خطأ", description: "يرجى تحديد التاريخ والوقت الجديدين", variant: "destructive" });
      return;
    }

    const oldDate = candidateInterview.date;
    const oldTime = candidateInterview.time;

    updateInterview.mutate(
      {
        id: candidateInterview.id,
        date: rescheduleForm.date,
        time: rescheduleForm.time,
        interviewer: rescheduleForm.interviewer || candidateInterview.interviewer || undefined,
      },
      {
        onSuccess: () => {
          setShowRescheduleDialog(false);
          setRescheduleForm({ date: "", time: "", interviewer: "" });
          toast({ title: "تم إعادة جدولة المقابلة ✅" });
          queryClient.invalidateQueries({ queryKey: ["interviews"] });

          if (candidateEmail) {
            sendRescheduleEmail(
              candidateEmail,
              candidateInterview.meeting_url || "",
              oldDate,
              oldTime,
              rescheduleForm.date,
              rescheduleForm.time
            );
          }
        },
      }
    );
  };

  const handleCancelInterview = async () => {
    if (!candidateInterview) return;
    
    const date = candidateInterview.date;
    const time = candidateInterview.time;

    cancelInterview.mutate(candidateInterview.id, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        queryClient.invalidateQueries({ queryKey: ["interviews"] });

        if (candidateEmail) {
          sendCancellationEmail(candidateEmail, date, time);
        }
      },
    });
  };

  const handleScheduleInterview = async () => {
    if (!interviewForm.date || !interviewForm.time) {
      toast({ title: "خطأ", description: "يرجى تحديد التاريخ والوقت", variant: "destructive" });
      return;
    }

    let meetingUrl = "";
    if (interviewForm.meeting_type === "jitsi") {
      const roomId = generateRoomId();
      meetingUrl = `${window.location.origin}/meeting/${roomId}?name=${encodeURIComponent(candidateName)}&position=${encodeURIComponent(candidateRole || "")}`;
    } else {
      meetingUrl = interviewForm.external_link;
    }

    addInterview.mutate(
      {
        candidate_name: candidateName,
        position: candidateRole || "غير محدد",
        date: interviewForm.date,
        time: interviewForm.time,
        type: "عن بُعد",
        interviewer: interviewForm.interviewer,
        candidate_id: candidateId,
        meeting_url: meetingUrl,
      },
      {
        onSuccess: async () => {
          setShowInterviewDialog(false);
          setInterviewForm({ date: "", time: "", interviewer: "", meeting_type: "jitsi", external_link: "" });
          queryClient.invalidateQueries({ queryKey: ["interviews"] });

          // Auto-send email to candidate
          if (candidateEmail && meetingUrl) {
            sendInterviewEmail(candidateEmail, meetingUrl, interviewForm.date, interviewForm.time);
          }

          // Auto-send email to coordinator
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email && meetingUrl) {
              sendInterviewEmail(user.email, meetingUrl, interviewForm.date, interviewForm.time);
            }
          } catch (e) {
            console.error("Failed to notify coordinator:", e);
          }
        },
      }
    );
  };

  // Check if interview stage requires a completed/scheduled interview before advancing
  const allCandidateInterviews = (interviews || []).filter(i => i.candidate_id === candidateId);
  const hasCompletedInterview = allCandidateInterviews.some(i => i.status === "مكتملة");
  const hasScheduledInterview = allCandidateInterviews.some(i => i.status === "مجدولة");
  const interviewRequired = isInterviewStage && !hasCompletedInterview;

  const handleApprove = async () => {
    if (!nextStage) return;

    // Gate: interview stages require a completed interview
    if (interviewRequired) {
      if (!hasScheduledInterview && !candidateInterview) {
        toast({
          title: "يجب جدولة مقابلة أولاً",
          description: "لا يمكن الانتقال للمرحلة التالية بدون إجراء مقابلة",
          variant: "destructive",
        });
        return;
      }
      if (hasScheduledInterview || candidateInterview) {
        toast({
          title: "المقابلة لم تكتمل بعد",
          description: "يجب إكمال المقابلة وتقييمها قبل الانتقال للمرحلة التالية",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    setShowApproveConfirm(false);

    try {
      const nowIso = new Date().toISOString();

      // 1. Direct PostgreSQL DB stage update
      const { error: dbErr } = await supabase
        .from("candidates")
        .update({
          stage: nextStage,
          stage_entered_at: nowIso,
          updated_at: nowIso
        })
        .eq("id", candidateId);

      if (dbErr) throw dbErr;

      // 2. Auto-generate Jitsi interview room if advancing to an interview stage
      const isNextInterviewStage = /مقابلة|interview|فحص|فنية|فني|شخصية|تقنية|مبدئي/i.test(nextStage);
      if (isNextInterviewStage) {
        const { data: existingInt } = await supabase
          .from("interviews")
          .select("id")
          .eq("candidate_id", candidateId)
          .maybeSingle();

        if (!existingInt) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split("T")[0];
          const roomId = `tx-room-${candidateId.slice(0, 8)}-${Date.now().toString(36)}`;
          const meetingUrl = `${window.location.origin}/meeting/${roomId}?name=${encodeURIComponent(candidateName)}&position=${encodeURIComponent(candidateRole || "")}`;

          try {
            await supabase.from("interviews").insert({
              candidate_id: candidateId,
              candidate_name: candidateName,
              position: candidateRole || "غير محدد",
              date: dateStr,
              time: "10:00",
              type: "عن بُعد",
              interviewer: user?.email || "فريق التوظيف",
              meeting_url: meetingUrl,
              status: "مجدولة",
            });
          } catch (err) {
            console.warn("Auto interview generation warning:", err);
          }

          await queryClient.invalidateQueries({ queryKey: ["interviews"] });
        }
      }

      // 3. Record stage transition history
      const { data: { user } } = await supabase.auth.getUser();
      try {
        await supabase.from("candidate_stage_transitions").insert({
          candidate_id: candidateId,
          from_stage: currentStage,
          to_stage: nextStage,
          moved_by: user?.id,
          moved_by_name: user?.email,
        });
      } catch (err) {
        console.warn("Failed saving transition history:", err);
      }

      // 4. Trigger email notification via notify-stage-change
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      try {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-stage-change`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ candidateId, newStage: nextStage, action: "approve" }),
          }
        );
      } catch (e) {
        console.warn("notify-stage-change edge function warning:", e);
      }

      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      await queryClient.invalidateQueries({ queryKey: ["interviews"] });

      toast({
        title: isNextInterviewStage ? `تم نقل المرشح وتجهيز رابط مقابلة Jitsi تلقائياً 🎥` : `تم نقل ${candidateName} إلى "${nextStage}" ✅`,
        description: isNextInterviewStage ? `تم إنشاء رابط الاجتماع المباشر وتمكين دخولك أنت والمرشح` : "تم تحديث مرحلة المرشح بنجاح",
      });

      // If advanced to offer stage, open offer creation dialog
      if (nextStage === "العرض الوظيفي") {
        setOfferForm(prev => ({ ...prev, position: candidateRole || "" }));
        setShowOfferCreateDialog(true);
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل في تحديث المرحلة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setShowRejectDialog(false);

    try {
      const nowIso = new Date().toISOString();

      // 1. Direct PostgreSQL DB status update
      const { error: dbErr } = await supabase
        .from("candidates")
        .update({
          status: "مرفوض",
          notes: rejectionReason ? `سبب الرفض: ${rejectionReason}` : undefined,
          updated_at: nowIso
        })
        .eq("id", candidateId);

      if (dbErr) throw dbErr;

      const { data: { user } } = await supabase.auth.getUser();
      try {
        await supabase.from("candidate_stage_transitions").insert({
          candidate_id: candidateId,
          from_stage: currentStage,
          to_stage: "مرفوض",
          moved_by: user?.id,
          moved_by_name: user?.email,
          notes: rejectionReason || "رفض المرشح",
        });
      } catch (err) {
        console.warn("Failed saving rejection transition history:", err);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      try {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-stage-change`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              candidateId,
              action: "reject",
              rejectionReason: rejectionReason.trim() || undefined,
            }),
          }
        );
      } catch (e) {
        console.warn("notify-stage-change edge function warning:", e);
      }

      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });

      toast({
        title: `تم رفض ${candidateName}`,
        description: rejectionReason || "تم تحديث حالة المرشح إلى مرفوض",
        variant: "destructive",
      });
      setRejectionReason("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل في رفض المرشح", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (isRejected) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center">
        <X className="w-6 h-6 text-destructive mx-auto mb-2" />
        <p className="text-sm font-semibold text-destructive">تم رفض هذا المرشح</p>
      </div>
    );
  }

  if ((isAccepted || status === "مكتمل") && isLastStage) {
    const offerStatus = candidateOffer ? STATUS_LABELS[candidateOffer.status] || { label: candidateOffer.status, color: "bg-muted text-muted-foreground" } : null;
    const offerLink = candidateOffer ? `${getPublicBaseUrl()}/offer/${candidateOffer.token}` : null;
    const isSending = createOffer.isPending || sendOffer.isPending;

    return (
      <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-5 space-y-4"
      >
        <h3 className="font-display font-bold flex items-center gap-2">
          <span className="w-1 h-5 rounded-full gradient-primary" />
          العرض الوظيفي
        </h3>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-center">
          <Check className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-sm font-semibold text-success">تم قبول المرشح ✅</p>
        </div>

        {candidateOffer ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">حالة العرض</span>
              <Badge className={cn("text-xs", offerStatus?.color)}>{offerStatus?.label}</Badge>
            </div>

            {candidateOffer.status === "draft" && (
              <Button
                className="w-full gradient-primary border-0 text-primary-foreground gap-2"
                onClick={handleSendExistingOffer}
                disabled={isSending}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال العرض
              </Button>
            )}

            {offerLink && candidateOffer.status !== "draft" && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(offerLink);
                    toast({ title: "تم نسخ رابط العرض ✅" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                  نسخ رابط العرض
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => {
                      const text = `مرحباً، تم إرسال عرض وظيفي لك للمنصب: ${candidateOffer.position}\nيرجى مراجعة التفاصيل عبر الرابط التالي:\n${offerLink}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    واتساب
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => {
                      const subject = `عرض وظيفي - ${candidateOffer.position}`;
                      const body = `مرحباً،\n\nتم إرسال عرض وظيفي لك للمنصب: ${candidateOffer.position}\n\nيرجى مراجعة التفاصيل والرد عبر الرابط التالي:\n${offerLink}\n\nمع تحيات فريق التوظيف`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
                    }}
                  >
                    <Mail className="w-4 h-4" />
                    بريد إلكتروني
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => {
                      const text = `مرحباً، تم إرسال عرض وظيفي لك للمنصب: ${candidateOffer.position}\nيرجى مراجعة التفاصيل عبر الرابط التالي:\n${offerLink}`;
                      window.open(`sms:?body=${encodeURIComponent(text)}`);
                    }}
                  >
                    <Smartphone className="w-4 h-4" />
                    SMS
                  </Button>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full gap-2" asChild>
              <Link to="/offers">
                <FileText className="w-4 h-4" />
                عرض التفاصيل في صفحة العروض
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            className="w-full gradient-primary border-0 text-primary-foreground gap-2"
            onClick={() => {
              setOfferForm(prev => ({ ...prev, position: candidateRole || "" }));
              setShowOfferCreateDialog(true);
            }}
          >
            <Send className="w-4 h-4" />
            إنشاء وإرسال العرض الوظيفي
          </Button>
        )}
      </motion.div>

      {/* Offer Creation Dialog */}
      <Dialog open={showOfferCreateDialog} onOpenChange={setShowOfferCreateDialog}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              إنشاء عرض وظيفي — {candidateName}
            </DialogTitle>
            <DialogDescription>
              أدخل تفاصيل العرض الوظيفي وسيتم إرساله مباشرة للمرشح
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">المسمى الوظيفي *</Label>
                <Input
                  value={offerForm.position}
                  onChange={(e) => setOfferForm({ ...offerForm, position: e.target.value })}
                  placeholder="مثال: مهندس برمجيات"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">القسم</Label>
                <Input
                  value={offerForm.department}
                  onChange={(e) => setOfferForm({ ...offerForm, department: e.target.value })}
                  placeholder="مثال: تقنية المعلومات"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">الراتب *</Label>
                <Input
                  type="number"
                  value={offerForm.salary}
                  onChange={(e) => setOfferForm({ ...offerForm, salary: e.target.value })}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">العملة</Label>
                <Select value={offerForm.currency} onValueChange={(v) => setOfferForm({ ...offerForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">يورو</SelectItem>
                    <SelectItem value="AED">درهم إماراتي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">نوع العقد</Label>
                <Select value={offerForm.offer_type} onValueChange={(v) => setOfferForm({ ...offerForm, offer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">دوام كامل</SelectItem>
                    <SelectItem value="part-time">دوام جزئي</SelectItem>
                    <SelectItem value="contract">عقد مؤقت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">تاريخ البدء</Label>
                <Input
                  type="date"
                  value={offerForm.start_date}
                  onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">صلاحية العرض</Label>
                <Select value={offerForm.expires_days} onValueChange={(v) => setOfferForm({ ...offerForm, expires_days: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 أيام</SelectItem>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="14">14 يوم</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">المزايا والبدلات</Label>
              <Textarea
                value={offerForm.benefits}
                onChange={(e) => setOfferForm({ ...offerForm, benefits: e.target.value })}
                placeholder="ميزة واحدة في كل سطر مثل: تأمين طبي، بدل سكن..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">شروط إضافية</Label>
              <Textarea
                value={offerForm.additional_terms}
                onChange={(e) => setOfferForm({ ...offerForm, additional_terms: e.target.value })}
                placeholder="أي شروط إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="gradient-primary border-0 text-primary-foreground gap-2"
              onClick={handleCreateAndSendOffer}
              disabled={createOffer.isPending || sendOffer.isPending}
            >
              {(createOffer.isPending || sendOffer.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إنشاء وإرسال العرض الوظيفي
            </Button>
            <Button variant="outline" onClick={() => setShowOfferCreateDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-5 space-y-4"
      >
        <h3 className="font-display font-bold flex items-center gap-2">
          <span className="w-1 h-5 rounded-full gradient-primary" />
          إجراءات المرحلة
        </h3>

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">المرحلة الحالية</p>
          <p className="text-sm font-semibold text-foreground">{currentStage}</p>
          {nextStage && (
            <>
              <p className="text-xs text-muted-foreground mt-2 mb-1">المرحلة التالية</p>
              <p className="text-sm font-semibold text-primary">{nextStage}</p>
            </>
          )}
        </div>

        {/* Interview section for interview stages */}
        {isInterviewStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            {candidateInterview ? (
              <div className="bg-gradient-to-br from-info/10 via-background to-primary/5 border border-info/30 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-info/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground block">تفاصيل الاجتماع</span>
                      <span className="text-[11px] text-muted-foreground">
                        {candidateInterview.status === "مكتملة" ? "تم إجراء المقابلة" : "مقابلة قادمة"}
                      </span>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-medium px-2 py-0.5",
                    candidateInterview.meeting_url?.includes("jitsi") || candidateInterview.meeting_url?.includes("/meeting/")
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                      : "bg-info/10 text-info border-info/20"
                  )}>
                    {candidateInterview.meeting_url?.includes("jitsi") || candidateInterview.meeting_url?.includes("/meeting/")
                      ? "🎥 Jitsi Meet"
                      : "🔗 رابط خارجي"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">التاريخ والوقت</span>
                    <span className="font-semibold text-foreground">
                      {new Date(candidateInterview.date).toLocaleDateString("ar-SA")} — {candidateInterview.time}
                    </span>
                  </div>
                  {candidateInterview.interviewer && (
                    <div>
                      <span className="text-muted-foreground block text-[10px]">المحاور</span>
                      <span className="font-semibold text-foreground">{candidateInterview.interviewer}</span>
                    </div>
                  )}
                </div>

                {candidateInterview.meeting_url && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs h-9 border-info/30 hover:bg-info/5"
                        onClick={() => {
                          navigator.clipboard.writeText(candidateInterview.meeting_url!);
                          toast({ title: "تم نسخ رابط المقابلة ✅" });
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 text-info" />
                        نسخ الرابط
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs h-9 gradient-primary border-0 text-primary-foreground font-bold shadow"
                        asChild
                      >
                        <a href={candidateInterview.meeting_url} target="_blank" rel="noopener noreferrer">
                          <Video className="w-3.5 h-3.5" />
                          دخول المقابلة 🎥
                        </a>
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-[11px] h-7 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-950/30"
                        onClick={() => {
                          const text = `مرحباً ${candidateName}، تم تحديث موعد المقابلة بتاريخ ${new Date(candidateInterview.date).toLocaleDateString("ar-SA")} الساعة ${candidateInterview.time}.\nرابط الاجتماع: ${candidateInterview.meeting_url}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-[11px] h-7 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/40 dark:hover:bg-blue-950/30"
                        onClick={() => {
                          const subject = `دعوة اجتماع مقابلة — ${candidateRole || ""}`;
                          const body = `مرحباً ${candidateName}،\n\nنود تذكيرك بموعد المقابلة بتاريخ ${new Date(candidateInterview.date).toLocaleDateString("ar-SA")} الساعة ${candidateInterview.time}.\n\nرابط الاجتماع المباشر:\n${candidateInterview.meeting_url}\n\nتحياتنا،`;
                          window.open(`mailto:${candidateEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
                        }}
                      >
                        <Mail className="w-3 h-3" />
                        بريد إلكتروني
                      </Button>
                    </div>
                  </div>
                )}

                {/* Complete Interview button */}
                {candidateInterview.status !== "مكتملة" ? (
                  <Button
                    size="sm"
                    className="w-full gap-1.5 text-xs h-9 bg-success hover:bg-success/90 text-success-foreground font-bold shadow-sm"
                    onClick={async () => {
                      await supabase
                        .from("interviews")
                        .update({ status: "مكتملة", updated_at: new Date().toISOString() })
                        .eq("id", candidateInterview.id);
                      await queryClient.invalidateQueries({ queryKey: ["interviews"] });
                      toast({ title: "تم تسجيل إكمال المقابلة ✅", description: "يمكنك الآن نقل المرشح للمرحلة التالية" });
                    }}
                  >
                    <Check className="w-4 h-4" />
                    تأكيد إكمال المقابلة
                  </Button>
                ) : (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-2 text-center text-xs font-semibold text-success flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    تمت المقابلة بنجاح
                  </div>
                )}

                {/* Reschedule & Cancel buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs h-8 border-warning/30 text-warning hover:bg-warning/5"
                    onClick={() => {
                      setRescheduleForm({
                        date: candidateInterview.date,
                        time: candidateInterview.time,
                        interviewer: candidateInterview.interviewer || "",
                      });
                      setShowRescheduleDialog(true);
                    }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    إعادة جدولة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/5"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <XCircle className="w-3 h-3" />
                    إلغاء المقابلة
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 border-info/40 text-info hover:bg-info/10 font-bold h-10 shadow-sm"
                onClick={() => setShowInterviewDialog(true)}
              >
                <Video className="w-4 h-4 text-primary" />
                جدولة مقابلة تفاعلية 🎥 (Jitsi Meet / Zoom)
              </Button>
            )}
          </motion.div>
        )}

        {/* Interview gate warning */}
        {isInterviewStage && interviewRequired && (
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
            <p className="text-xs text-warning font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {!hasScheduledInterview && !candidateInterview
                ? "يجب جدولة مقابلة قبل الانتقال للمرحلة التالية"
                : "يجب إكمال المقابلة قبل الانتقال للمرحلة التالية"}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {nextStage && (
            <Button
              className={cn("flex-1 gap-2", interviewRequired ? "bg-muted text-muted-foreground hover:bg-muted/80" : "gradient-primary border-0 text-primary-foreground")}
              onClick={() => interviewRequired ? handleApprove() : setShowApproveConfirm(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              نقل للمرحلة التالية
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
          >
            <X className="w-4 h-4" />
            رفض
          </Button>
        </div>
      </motion.div>

      {/* Approve Confirmation */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد نقل المرشح</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد نقل <strong>{candidateName}</strong> من "{currentStage}" إلى "{nextStage}"؟
              {nextStage === "العرض الوظيفي" && (
                <span className="block mt-2 text-success font-medium">
                  سيتم تحديث حالة المرشح إلى "مقبول" تلقائياً.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleApprove} className="gradient-primary border-0 text-primary-foreground">
              تأكيد النقل
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رفض المرشح</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رفض <strong>{candidateName}</strong>؟ يمكنك إضافة سبب الرفض.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="سبب الرفض (اختياري)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              تأكيد الرفض
            </Button>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              جدولة مقابلة — {candidateName}
            </DialogTitle>
            <DialogDescription>
              حدد تفاصيل المقابلة وسيتم إنشاء رابط اجتماع تلقائياً
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">التاريخ *</Label>
                <Input
                  type="date"
                  value={interviewForm.date}
                  onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">الوقت *</Label>
                <Input
                  type="time"
                  value={interviewForm.time}
                  onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">اسم المحاور</Label>
              <Input
                placeholder="اسم المحاور (اختياري)"
                value={interviewForm.interviewer}
                onChange={e => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">نوع الاجتماع</Label>
              <Select
                value={interviewForm.meeting_type}
                onValueChange={(v: "jitsi" | "external") => setInterviewForm({ ...interviewForm, meeting_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jitsi">
                    <span className="flex items-center gap-2">
                      <Video className="w-3.5 h-3.5" />
                      غرفة فيديو مدمجة (Jitsi)
                    </span>
                  </SelectItem>
                  <SelectItem value="external">
                    <span className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5" />
                      رابط خارجي (Zoom / Meet)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {interviewForm.meeting_type === "jitsi" && (
              <div className="bg-info/5 border border-info/15 rounded-lg p-3">
                <p className="text-xs text-info font-medium flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  سيتم إنشاء غرفة فيديو مدمجة تلقائياً مع رابط مباشر
                </p>
              </div>
            )}

            {interviewForm.meeting_type === "external" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">رابط الاجتماع</Label>
                <Input
                  placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
                  value={interviewForm.external_link}
                  onChange={e => setInterviewForm({ ...interviewForm, external_link: e.target.value })}
                  dir="ltr"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="gradient-primary border-0 text-primary-foreground gap-2"
              onClick={handleScheduleInterview}
              disabled={addInterview.isPending}
            >
              {addInterview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              جدولة المقابلة
            </Button>
            <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Interview Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-warning" />
              إعادة جدولة المقابلة — {candidateName}
            </DialogTitle>
            <DialogDescription>
              حدد الموعد الجديد وسيتم إشعار المرشح تلقائياً بالتغيير
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">التاريخ الجديد *</Label>
                <Input
                  type="date"
                  value={rescheduleForm.date}
                  onChange={e => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">الوقت الجديد *</Label>
                <Input
                  type="time"
                  value={rescheduleForm.time}
                  onChange={e => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">اسم المحاور</Label>
              <Input
                placeholder="اسم المحاور (اختياري)"
                value={rescheduleForm.interviewer}
                onChange={e => setRescheduleForm({ ...rescheduleForm, interviewer: e.target.value })}
              />
            </div>

            {candidateEmail && (
              <div className="bg-warning/5 border border-warning/15 rounded-lg p-3">
                <p className="text-xs text-warning font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  سيتم إرسال إشعار تلقائي للمرشح على {candidateEmail}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={handleRescheduleInterview}
              disabled={updateInterview.isPending}
            >
              {updateInterview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              تأكيد إعادة الجدولة
            </Button>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Interview Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء المقابلة</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إلغاء المقابلة المجدولة مع <strong>{candidateName}</strong>؟
              {candidateEmail && (
                <span className="block mt-2 text-warning font-medium">
                  سيتم إرسال إشعار إلغاء تلقائي للمرشح.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleCancelInterview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelInterview.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              تأكيد الإلغاء
            </AlertDialogAction>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offer Creation Dialog */}
      <Dialog open={showOfferCreateDialog} onOpenChange={setShowOfferCreateDialog}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              إنشاء عرض وظيفي — {candidateName}
            </DialogTitle>
            <DialogDescription>
              أدخل تفاصيل العرض الوظيفي وسيتم إرساله مباشرة للمرشح
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">المسمى الوظيفي *</Label>
                <Input
                  value={offerForm.position}
                  onChange={(e) => setOfferForm({ ...offerForm, position: e.target.value })}
                  placeholder="مثال: مهندس برمجيات"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">القسم</Label>
                <Input
                  value={offerForm.department}
                  onChange={(e) => setOfferForm({ ...offerForm, department: e.target.value })}
                  placeholder="مثال: تقنية المعلومات"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">الراتب *</Label>
                <Input
                  type="number"
                  value={offerForm.salary}
                  onChange={(e) => setOfferForm({ ...offerForm, salary: e.target.value })}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">العملة</Label>
                <Select value={offerForm.currency} onValueChange={(v) => setOfferForm({ ...offerForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">يورو</SelectItem>
                    <SelectItem value="AED">درهم إماراتي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">نوع العقد</Label>
                <Select value={offerForm.offer_type} onValueChange={(v) => setOfferForm({ ...offerForm, offer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">دوام كامل</SelectItem>
                    <SelectItem value="part-time">دوام جزئي</SelectItem>
                    <SelectItem value="contract">عقد مؤقت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">تاريخ البدء</Label>
                <Input
                  type="date"
                  value={offerForm.start_date}
                  onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">صلاحية العرض</Label>
                <Select value={offerForm.expires_days} onValueChange={(v) => setOfferForm({ ...offerForm, expires_days: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 أيام</SelectItem>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="14">14 يوم</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">المزايا والبدلات</Label>
              <Textarea
                value={offerForm.benefits}
                onChange={(e) => setOfferForm({ ...offerForm, benefits: e.target.value })}
                placeholder="ميزة واحدة في كل سطر مثل: تأمين طبي، بدل سكن..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">شروط إضافية</Label>
              <Textarea
                value={offerForm.additional_terms}
                onChange={(e) => setOfferForm({ ...offerForm, additional_terms: e.target.value })}
                placeholder="أي شروط إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="gradient-primary border-0 text-primary-foreground gap-2"
              onClick={handleCreateAndSendOffer}
              disabled={createOffer.isPending || sendOffer.isPending}
            >
              {(createOffer.isPending || sendOffer.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إنشاء وإرسال العرض الوظيفي
            </Button>
            <Button variant="outline" onClick={() => setShowOfferCreateDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
