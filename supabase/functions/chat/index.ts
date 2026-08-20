import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// AI MODELS - Hybrid routing
// ============================================================================
const MODEL_FAST = "google/gemini-3.6-flash";   // chat / Q&A / detection (Gemini 3.6 Flash)
const MODEL_PRO = "google/gemini-2.5-pro";             // tool execution / reasoning (Gemini Pro)

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================
const tools = [
  {
    type: "function",
    function: {
      name: "create_job",
      description: "إنشاء وظيفة جديدة في النظام.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          department: { type: "string", enum: ["الهندسة", "التصميم", "الإدارة", "البيانات", "التسويق", "الموارد البشرية", "المالية"] },
          location: { type: "string", enum: ["الرياض", "جدة", "الدمام", "عن بُعد", "مكة", "المدينة"] },
          type: { type: "string", enum: ["دوام كامل", "دوام جزئي", "عقد مؤقت", "تدريب", "عن بُعد"] },
          description: { type: "string" },
          requirements: { type: "array", items: { type: "string" } },
          experience_level: { type: "string", enum: ["بدون خبرة", "1-2 سنوات", "3-5 سنوات", "5-7 سنوات", "7-10 سنوات", "+10 سنوات"] },
          salary_min: { type: "number" },
          salary_max: { type: "number" },
        },
        required: ["title", "department", "location", "type", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_job",
      description: "تعديل وظيفة موجودة بالبحث عن عنوانها.",
      parameters: {
        type: "object",
        properties: {
          job_title_search: { type: "string" },
          title: { type: "string" },
          department: { type: "string" },
          location: { type: "string" },
          type: { type: "string" },
          description: { type: "string" },
          requirements: { type: "array", items: { type: "string" } },
          experience_level: { type: "string" },
          salary_min: { type: "number" },
          salary_max: { type: "number" },
          status: { type: "string", enum: ["نشطة", "مغلقة", "مسودة"] },
        },
        required: ["job_title_search"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_job",
      description: "حذف وظيفة من النظام بالبحث عن عنوانها. يتطلب تأكيد المستخدم.",
      parameters: {
        type: "object",
        properties: { job_title_search: { type: "string" } },
        required: ["job_title_search"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_candidates",
      description: "البحث عن المرشحين بالاسم أو المهارات أو المرحلة.",
      parameters: {
        type: "object",
        properties: {
          search_query: { type: "string" },
          stage: { type: "string" },
          status: { type: "string" },
          limit: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "عرض قائمة الوظائف الحالية.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["نشطة", "مغلقة", "مسودة"] } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_voice_briefing",
      description: "توليد ملخص صوتي تفاعلي (Voice Briefing) لمدير التوظيف يعرض حالة التوظيف الحالية والإشعارات الهامة صوتياً.",
      parameters: {
        type: "object",
        properties: {
          briefing_type: { type: "string", enum: ["daily", "weekly"], description: "نوع الملخص المطلوب (يومي أو أسبوعي)." }
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_whatsapp_sms_template",
      description: "توليد قالب رسالة جاهزة للإرسال للمرشح عبر الواتساب أو الرسائل القصيرة SMS (مثل دعوة مقابلة، عرض وظيفي، إلخ).",
      parameters: {
        type: "object",
        properties: {
          candidate_name: { type: "string", description: "اسم المرشح المطلوب التواصل معه." },
          message_type: { type: "string", enum: ["interview", "offer", "match", "welcome"], description: "نوع الرسالة المطلوب صياغتها." },
          custom_details: { type: "string", description: "تفاصيل إضافية لتضمينها في الرسالة (مثال: موعد المقابلة، تفاصيل الراتب)." }
        },
        required: ["candidate_name", "message_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_candidate_stage",
      description: "نقل مرشح إلى مرحلة توظيف مختلفة.",
      parameters: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          new_stage: { type: "string" },
        },
        required: ["candidate_name", "new_stage"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_interview",
      description: "جدولة مقابلة لمرشح.",
      parameters: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM" },
          type: { type: "string", enum: ["عن بُعد", "حضوري", "هاتفي"] },
          interviewer: { type: "string" },
          notes: { type: "string" },
        },
        required: ["candidate_name", "date", "time"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_offer",
      description: "إنشاء عرض وظيفي لمرشح.",
      parameters: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          position: { type: "string" },
          department: { type: "string" },
          salary: { type: "number" },
          currency: { type: "string", enum: ["SAR", "USD", "EUR"] },
          start_date: { type: "string" },
          offer_type: { type: "string", enum: ["full-time", "part-time", "contract", "internship"] },
          benefits: { type: "array", items: { type: "string" } },
          additional_terms: { type: "string" },
        },
        required: ["candidate_name", "position", "salary"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "جلب إحصائيات وتقارير التوظيف.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["overview", "pipeline", "offers", "sources", "monthly"] },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_resume_text",
      description: "تحليل نص سيرة ذاتية ومطابقته بالوظائف.",
      parameters: {
        type: "object",
        properties: { resume_text: { type: "string" } },
        required: ["resume_text"],
        additionalProperties: false,
      },
    },
  },
  // ===== NEW TOOLS =====
  {
    type: "function",
    function: {
      name: "send_email_to_candidate",
      description: "إرسال بريد إلكتروني مخصص لمرشح (دعوة، رفض، شكر، متابعة).",
      parameters: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          subject: { type: "string" },
          body: { type: "string", description: "محتوى البريد بـ HTML أو نص عادي" },
          email_type: { type: "string", enum: ["invitation", "rejection", "thank_you", "follow_up", "general"] },
        },
        required: ["candidate_name", "subject", "body"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_job_description",
      description: "توليد وصف وظيفي احترافي لمسمى وظيفي محدد.",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string" },
          experience_level: { type: "string" },
          department: { type: "string" },
        },
        required: ["job_title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_interview_questions",
      description: "توليد أسئلة مقابلة مخصصة لوظيفة أو مرشح محدد.",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string" },
          candidate_name: { type: "string" },
          question_count: { type: "number", description: "عدد الأسئلة (افتراضي 6)" },
          focus_areas: { type: "array", items: { type: "string" }, description: "مثل: تقني، سلوكي، حل مشكلات" },
        },
        required: ["job_title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_candidate_ai",
      description: "تشغيل تقييم ذكاء اصطناعي شامل لمرشح ومدى توافقه مع وظيفة.",
      parameters: {
        type: "object",
        properties: { candidate_name: { type: "string" } },
        required: ["candidate_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_proactive_insights",
      description: "تحليل ذكي للنظام بأكمله لاكتشاف نقاط تحتاج لانتباه (مرشحون عالقون، مقابلات قادمة، وظائف بدون متقدمين، عروض معلقة).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_move_candidates",
      description: "نقل عدة مرشحين دفعة واحدة لمرحلة محددة.",
      parameters: {
        type: "object",
        properties: {
          candidate_names: { type: "array", items: { type: "string" } },
          new_stage: { type: "string" },
        },
        required: ["candidate_names", "new_stage"],
        additionalProperties: false,
      },
    },
  },
];

// ============================================================================
// HELPERS
// ============================================================================
function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getUser(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabaseAnon.auth.getUser(token);
  return user;
}

// Build dynamic context about user's company state with enhanced accuracy
async function buildUserContext(userId: string): Promise<string> {
  const admin = getAdminClient();
  try {
    const [profileR, jobsR, candidatesR, interviewsR] = await Promise.all([
      admin.from("profiles").select("full_name, company_name, job_title").eq("user_id", userId).maybeSingle(),
      admin.from("jobs").select("id, title, status, department, location").eq("user_id", userId),
      admin.from("candidates").select("id, name, stage, status, rating, ai_score, role").eq("user_id", userId),
      admin.from("interviews").select("id, candidate_name, position, date, time, status").eq("user_id", userId).gte("date", new Date().toISOString().split("T")[0]),
    ]);

    const profile = profileR.data;
    const jobs = jobsR.data || [];
    const candidates = candidatesR.data || [];
    const interviews = interviewsR.data || [];

    const activeJobs = jobs.filter(j => j.status === "نشطة");
    const activeCandidates = candidates.filter(c => c.status !== "مرفوض" && c.status !== "مؤجل");
    const upcomingInterviews = interviews.filter(i => i.status === "مجدولة");

    // Stage breakdown for active candidates
    const stageCounts: Record<string, number> = {};
    activeCandidates.forEach(c => {
      const s = c.stage || "جديد";
      stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    const stageSummary = Object.entries(stageCounts)
      .map(([stg, cnt]) => `${stg}: ${cnt}`)
      .join(" | ");

    return `
=== سياق البيانات المباشر لمنصة Tawzeef-X ===
- المستشار الحالي: ${profile?.full_name || "مدير التوظيف"}${profile?.company_name ? ` - شركة ${profile.company_name}` : ""}
- المسمى الوظيفي: ${profile?.job_title || "مسؤول النظام"}
- الوظائف النشطة (${activeJobs.length}): ${activeJobs.slice(0, 5).map(j => j.title).join("، ")}${activeJobs.length > 5 ? "..." : ""}
- المرشحون النشطون (${activeCandidates.length}): [توزيع المراحل: ${stageSummary || "لا يوجد"}]
- المقابلات القادمة (${upcomingInterviews.length}): ${upcomingInterviews.slice(0, 3).map(i => `${i.candidate_name} (${i.date})`).join("، ")}
- تاريخ وموعد اليوم: ${new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
============================================`;
  } catch {
    return "";
  }
}


// ============================================================================
// TOOL HANDLERS
// ============================================================================
async function handleToolCall(tc: any, userId: string): Promise<{ result: string; action?: any }> {
  const admin = getAdminClient();
  const args = JSON.parse(tc.function.arguments);

  switch (tc.function.name) {
    case "create_job": {
      const jobData = {
        title: args.title, department: args.department, location: args.location, type: args.type,
        description: args.description || null, requirements: args.requirements || null,
        experience_level: args.experience_level || null, salary_min: args.salary_min || null,
        salary_max: args.salary_max || null,
      };
      return {
        result: JSON.stringify({ success: true, preview: true, job_data: jobData }),
        action: { type: "job_preview", job_data: jobData },
      };
    }

    case "update_job": {
      const { data: jobs } = await admin.from("jobs").select("*").eq("user_id", userId).ilike("title", `%${args.job_title_search}%`).limit(1);
      if (!jobs?.length) return { result: JSON.stringify({ error: `لم يتم العثور على وظيفة "${args.job_title_search}"` }) };
      const updates: any = {};
      for (const k of ["title", "department", "location", "type", "description", "requirements", "experience_level", "status"]) { if (args[k]) updates[k] = args[k]; }
      if (args.salary_min !== undefined) updates.salary_min = args.salary_min;
      if (args.salary_max !== undefined) updates.salary_max = args.salary_max;
      const { data: updated, error } = await admin.from("jobs").update(updates).eq("id", jobs[0].id).eq("user_id", userId).select().single();
      if (error) return { result: JSON.stringify({ error: "فشل التعديل: " + error.message }) };
      return { result: JSON.stringify({ success: true, job_id: updated.id, title: updated.title, updated_fields: Object.keys(updates) }), action: { type: "job_updated", job: { id: updated.id, title: updated.title } } };
    }

    case "delete_job": {
      const { data: jobs } = await admin.from("jobs").select("id, title").eq("user_id", userId).ilike("title", `%${args.job_title_search}%`).limit(1);
      if (!jobs?.length) return { result: JSON.stringify({ error: `لم يتم العثور على وظيفة "${args.job_title_search}"` }) };
      return {
        result: JSON.stringify({ success: true, requires_confirmation: true, job_id: jobs[0].id, title: jobs[0].title }),
        action: { type: "job_delete_request", job: { id: jobs[0].id, title: jobs[0].title } },
      };
    }

    case "search_candidates": {
      let query = admin.from("candidates").select("id, name, email, phone, role, stage, status, rating, ai_score, skills, experience, location, source, created_at").eq("user_id", userId);
      if (args.search_query) query = query.or(`name.ilike.%${args.search_query}%,role.ilike.%${args.search_query}%,email.ilike.%${args.search_query}%`);
      if (args.stage) query = query.eq("stage", args.stage);
      if (args.status) query = query.eq("status", args.status);
      const { data: candidates, error } = await query.order("created_at", { ascending: false }).limit(args.limit || 10);
      if (error) return { result: JSON.stringify({ error: "فشل البحث: " + error.message }) };
      return { result: JSON.stringify({ candidates: candidates || [], total: (candidates || []).length }) };
    }

    case "list_jobs": {
      let query = admin.from("jobs").select("id, title, department, location, type, status, experience_level, salary_min, salary_max, created_at").eq("user_id", userId);
      if (args.status) query = query.eq("status", args.status);
      const { data: jobs, error } = await query.order("created_at", { ascending: false }).limit(20);
      if (error) return { result: JSON.stringify({ error: "فشل جلب الوظائف: " + error.message }) };
      return { result: JSON.stringify({ jobs: jobs || [], total: (jobs || []).length }) };
    }

    case "move_candidate_stage": {
      const { data: candidates } = await admin.from("candidates").select("id, name, stage, role, email").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(5);
      if (!candidates?.length) return { result: JSON.stringify({ error: `لم يتم العثور على مرشح باسم "${args.candidate_name}"` }) };
      const candidate = candidates[0];
      const oldStage = candidate.stage;
      const { error } = await admin.from("candidates").update({ stage: args.new_stage }).eq("id", candidate.id).eq("user_id", userId);
      if (error) return { result: JSON.stringify({ error: "فشل نقل المرشح: " + error.message }) };
      await admin.from("notifications").insert({ user_id: userId, title: `تم نقل ${candidate.name}`, description: `من "${oldStage}" إلى "${args.new_stage}"`, type: "pipeline" });
      return { result: JSON.stringify({ success: true, candidate_name: candidate.name, old_stage: oldStage, new_stage: args.new_stage }), action: { type: "candidate_moved", candidate: { name: candidate.name, old_stage: oldStage, new_stage: args.new_stage } } };
    }

    case "bulk_move_candidates": {
      const moved: any[] = [];
      const failed: string[] = [];
      for (const name of args.candidate_names) {
        const { data: candidates } = await admin.from("candidates").select("id, name, stage").eq("user_id", userId).ilike("name", `%${name}%`).limit(1);
        if (!candidates?.length) { failed.push(name); continue; }
        const c = candidates[0];
        const { error } = await admin.from("candidates").update({ stage: args.new_stage }).eq("id", c.id).eq("user_id", userId);
        if (!error) moved.push({ name: c.name, old_stage: c.stage, new_stage: args.new_stage });
        else failed.push(name);
      }
      return {
        result: JSON.stringify({ success: true, moved_count: moved.length, failed_count: failed.length, moved, failed }),
        action: { type: "bulk_moved", moved, failed, new_stage: args.new_stage },
      };
    }

    case "generate_voice_briefing": {
      const { briefing_type = "daily" } = args;
      
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];

      const [jobsR, candidatesR, interviewsR, offersR] = await Promise.all([
        admin.from("jobs").select("id").eq("user_id", userId).eq("status", "نشطة"),
        admin.from("candidates").select("id").eq("user_id", userId).neq("status", "مرفوض").neq("status", "مقبول"),
        admin.from("interviews").select("id").eq("user_id", userId).gte("date", todayStr).lte("date", nextWeek).eq("status", "مجدولة"),
        admin.from("job_offers").select("id").eq("user_id", userId).in("status", ["sent", "viewed"]),
      ]);

      const activeJobsCount = jobsR.data?.length || 0;
      const activeCandidatesCount = candidatesR.data?.length || 0;
      const upcomingInterviewsCount = interviewsR.data?.length || 0;
      const pendingOffersCount = offersR.data?.length || 0;

      const briefingText = `مرحباً بك يا مدير التوظيف. إليك التقرير الصوتي ${briefing_type === "weekly" ? "الأسبوعي" : "اليومي"} لحالة منصة توظيف-إكس: لدينا حالياً ${activeJobsCount} وظائف نشطة يستقبل النظام طلباتها. إجمالي المرشحين النشطين في المراحل المختلفة هو ${activeCandidatesCount} مرشحاً. بالنسبة للمقابلات، هناك ${upcomingInterviewsCount} مقابلات مجدولة خلال الأيام السبعة القادمة. ولدينا ${pendingOffersCount} عروض عمل معلقة بانتظار ردود المرشحين. نوصي بمتابعة المقابلات القادمة اليوم لحسم التعيينات. أتمنى لك يوماً موفقاً!`;

      const briefingData = {
        briefingText,
        briefingType: briefing_type,
        stats: {
          activeJobs: activeJobsCount,
          activeCandidates: activeCandidatesCount,
          upcomingInterviews: upcomingInterviewsCount,
          pendingOffers: pendingOffersCount
        }
      };

      return {
        result: JSON.stringify({ success: true, briefing_data: briefingData }),
        action: { type: "voice_briefing_generated", briefing: briefingData }
      };
    }

    case "generate_whatsapp_sms_template": {
      const { candidate_name, message_type, custom_details } = args;
      const { data: candidates } = await admin.from("candidates").select("id, name, phone, role").eq("user_id", userId).ilike("name", `%${candidate_name}%`).limit(1);
      
      if (!candidates?.length) {
        return { result: JSON.stringify({ error: `لم يتم العثور على مرشح باسم "${candidate_name}"` }) };
      }
      
      const c = candidates[0];
      const phone = c.phone || "";
      const role = c.role || "الوظيفة المقترحة";
      
      let message = "";
      if (message_type === "interview") {
        message = `مرحباً ${c.name}، يسعدنا اهتمامك بالانضمام إلينا كـ ${role}. نود دعوتك لإجراء مقابلة شخصية ${custom_details ? `في موعد: ${custom_details}` : "في أقرب وقت يناسبك"}. يرجى إخطارنا بمدى تفرغك. بالتوفيق!`;
      } else if (message_type === "offer") {
        message = `مرحباً ${c.name}، يسعدنا إبلاغك بقبولك معنا كـ ${role}. لقد قمنا بإعداد عرض العمل الخاص بك ${custom_details ? `(تفاصيل العرض: ${custom_details})` : ""}، نرجو مراجعته وإفادتنا بقرارك. أهلاً بك في الفريق!`;
      } else if (message_type === "match") {
        message = `مرحباً ${c.name}، لقد قمنا بمراجعة سيرتك الذاتية ووجدنا توافقاً رائعاً مع وظيفة ${role}. نود التحدث معك بشكل سريع لاستكشاف فرص التعاون المتاحة.`;
      } else {
        message = `مرحباً ${c.name}، شكراً لتواصلك معنا وللتقديم على وظيفة ${role}. يسعدنا الترحيب بك وسيقوم فريق التوظيف بالتواصل معك قريباً.`;
      }
      
      const dispatcherData = {
        candidateName: c.name,
        phone,
        message,
        messageType: message_type
      };
      
      return {
        result: JSON.stringify({ success: true, dispatcher_data: dispatcherData }),
        action: { type: "whatsapp_sms_template", dispatcher: dispatcherData }
      };
    }

    case "schedule_interview": {
      const { data: candidates } = await admin.from("candidates").select("id, name, role, email").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(1);
      if (!candidates?.length) return { result: JSON.stringify({ error: `لم يتم العثور على مرشح باسم "${args.candidate_name}"` }) };
      const candidate = candidates[0];
      const roomId = `interview-${candidate.id.slice(0, 8)}-${Date.now()}`;
      const meetingUrl = `https://meet.jit.si/${roomId}`;
      const { data: interview, error } = await admin.from("interviews").insert({
        user_id: userId, candidate_id: candidate.id, candidate_name: candidate.name,
        position: candidate.role || "غير محدد", date: args.date, time: args.time,
        type: args.type || "عن بُعد", interviewer: args.interviewer || null,
        notes: args.notes || null, meeting_url: meetingUrl, status: "مجدولة",
      }).select().single();
      if (error) return { result: JSON.stringify({ error: "فشل جدولة المقابلة: " + error.message }) };
      const interviewStages = ["مقابلة تقنية", "مقابلة نهائية"];
      const { data: currentCandidate } = await admin.from("candidates").select("stage").eq("id", candidate.id).single();
      if (currentCandidate && !interviewStages.includes(currentCandidate.stage || "")) {
        await admin.from("candidates").update({ stage: "مقابلة تقنية" }).eq("id", candidate.id).eq("user_id", userId);
      }
      await admin.from("notifications").insert({ user_id: userId, title: `مقابلة جديدة: ${candidate.name}`, description: `يوم ${args.date} الساعة ${args.time}`, type: "interview" });
      return {
        result: JSON.stringify({ success: true, interview_id: interview.id, candidate_name: candidate.name, date: args.date, time: args.time, meeting_url: meetingUrl }),
        action: { type: "interview_scheduled", interview: { id: interview.id, candidate_name: candidate.name, date: args.date, time: args.time, meeting_url: meetingUrl, type: args.type || "عن بُعد" } },
      };
    }

    case "create_offer": {
      const { data: candidates } = await admin.from("candidates").select("id, name, email, role, job_id").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(1);
      if (!candidates?.length) return { result: JSON.stringify({ error: `لم يتم العثور على مرشح باسم "${args.candidate_name}"` }) };
      const candidate = candidates[0];
      const { data: offer, error } = await admin.from("job_offers").insert({
        user_id: userId, candidate_id: candidate.id, job_id: candidate.job_id || null,
        position: args.position, department: args.department || null, salary: args.salary,
        currency: args.currency || "SAR", start_date: args.start_date || null,
        offer_type: args.offer_type || "full-time", benefits: args.benefits || null,
        additional_terms: args.additional_terms || null, status: "draft",
      }).select().single();
      if (error) return { result: JSON.stringify({ error: "فشل إنشاء العرض: " + error.message }) };
      await admin.from("candidates").update({ stage: "عرض وظيفي" }).eq("id", candidate.id).eq("user_id", userId);
      await admin.from("notifications").insert({ user_id: userId, title: `عرض وظيفي: ${candidate.name}`, description: `${args.position} براتب ${args.salary} ${args.currency || "SAR"}`, type: "offer" });
      return {
        result: JSON.stringify({ success: true, offer_id: offer.id, candidate_name: candidate.name, position: args.position, salary: args.salary, token: offer.token }),
        action: { type: "offer_created", offer: { id: offer.id, candidate_name: candidate.name, position: args.position, salary: args.salary, currency: args.currency || "SAR", token: offer.token } },
      };
    }

    case "get_stats": {
      const reportType = args.report_type || "overview";
      const { data: jobs } = await admin.from("jobs").select("id, title, status, department, created_at").eq("user_id", userId);
      const { data: candidates } = await admin.from("candidates").select("id, name, stage, status, source, ai_score, created_at, updated_at").eq("user_id", userId);
      const { data: interviews } = await admin.from("interviews").select("id, status, date, created_at").eq("user_id", userId);
      const { data: offers } = await admin.from("job_offers").select("id, status, salary, currency, position, created_at").eq("user_id", userId);

      const allJobs = jobs || [];
      const allCandidates = candidates || [];
      const allInterviews = interviews || [];
      const allOffers = offers || [];

      let stats: any = {};
      if (reportType === "overview" || reportType === "pipeline") {
        const stages: Record<string, number> = {};
        allCandidates.forEach(c => { const s = c.stage || "تقديم الطلب"; stages[s] = (stages[s] || 0) + 1; });
        stats = {
          total_jobs: allJobs.length, active_jobs: allJobs.filter(j => j.status === "نشطة").length,
          total_candidates: allCandidates.length, total_interviews: allInterviews.length,
          total_offers: allOffers.length, accepted_offers: allOffers.filter(o => o.status === "accepted").length,
          rejected_offers: allOffers.filter(o => o.status === "rejected").length, pipeline: stages,
          hired: allCandidates.filter(c => c.status === "مقبول").length,
        };
      }
      if (reportType === "offers") {
        const accepted = allOffers.filter(o => o.status === "accepted").length;
        const rejected = allOffers.filter(o => o.status === "rejected").length;
        const total = accepted + rejected;
        stats = {
          total_offers: allOffers.length, accepted, rejected,
          pending: allOffers.filter(o => o.status === "draft" || o.status === "sent").length,
          acceptance_rate: total > 0 ? Math.round((accepted / total) * 100) : 0,
          avg_salary: allOffers.length > 0 ? Math.round(allOffers.reduce((s, o) => s + Number(o.salary), 0) / allOffers.length) : 0,
        };
      }
      if (reportType === "sources") {
        const sources: Record<string, number> = {};
        allCandidates.forEach(c => { const s = c.source || "غير محدد"; sources[s] = (sources[s] || 0) + 1; });
        stats = { sources, total: allCandidates.length };
      }
      if (reportType === "monthly") {
        const monthly: Record<string, { candidates: number; interviews: number; offers: number }> = {};
        allCandidates.forEach(c => { const m = c.created_at.slice(0, 7); if (!monthly[m]) monthly[m] = { candidates: 0, interviews: 0, offers: 0 }; monthly[m].candidates++; });
        allInterviews.forEach(i => { const m = i.created_at.slice(0, 7); if (monthly[m]) monthly[m].interviews++; });
        allOffers.forEach(o => { const m = o.created_at.slice(0, 7); if (monthly[m]) monthly[m].offers++; });
        stats = { monthly };
      }
      return { result: JSON.stringify(stats), action: { type: "stats_report", report_type: reportType, stats } };
    }

    case "analyze_resume_text": {
      const { data: jobs } = await admin.from("jobs").select("id, title, department, requirements, experience_level").eq("user_id", userId).eq("status", "نشطة");
      const jobList = (jobs || []).map(j => `- ${j.title} (${j.department}) - متطلبات: ${(j.requirements || []).join(", ")} - خبرة: ${j.experience_level || "غير محدد"}`).join("\n");
      return {
        result: JSON.stringify({
          resume_text: args.resume_text,
          active_jobs: (jobs || []).map(j => ({ id: j.id, title: j.title, department: j.department })),
          instruction: `حلل السيرة التالية وقارنها بالوظائف:\n\nالوظائف:\n${jobList}\n\nالسيرة:\n${args.resume_text}\n\nاستخرج: الاسم، المهارات، الخبرة، التخصص، ونسبة التوافق مع كل وظيفة.`
        }),
      };
    }

    // ===== NEW TOOLS =====
    case "send_email_to_candidate": {
      const { data: candidates } = await admin.from("candidates").select("id, name, email").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(1);
      if (!candidates?.length) return { result: JSON.stringify({ error: `لم يتم العثور على مرشح "${args.candidate_name}"` }) };
      const candidate = candidates[0];
      if (!candidate.email) return { result: JSON.stringify({ error: `لا يوجد بريد إلكتروني للمرشح ${candidate.name}` }) };

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({
            to: candidate.email, subject: args.subject,
            html: args.body.includes("<") ? args.body : `<p>${args.body.replace(/\n/g, "<br>")}</p>`,
            user_id: userId, candidate_id: candidate.id, email_type: args.email_type || "general",
          }),
        });
        const sent = sendResp.ok;
        if (sent) await admin.from("notifications").insert({ user_id: userId, title: `بريد مُرسل: ${candidate.name}`, description: args.subject, type: "email" });
        return {
          result: JSON.stringify({ success: sent, candidate_name: candidate.name, email: candidate.email, subject: args.subject }),
          action: { type: "email_sent", email: { candidate_name: candidate.name, to: candidate.email, subject: args.subject, success: sent } },
        };
      } catch (e: any) {
        return { result: JSON.stringify({ error: "فشل إرسال البريد: " + (e.message || "غير معروف") }) };
      }
    }

    case "generate_job_description": {
      const jobData = {
        title: args.job_title,
        department: args.department || "الهندسة",
        location: "عن بُعد",
        type: "دوام كامل",
        description: `وصف وظيفي للمسمى: ${args.job_title}`,
        experience_level: args.experience_level || "3-5 سنوات",
      };
      return {
        result: JSON.stringify({
          generated: true,
          job_data: jobData,
          instruction: `اكتب وصفاً وظيفياً احترافياً ومفصلاً للمسمى "${args.job_title}"${args.department ? ` في قسم ${args.department}` : ""}${args.experience_level ? ` لمستوى ${args.experience_level}` : ""}. اكتبه بصيغة احترافية تجذب أفضل المواهب وتشمل: نبذة عن الدور، المسؤوليات الرئيسية، المؤهلات المطلوبة، المهارات المرغوبة، والمزايا. استخدم تنسيق Markdown.`
        }),
        action: { type: "job_preview", job_data: jobData },
      };
    }

    case "generate_interview_questions": {
      const count = args.question_count || 5;
      const jobTitle = args.job_title || "مطور برمجيات";
      let candidateName = args.candidate_name || "المرشح";
      let candidateSkills: string[] = [];
      let candidateExperience = "غير محدد";
      
      if (args.candidate_name) {
        const { data: cands } = await admin.from("candidates").select("name, role, skills, experience").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(1);
        if (cands?.length) {
          candidateName = cands[0].name;
          candidateSkills = cands[0].skills || [];
          candidateExperience = cands[0].experience || "غير محدد";
        }
      }

      // Predefined tailored questions database
      const techPool = [
        {
          matchKeyword: "react",
          question: "ما هو الفرق بين Virtual DOM و Real DOM في React؟ وكيف يحسن الأداء؟",
          expectedAnswer: "الـ Virtual DOM هو نسخة خفيفة في الذاكرة من الـ Real DOM. عند تحديث الـ state، تقوم React بمقارنة الـ Virtual DOM الجديد بالقديم (Diffing) وتقوم بتحديث الأجزاء المتغيرة فقط في الـ Real DOM الفعلي (Reconciliation) مما يسرع الأداء.",
          category: "تقني",
          difficulty: "متوسط"
        },
        {
          matchKeyword: "react",
          question: "اشرح متى وكيف تستخدم hook مثل useMemo و useCallback؟",
          expectedAnswer: "نستخدم useMemo لتخزين قيمة عملية حسابية معقدة وتجنب إعادة حسابها في كل render. بينما نستخدم useCallback لتخزين مرجع (reference) لدالة ما وتجنب إعادة إنشائها، مما يمنع إعادة render للمكونات التابعة غير الضرورية.",
          category: "تقني",
          difficulty: "صعب"
        },
        {
          matchKeyword: "javascript",
          question: "ما هي الوعود (Promises) في JavaScript؟ وكيف نستخدم Async/Await للتعامل معها؟",
          expectedAnswer: "الوعد (Promise) هو كائن يمثل القيمة النهائية لعملية غير متزامنة (نجاح أو فشل). دالتا async و await هما طريقة مبسطة (Syntactic Sugar) لكتابة العمليات غير المتزامنة لتبدو وكأنها متزامنة وتسهل قراءتها وصيانتها.",
          category: "تقني",
          difficulty: "سهل"
        },
        {
          matchKeyword: "node",
          question: "كيف تعمل الـ Middleware في Express.js؟ وما هي فائدتها؟",
          expectedAnswer: "الـ Middleware هي دوال تملك صلاحية الوصول إلى كائن الطلب (req) وكائن الاستجابة (res) ودالة Middleware التالية (next). تستخدم للتحقق من الصلاحيات، تسجيل السجلات (logging)، ومعالجة البيانات قبل إرسال الرد.",
          category: "تقني",
          difficulty: "متوسط"
        },
        {
          matchKeyword: "node",
          question: "كيف تتعامل مع الأخطاء غير المتوقعة (Unhandled Errors) في Node.js؟",
          expectedAnswer: "نستخدم try/catch للعمليات المتزامنة وغير المتزامنة مع async/await. ونقوم بالاستماع للأحداث uncaughtException و unhandledRejection على كائن process لتسجيل الخطأ وإعادة تشغيل التطبيق بأمان.",
          category: "تقني",
          difficulty: "صعب"
        },
        {
          matchKeyword: "database",
          question: "ما هو الفهرس (Index) في قاعدة البيانات؟ وما هي تكلفة استخدامه؟",
          expectedAnswer: "الفهرس هو بنية بيانات تسهل عملية البحث السريع عن السجلات في الجداول دون الحاجة لمسح الجدول بأكمله. تكلفته تكمن في استهلاك مساحة تخزين إضافية وبطء طفيف في عمليات الإدخال والتحديث (INSERT/UPDATE).",
          category: "تقني",
          difficulty: "متوسط"
        },
        {
          matchKeyword: "python",
          question: "ما الفرق بين القوائم (Lists) والـ Tuples في Python؟ ومتى تستخدم كل منهما؟",
          expectedAnswer: "القوائم قابلة للتعديل (Mutable) وتستخدم للبيانات الديناميكية. الـ Tuples غير قابلة للتعديل (Immutable) وتكون أسرع في المعالجة وتستخدم للثوابت والبيانات التي يجب ألا تتغير.",
          category: "تقني",
          difficulty: "سهل"
        }
      ];

      // Generic fallback technical questions
      const genericTech = [
        {
          question: "ما هي أفضل الممارسات التي تتبعها لكتابة كود نظيف وقابل للصيانة (Clean Code)؟",
          expectedAnswer: "استخدام أسماء متغيرات ودوال ذات دلالة واضحة، تقسيم الدوال الكبيرة إلى دوال صغيرة تؤدي وظيفة واحدة (Single Responsibility)، وكتابة اختبارات آلية.",
          category: "تقني",
          difficulty: "متوسط"
        },
        {
          question: "كيف تتعامل مع مشاكل تضارب الكود (Merge Conflicts) في Git عند العمل في فريق؟",
          expectedAnswer: "أقوم بسحب التحديثات الأخيرة أولاً، وتحديد السطور المتضاربة بالتعاون مع المطور الآخر، ثم دمج الكود واختباره محلياً قبل رفعه مجدداً.",
          category: "حل مشكلات",
          difficulty: "سهل"
        }
      ];

      const behavioralPool = [
        {
          question: "احكِ لنا عن موقف واجهت فيه مشكلة تقنية صعبة في مشروع سابق وكيف قمت بحلها؟",
          expectedAnswer: "يجب على المرشح استخدام منهجية STAR (الموقف، المهمة، الإجراء، النتيجة)، مع التركيز على مهارات البحث واستشارة الزملاء وحل المشكلة بشكل منهجي.",
          category: "حل مشكلات",
          difficulty: "متوسط"
        },
        {
          question: "إذا تعارضت مع زميل في الفريق حول طريقة تنفيذ ميزة معينة، كيف تحل هذا الخلاف؟",
          expectedAnswer: "عقد نقاش هادئ، الاستماع لوجهة نظره، مقارنة الحلول بناءً على معايير موضوعية (الأداء، سهولة الصيانة)، واللجوء للتوثيق أو رأي خبير إذا لزم الأمر.",
          category: "سلوكي",
          difficulty: "سهل"
        },
        {
          question: "كيف تتعامل مع ضغط العمل والمواعيد النهائية الضيقة؟",
          expectedAnswer: "ترتيب الأولويات، تقسيم المهام الكبيرة إلى أجزاء صغيرة، إخطار المدير مبكراً بأي تأخير محتمل، والتركيز على تسليم نموذج أولي يعمل أولاً.",
          category: "سلوكي",
          difficulty: "متوسط"
        },
        {
          question: "ما الذي جذبك للتقديم في شركتنا؟ وكيف ترى مساهمتك معنا؟",
          expectedAnswer: "إظهار معرفة برؤية الشركة ومنتجاتها، والربط بين شغفه الشخصي وخبرته العملية وأهداف نمو الشركة.",
          category: "ملاءمة ثقافية",
          difficulty: "سهل"
        }
      ];

      // Build tailored list
      const selectedQuestions: any[] = [];
      const lowerJob = jobTitle.toLowerCase();
      const matchedTech = techPool.filter(q => 
        lowerJob.includes(q.matchKeyword) || 
        candidateSkills.some(s => s.toLowerCase().includes(q.matchKeyword))
      );

      selectedQuestions.push(...matchedTech.slice(0, Math.min(matchedTech.length, Math.ceil(count / 2))));
      const remainingCount = count - selectedQuestions.length;
      if (selectedQuestions.length < count) {
        const fallbackTechToAdd = genericTech.filter(g => !selectedQuestions.some(sq => sq.question === g.question));
        selectedQuestions.push(...fallbackTechToAdd.slice(0, remainingCount));
      }
      const finalRemainingCount = count - selectedQuestions.length;
      selectedQuestions.push(...behavioralPool.slice(0, finalRemainingCount));

      const questions = selectedQuestions.slice(0, count).map((q, idx) => ({
        id: `q-${idx + 1}`,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        expectedAnswer: q.expectedAnswer,
        score: 0
      }));

      const guideData = {
        candidateName,
        jobTitle,
        experience: candidateExperience,
        questions
      };

      return {
        result: JSON.stringify({
          success: true,
          generated: true,
          job_title: jobTitle,
          candidate_name: candidateName,
          guide_data: guideData
        }),
        action: { type: "interview_guide_generated", guide: guideData }
      };
    }

    case "evaluate_candidate_ai": {
      const { data: candidates } = await admin.from("candidates").select("id, name, role, skills, experience, summary, education, job_id").eq("user_id", userId).ilike("name", `%${args.candidate_name}%`).limit(1);
      if (!candidates?.length) return { result: JSON.stringify({ error: `لم يتم العثور على مرشح "${args.candidate_name}"` }) };
      const c = candidates[0];
      let jobInfo = "";
      if (c.job_id) {
        const { data: job } = await admin.from("jobs").select("title, requirements, experience_level, description").eq("id", c.job_id).single();
        if (job) jobInfo = `\n\nالوظيفة المتقدم لها:\n- العنوان: ${job.title}\n- المتطلبات: ${(job.requirements || []).join(", ")}\n- مستوى الخبرة: ${job.experience_level || "غير محدد"}\n- الوصف: ${job.description?.slice(0, 500) || "غير محدد"}`;
      }
      return {
        result: JSON.stringify({
          evaluation_required: true,
          candidate_id: c.id,
          candidate_name: c.name,
          instruction: `قيّم المرشح التالي وأعطِ تقييماً شاملاً:\n\nالمرشح:\n- الاسم: ${c.name}\n- الدور: ${c.role}\n- المهارات: ${(c.skills || []).join(", ")}\n- الخبرة: ${c.experience}\n- التعليم: ${c.education || "غير محدد"}\n- الملخص: ${c.summary || "غير محدد"}${jobInfo}\n\nأعطِ:\n1. **نسبة توافق** (0-100%)\n2. **التوصية** (مناسب جداً / مناسب / يحتاج تطوير / غير مناسب)\n3. **نقاط القوة** (3-5 نقاط)\n4. **نقاط التحسين** (2-3 نقاط)\n5. **ملخص قصير** (2-3 أسطر)`
        }),
        action: { type: "candidate_evaluation", candidate: { id: c.id, name: c.name } },
      };
    }

    case "get_proactive_insights": {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [stuckR, upcomingR, jobsNoApplR, pendingOffersR] = await Promise.all([
        // Candidates not moved in 7+ days
        admin.from("candidates").select("id, name, stage, updated_at").eq("user_id", userId).lt("updated_at", weekAgo).neq("status", "مرفوض").neq("status", "مقبول").limit(20),
        // Upcoming interviews
        admin.from("interviews").select("id, candidate_name, date, time, status").eq("user_id", userId).gte("date", today.toISOString().split("T")[0]).lte("date", nextWeek).eq("status", "مجدولة"),
        // Jobs without applicants
        admin.from("jobs").select("id, title, created_at").eq("user_id", userId).eq("status", "نشطة"),
        // Pending offers
        admin.from("job_offers").select("id, position, status, sent_at, created_at").eq("user_id", userId).in("status", ["sent", "viewed"]),
      ]);

      const allCandidates = await admin.from("candidates").select("id, job_id").eq("user_id", userId);
      const candidatesByJob = new Map<string, number>();
      (allCandidates.data || []).forEach(c => {
        if (c.job_id) candidatesByJob.set(c.job_id, (candidatesByJob.get(c.job_id) || 0) + 1);
      });
      const jobsNoApplicants = (jobsNoApplR.data || []).filter(j => !candidatesByJob.has(j.id));

      const insights = {
        stuck_candidates: (stuckR.data || []).slice(0, 5).map(c => ({ name: c.name, stage: c.stage, days_stuck: Math.floor((today.getTime() - new Date(c.updated_at).getTime()) / (24 * 60 * 60 * 1000)) })),
        upcoming_interviews: (upcomingR.data || []).slice(0, 5),
        jobs_no_applicants: jobsNoApplicants.slice(0, 5).map(j => ({ id: j.id, title: j.title, days_open: Math.floor((today.getTime() - new Date(j.created_at).getTime()) / (24 * 60 * 60 * 1000)) })),
        pending_offers: (pendingOffersR.data || []).slice(0, 5),
        summary: {
          stuck_count: (stuckR.data || []).length,
          upcoming_count: (upcomingR.data || []).length,
          empty_jobs_count: jobsNoApplicants.length,
          pending_offers_count: (pendingOffersR.data || []).length,
        },
      };

      return {
        result: JSON.stringify(insights),
        action: { type: "proactive_insights", insights },
      };
    }

    default:
      return { result: JSON.stringify({ error: "أداة غير معروفة" }) };
  }
}

// ============================================================================
// SERVE
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Rate limit: 20 requests per minute per IP (AI cost protection)
    const { allowed } = checkRateLimit(req, 20, 60_000);
    if (!allowed) return rateLimitResponse(corsHeaders);

  try {
    const { messages, resume_text, attached_files_text, model_override, disable_tools, stream } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    // Allowed models — anything else falls back to defaults
    const ALLOWED_MODELS = new Set([
      "google/gemini-2.0-flash",
      "google/gemini-1.5-pro",
      "google/gemini-1.5-flash",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ]);
    const overrideModel = typeof model_override === "string" && ALLOWED_MODELS.has(model_override)
      ? model_override
      : null;
    // When a specific model is requested, use it for BOTH detect and follow-up
    let effectiveFastModel = overrideModel ?? MODEL_FAST;
    let effectiveProModel = overrideModel ?? MODEL_PRO;
    if (isDirectGemini) {
      effectiveFastModel = effectiveFastModel.replace(/^(google|openai)\//i, "");
      effectiveProModel = effectiveProModel.replace(/^(google|openai)\//i, "");
      if (effectiveFastModel === "gemini-3.6-flash" || effectiveFastModel === "gemini-3-flash-preview") effectiveFastModel = "gemini-2.0-flash";
      if (effectiveProModel === "gemini-2.5-pro") effectiveProModel = "gemini-1.5-pro";
    }
    const toolsDisabled = disable_tools === true;

    const authHeader = req.headers.get("authorization") || "";
    const user = await getUser(authHeader);

    const actualMessages = [...messages];
    if (resume_text || attached_files_text) {
      const lastMsg = actualMessages[actualMessages.length - 1];
      if (lastMsg?.role === "user") {
        let extras = "";
        if (resume_text) extras += `\n\n[نص السيرة الذاتية المرفقة]:\n${resume_text}`;
        if (attached_files_text) extras += `\n\n[محتوى الملفات المرفقة]:\n${attached_files_text}`;
        lastMsg.content = `${lastMsg.content}${extras}`;
      }
    }

    // Build dynamic context
    const userContext = user ? await buildUserContext(user.id) : "";

    const systemPrompt = `أنت "ذكي" — المستشار والخبير الإستراتيجي الذكي المتقدم لمنصة Tawzeef-X. تتميز بالدقة المتناهية، والتنظيم المتقن، وصياغة الردود بأسلوب تنفيذي رفيع وشامل (Executive Level Presentation).

${userContext}

## أدواتك المتاحة (19 أداة تفاعلية):
- **إدارة الوظائف**: create_job, update_job, delete_job, list_jobs, generate_job_description
- **إدارة المرشحين**: search_candidates, compare_candidates, move_candidate_stage, bulk_move_candidates, evaluate_candidate_ai, analyze_resume_text
- **المقابلات والعروض**: schedule_interview, generate_interview_questions, create_offer
- **التواصل التفاعلي**: send_email_to_candidate, generate_whatsapp_sms_template
- **التحليلات والمؤشرات**: get_stats, get_proactive_insights, generate_voice_briefing

## قواعد الجودة الصارمة والتنسيق التنفيذي:
1. 🎯 **الهيكل الثلاثي الموحد لكل رد**:
   - **القسم الأول: 📌 الملخص التنفيذي**: جملة أو جملتان تلخص النتيجة المباشرة.
   - **القسم الثاني: 📊 البيانات والنتائج**: يُعرض دائماً على شكل **جدول Markdown منظم** عند سرد أو مقارنة المرشحين، الوظائف، المهارات، أو التقييمات.
   - **القسم الثالث: 💡 الخطوات والاستراتيجية القادمة**: توصيتان استباقيتان محددتان لمدير التوظيف.

2. 📊 **اشتراط الجدول في القوائم والمقارنات**:
   - لا تسرد المرشحين أو الوظائف في فقرات عشوائية؛ استخدم دائماً جدول Markdown يتضمن (الاسم/المسمى | المرحلة | التقييم/الخبرة | الحالة/الإجراء التوصيات).

3. ⚡ **الدقة والابتعاد عن الحشو**:
   - ادخل في صلب الموضوع فوراً بدون مقدمات مكررة أو اعتذارات طويلة.
   - إذا تم طلب إجراء (مثل إنشاء وظيفة أو جدولة مقابلة)، قم باستدعاء الأداة المناسبة فوراً لإنتاج بطاقات المعاينة التفاعلية.

4. 🚫 **حظر تسريب الوسوم البرمجية وسجل التفكير**:
   - يُمنع منعاً باتاً طباعة وسوم النظام مثل "&lt;thinking&gt;", "&lt;tool_code&gt;", "&lt;tool_call&gt;" أو أكواد برمجية مثل print(...) داخل ردك النصي.
   - كافّة الردود الموجهة للمستخدم يجب أن تقتصر على النص العربي المنظم بالتنسيق التنفيذي فقط دون أي حقول أو أكواد تقنية داخلية.

5. 🚀 **التفاعل الفوري لإنشاء ونشر الوظائف**:
   - عند طلب البحث عن وظيفة أو اقتراح/صياغة وظيفة جديدة، ادمج كافّة معلومات الأدوات المتاحة (نطاق الراتب بالريال السعودي، القسم، الخبرة، الجدارات) وقدم ردك متضمناً المفاتيح الصريحة التالية لتفعيل كارت الإضافة الفورية التفاعلي فوراً:
     - المسمى الوظيفي: [اسم الوظيفة]
     - القسم: [اسم القسم]
     - الموقع: [المدينة/الرياض]
     - نوع التوظيف: [دوام كامل/جزئي]
     - مستوى الخبرة: [السنوات]
     - الراتب المتوقع: [الحد الأدنى - الحد الأقصى ر.س]`;


    async function fetchWithRetry(url: string, opts: any, retries = 3, delayMs = 800): Promise<Response> {
      let r = await fetch(url, opts);
      let attempt = 0;
      while (r.status === 429 && attempt < retries) {
        attempt++;
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        r = await fetch(url, opts);
      }
      if (r.status === 429) {
        // Fallback model retry if primary model hit rate limits
        try {
          const bodyObj = JSON.parse(opts.body || "{}");
          bodyObj.model = "google/gemini-2.5-flash";
          r = await fetch(url, { ...opts, body: JSON.stringify(bodyObj) });
        } catch {
          // ignore JSON parse error
        }
      }
      return r;
    }

    // ========== Compare-mode / disable_tools: pure streaming text ==========
    if (toolsDisabled) {
      const isStream = stream !== false;
      const streamResponse = await fetchWithRetry(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: effectiveFastModel, messages: [{ role: "system", content: systemPrompt }, ...actualMessages], stream: isStream }),
      });
      if (!streamResponse.ok) {
        const s = streamResponse.status;
        if (s === 429) return new Response(JSON.stringify({ type: "text", content: "الخادم مشغول حالياً بكثرة الطلبات. يرجى إعادة إرسال طلبك بعد ثوانٍ بسيطة ⏳" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (s === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const err = await getResponseError(streamResponse);
        return new Response(JSON.stringify({ error: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (isStream) {
        if (!streamResponse.body) {
          return new Response(JSON.stringify({ error: "No stream body" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      } else {
        const data = await streamResponse.json();
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ========== STEP 1: Detect intent ==========
    const detectResponse = await fetchWithRetry(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: effectiveFastModel, messages: [{ role: "system", content: systemPrompt }, ...actualMessages], tools, stream: false }),
    });

    if (!detectResponse.ok) {
      const s = detectResponse.status;
      if (s === 429) return new Response(JSON.stringify({ type: "text", content: "الخادم مشغول حالياً بكثرة الطلبات. يرجى إعادة إرسال طلبك بعد ثوانٍ بسيطة ⏳" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const err = await getResponseError(detectResponse);
      console.error("AI detect error:", s, err);
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const detectData = await detectResponse.json();
    const choice = detectData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // ========== NO TOOLS: Stream simple response with instant SSE chunking ==========
    if (!toolCalls || toolCalls.length === 0) {
      const content = choice?.message?.content;
      if (content) {
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            const chunkSize = 16;
            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.slice(i, i + chunkSize);
              const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
              await new Promise((res) => setTimeout(res, 8));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(readableStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }

      const streamResponse = await fetchWithRetry(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: effectiveFastModel, messages: [{ role: "system", content: systemPrompt }, ...actualMessages], stream: true }),
      });
      if (!streamResponse.ok || !streamResponse.body) {
        return new Response(JSON.stringify({ type: "text", content: choice?.message?.content || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // ========== TOOLS: Execute and stream follow-up with PRO model ==========
    if (!user) {
      return new Response(JSON.stringify({ type: "text", content: "يجب تسجيل الدخول أولاً." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolResults: any[] = [];
    const actions: any[] = [];
    for (const tc of toolCalls) {
      try {
        const { result, action } = await handleToolCall(tc, user.id);
        toolResults.push({ tool_call_id: tc.id, role: "tool", content: result });
        if (action) actions.push(action);
      } catch (e: any) {
        console.error("Tool call error:", tc.function.name, e);
        toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ error: "فشل تنفيذ الأداة: " + (e.message || "خطأ غير معروف") }) });
      }
    }

    // Use PRO (or override) model for tool result synthesis
    const followUpStream = await fetchWithRetry(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: effectiveProModel, messages: [{ role: "system", content: systemPrompt }, ...actualMessages, choice.message, ...toolResults], stream: true }),
    });

    const actionPrefix = actions.length > 0 ? `data: ${JSON.stringify({ type: "actions", actions })}\n\n` : "";

    if (!followUpStream.ok || !followUpStream.body) {
      // Fallback to FAST non-stream
      const followUp = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: effectiveFastModel, messages: [{ role: "system", content: systemPrompt }, ...actualMessages, choice.message, ...toolResults], stream: false }),
      });
      const followUpData = await followUp.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || "تم تنفيذ الطلب.";
      return new Response(JSON.stringify(buildNonStreamResponse(finalContent, actions)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    (async () => {
      try {
        if (actionPrefix) await writer.write(encoder.encode(actionPrefix));
        const reader = followUpStream.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();
    return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function buildNonStreamResponse(content: string, actions: any[]): any {
  const responseData: any = { type: "text", content };
  for (const a of actions) {
    if (a.type === "job_preview") { responseData.type = "job_preview"; responseData.job_data = a.job_data; }
    else if (a.type === "job_created") { responseData.type = "job_created"; responseData.job = a.job; }
    else if (a.type === "job_updated") { responseData.type = "job_updated"; responseData.job = a.job; }
    else if (a.type === "job_delete_request") { responseData.type = "job_delete_request"; responseData.job = a.job; }
    else if (a.type === "candidate_moved") { responseData.type = "candidate_moved"; responseData.candidate = a.candidate; }
    else if (a.type === "bulk_moved") { responseData.type = "bulk_moved"; responseData.bulk = a; }
    else if (a.type === "interview_scheduled") { responseData.type = "interview_scheduled"; responseData.interview = a.interview; }
    else if (a.type === "offer_created") { responseData.type = "offer_created"; responseData.offer = a.offer; }
    else if (a.type === "stats_report") { responseData.type = "stats_report"; responseData.stats = a.stats; responseData.report_type = a.report_type; }
    else if (a.type === "email_sent") { responseData.type = "email_sent"; responseData.email = a.email; }
    else if (a.type === "proactive_insights") { responseData.type = "proactive_insights"; responseData.insights = a.insights; }
    else if (a.type === "candidate_evaluation") { responseData.type = "candidate_evaluation"; responseData.candidate = a.candidate; }
    else if (a.type === "interview_questions_generated") { responseData.type = "interview_questions"; responseData.job_title = a.job_title; }
  }
  return responseData;
}


async function getResponseError(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    if (json && json.error) {
      if (typeof json.error === "string") return json.error;
      if (json.error.message) return json.error.message;
      return JSON.stringify(json.error);
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text) return text.slice(0, 200);
    } catch (err) {
      console.warn("Failed to parse response text:", err);
    }
  }
  return "خطأ غير معروف في الذكاء الاصطناعي";
}