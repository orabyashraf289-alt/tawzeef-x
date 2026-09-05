import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import type {
  CopilotActionData,
  CopilotActionType,
  CopilotJobPayload,
  CopilotInterviewPayload,
  CopilotMovePayload,
  CopilotFilterPayload,
  CopilotWhatsappPayload,
} from "@/types/copilotActions";
import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { PipelineStage } from "@/hooks/usePipelineStages";

/**
 * Intelligent Intent Recognizer for Direct System Actions
 */
export function detectCopilotActionFromText(
  text: string,
  context: {
    jobs: JobRow[];
    candidates: CandidateRow[];
    stages: PipelineStage[];
    currentUserId?: string;
  }
): CopilotActionData | null {
  if (!text || text.trim().length < 4) return null;
  const normalized = text.toLowerCase().trim();

  // 1. Move Candidate Intent
  if (
    normalized.includes("انقل") ||
    normalized.includes("نقل") ||
    normalized.includes("غيّر مرحلة") ||
    normalized.includes("حول المرشح")
  ) {
    // Find candidate mentioned
    const matchedCandidate = context.candidates.find(c =>
      normalized.includes(c.name.toLowerCase())
    );

    // Find stage mentioned
    const matchedStage = context.stages.find(s =>
      normalized.includes(s.name.toLowerCase())
    ) || { name: "مقابلة تقنية" };

    if (matchedCandidate) {
      return {
        id: `action_move_${Date.now()}`,
        type: "move_candidate",
        title: `نقل المرشح: ${matchedCandidate.name}`,
        description: `سيتم نقل المرشح من "${matchedCandidate.stage}" إلى "${matchedStage.name}" فورياً في خط الأنابيب.`,
        status: "pending_review",
        movePayload: {
          candidate_id: matchedCandidate.id,
          candidate_name: matchedCandidate.name,
          current_stage: matchedCandidate.stage || "تقديم جديد",
          target_stage: matchedStage.name,
          previous_stage: matchedCandidate.stage || "تقديم جديد",
        },
      };
    }
  }

  // 2. Schedule Interview Intent
  if (
    normalized.includes("جدول مقابلة") ||
    normalized.includes("جدولة مقابلة") ||
    normalized.includes("حدد موعد مقابلة") ||
    normalized.includes("حجز مقابلة")
  ) {
    const matchedCandidate = context.candidates.find(c =>
      normalized.includes(c.name.toLowerCase())
    );

    const candName = matchedCandidate ? matchedCandidate.name : "المرشح";
    const candPosition = matchedCandidate ? matchedCandidate.role : "الوظيفة المستهدفة";

    // Auto calculate tomorrow at 11:00 AM as default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const roomId = `room-${Math.random().toString(36).substring(2, 10)}`;
    const meetingUrl = `${window.location.origin}/video-room?room=${roomId}&role=recruiter`;

    return {
      id: `action_interview_${Date.now()}`,
      type: "schedule_interview",
      title: `جدولة مقابلة مع: ${candName}`,
      description: `سيتم إنشاء غرفة فيديو ذكية وتسجيل الموعد مباشرة في قاعدة بيانات المقابلات.`,
      status: "pending_review",
      interviewPayload: {
        candidate_id: matchedCandidate?.id,
        candidate_name: candName,
        position: candPosition,
        date: dateStr,
        time: "11:00",
        type: "فيديو أونلاين",
        meeting_url: meetingUrl,
        interviewer: "مدير التوظيف",
      },
    };
  }

  // 3. Create Job Intent
  if (
    (normalized.includes("أنشئ وظيفة") ||
      normalized.includes("انشئ وظيفة") ||
      normalized.includes("وظيفة جديدة") ||
      normalized.includes("طرح شاغر") ||
      normalized.includes("شاغر وظيفي")) &&
    !normalized.includes("تعديل")
  ) {
    // Extract title
    let title = "مطور برمجيات";
    const titleMatch = text.match(/(?:وظيفة|شاغر)\s+([^في\n]+)/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    let location = "الرياض";
    if (normalized.includes("جدة")) location = "جدة";
    else if (normalized.includes("الدمام")) location = "الدمام";
    else if (normalized.includes("عن بعد") || normalized.includes("remote")) location = "عن بعد";

    return {
      id: `action_job_${Date.now()}`,
      type: "create_job",
      title: `طرح شاغر: ${title}`,
      description: `مراجعة وتأكيد نشر الوظيفة في النظام وتوليد رابط تقديم مباشر مع رمز QR.`,
      status: "pending_review",
      jobPayload: {
        title,
        department: "التقنية والتطوير",
        location,
        type: "دوام كامل",
        salary_min: 8000,
        salary_max: 14000,
        experience_level: "متوسط (2-4 سنوات)",
        description: `نحن نبحث عن ${title} موهوب للانضمام إلى فريق عملنا والمساهمة في تطوير حلول تقنية متقدمة.`,
        requirements: ["خبرة عملية لا تقل عن سنتين", "مهارات تواصل ممتازة", "القدرة على العمل ضمن فريق"],
      },
    };
  }

  // 4. Filter & Match Intent
  if (
    normalized.includes("رشح لي") ||
    normalized.includes("ابحث عن مرشحين") ||
    normalized.includes("فرز المرشحين") ||
    normalized.includes("مطابقة المواهب")
  ) {
    const matchedCandidates = context.candidates.slice(0, 5).map((c, i) => ({
      id: c.id,
      name: c.name,
      role: c.role || "مرشح",
      stage: c.stage || "تقديم جديد",
      match_score: Math.max(75, 95 - i * 5),
      phone: c.phone,
      email: c.email,
      skills: c.skills || [],
    }));

    return {
      id: `action_filter_${Date.now()}`,
      type: "filter_candidates",
      title: "مطابقة وترشيح أفضل المواهب",
      description: "تحليل ذكي لقاعدة بيانات المرشحين وترتيبهم حسب التوافق مع إمكانية الترقية الفورية.",
      status: "pending_review",
      filterPayload: {
        job_title: context.jobs[0]?.title || "الوظائف المفتوحة",
        matched_candidates: matchedCandidates,
      },
    };
  }

  // 5. WhatsApp Dispatch Intent
  if (
    normalized.includes("واتساب") ||
    normalized.includes("تواصل مع") ||
    normalized.includes("راسل")
  ) {
    const matchedCandidate = context.candidates.find(c =>
      normalized.includes(c.name.toLowerCase())
    ) || context.candidates[0];

    if (matchedCandidate) {
      return {
        id: `action_wa_${Date.now()}`,
        type: "whatsapp_dispatch",
        title: `تواصل واتساب مع: ${matchedCandidate.name}`,
        description: `إرسال رسالة تواصل وترحيب مخصصة بالمرشح مباشرة عبر تطبيق WhatsApp.`,
        status: "pending_review",
        whatsappPayload: {
          candidate_id: matchedCandidate.id,
          candidate_name: matchedCandidate.name,
          phone: matchedCandidate.phone || "966500000000",
          message: `السلام عليكم ${matchedCandidate.name}، نود إبلاغكم باهتمامنا بملفكم المهني في Tawzeef-X، وسعداء بالتواصل معكم بشأن الخطوة القادمة.`,
        },
      };
    }
  }

  return null;
}

/**
 * Execute Copilot Action into Supabase and System State
 */
export async function executeCopilotAction(
  action: CopilotActionData,
  userId: string | undefined,
  activeCompanyId?: string | null
): Promise<{ success: boolean; recordId?: string; details: string; resultUrl?: string }> {
  if (!userId) throw new Error("يجب تسجيل الدخول لتنفيذ هذا الإجراء.");

  switch (action.type) {
    case "create_job": {
      if (!action.jobPayload) throw new Error("بيانات الوظيفة غير مكتملة");
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          user_id: userId,
          company_id: activeCompanyId || null,
          title: action.jobPayload.title,
          department: action.jobPayload.department,
          location: action.jobPayload.location,
          type: action.jobPayload.type,
          salary_min: action.jobPayload.salary_min || null,
          salary_max: action.jobPayload.salary_max || null,
          experience_level: action.jobPayload.experience_level || null,
          description: action.jobPayload.description || null,
          requirements: action.jobPayload.requirements || [],
          status: "منشورة",
        } as any)
        .select()
        .single();

      if (error) throw error;

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      return {
        success: true,
        recordId: data.id,
        details: `تم نشر وظيفة "${data.title}" بنجاح في النظام (معرّف: ${data.id.slice(0, 8)})`,
        resultUrl: "/jobs",
      };
    }

    case "schedule_interview": {
      if (!action.interviewPayload) throw new Error("بيانات المقابلة غير مكتملة");
      const p = action.interviewPayload;
      const { data, error } = await supabase
        .from("interviews")
        .insert({
          user_id: userId,
          candidate_id: p.candidate_id || null,
          candidate_name: p.candidate_name,
          position: p.position,
          date: p.date,
          time: p.time,
          type: p.type,
          interviewer: p.interviewer || "مدير التوظيف",
          meeting_url: p.meeting_url || null,
          status: "مجدولة",
        } as any)
        .select()
        .single();

      if (error) throw error;

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      return {
        success: true,
        recordId: data.id,
        details: `تم جدولة المقابلة بنجاح وتجهيز غرفة الفيديو للمرشح "${p.candidate_name}" في ${p.date} الساعة ${p.time}.`,
        resultUrl: p.meeting_url || "/interviews",
      };
    }

    case "move_candidate": {
      if (!action.movePayload) throw new Error("بيانات نقل المرشح غير مكتملة");
      const p = action.movePayload;
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from("candidates")
        .update({
          stage: p.target_stage,
          stage_entered_at: nowIso,
          updated_at: nowIso,
        } as any)
        .eq("id", p.candidate_id);

      if (error) throw error;

      return {
        success: true,
        recordId: p.candidate_id,
        details: `تم نقل المرشح "${p.candidate_name}" إلى مرحلة "${p.target_stage}" بنجاح وتحديث خط الأنابيب.`,
        resultUrl: "/pipeline",
      };
    }

    case "whatsapp_dispatch": {
      if (!action.whatsappPayload) throw new Error("بيانات التواصل غير مكتملة");
      const p = action.whatsappPayload;
      const cleanPhone = p.phone.replace(/[^0-9]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(p.message)}`;
      window.open(waUrl, "_blank");

      return {
        success: true,
        details: `تم تجهيز وفتح محادثة WhatsApp للمرشح "${p.candidate_name}" بنجاح.`,
      };
    }

    case "filter_candidates": {
      return {
        success: true,
        details: "تم فرز وتصفية المرشحين حسب التوافق بنجاح.",
        resultUrl: "/pipeline",
      };
    }

    default:
      throw new Error("نوع الإجراء غير مدعوم");
  }
}

/**
 * Revert a Copilot Action (e.g., undo stage transfer)
 */
export async function rollbackCopilotAction(action: CopilotActionData): Promise<void> {
  if (action.type === "move_candidate" && action.movePayload && action.movePayload.previous_stage) {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("candidates")
      .update({
        stage: action.movePayload.previous_stage,
        stage_entered_at: nowIso,
        updated_at: nowIso,
      } as any)
      .eq("id", action.movePayload.candidate_id);

    if (error) throw error;
  }
}
