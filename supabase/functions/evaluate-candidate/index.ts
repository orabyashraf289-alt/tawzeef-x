import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getExtendedCorsHeaders } from "../_shared/cors.ts";

function generateSmartFallbackEvaluation(candidate: any, job: any) {
  const candidateSkills: string[] = Array.isArray(candidate.skills)
    ? candidate.skills
    : typeof candidate.skills === "string"
      ? candidate.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  const jobReqs: string[] = job && Array.isArray(job.requirements)
    ? job.requirements
    : job && typeof job.requirements === "string"
      ? job.requirements.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  let matchedSkillsCount = 0;
  if (jobReqs.length > 0 && candidateSkills.length > 0) {
    matchedSkillsCount = candidateSkills.filter(sk => 
      jobReqs.some(req => req.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(req.toLowerCase()))
    ).length;
  }

  let skillsMatchScore = candidateSkills.length > 0 ? Math.min(95, Math.max(50, matchedSkillsCount * 20 + 40)) : 60;
  let experienceMatchScore = 70;
  if (candidate.experience) {
    const expYears = parseInt(candidate.experience, 10);
    if (!isNaN(expYears)) {
      if (expYears >= 5) experienceMatchScore = 95;
      else if (expYears >= 3) experienceMatchScore = 85;
      else if (expYears >= 1) experienceMatchScore = 70;
    }
  }

  let educationMatchScore = candidate.education ? 85 : 65;
  let culturalFitScore = 80;

  const score = Math.round(skillsMatchScore * 0.35 + experienceMatchScore * 0.30 + educationMatchScore * 0.20 + culturalFitScore * 0.15);

  let recommendation = "مناسب";
  if (score >= 85) recommendation = "مناسب جداً (موصى به بلقطة ممتازة)";
  else if (score >= 70) recommendation = "مناسب (موصى به للمقابلة)";
  else if (score >= 50) recommendation = "يحتاج تطوير وفحص فني";
  else recommendation = "غير مناسب";

  const strengths: string[] = [];
  if (candidate.experience) strengths.push(`خبرة سابقة (${candidate.experience}) تتناسب مع المتطلبات`);
  if (candidateSkills.length > 0) strengths.push(`امتلاك المهارات الأساسية: ${candidateSkills.slice(0, 4).join("، ")}`);
  if (candidate.summary) strengths.push("ملخص مهني واضح ومكتمل البيانات");
  if (strengths.length === 0) strengths.push("مؤهل تعليمي متوافق مبدئياً مع شاغر الوظيفة");

  const weaknesses: string[] = [
    candidateSkills.length < 3 ? "تحديد وتفصيل المهارات التطبيقية بحاجة لتعزيز" : "يتطلب تدريباً أولياً على أدوات وسير العمل التخصصي للشركة",
    "التحقق المباشر عبر مقابلة تقنية لإثبات الخبرة العملية"
  ];

  const tailoredInterviewQuestions = [
    `صف مشروعاً تقنياً رئيسياً قمت بتطبيقه باستخدام مهاراتك في ${candidateSkills[0] || "مجالك"} وكيف تعاملت مع التحديات؟`,
    `كيف تضمن جودة العمل واستيفاء المواعيد النهائية عند إدارة المهام المتعددة؟`,
    `حدثنا عن موقف واجهت فيه اختلافاً في وجهات النظر مع فريق العمل وكيف وصلت لحل عملي؟`
  ];

  const roleName = job?.title || candidate.role || "الوظيفة الشاغرة";
  const summary = `أظهر المرشح توافقاً بمعدل ${score}% مع متطلبات ${roleName}. يمتلك الجدارات الأساسية لإنجاز المهام المطلوبة.`;

  return {
    score,
    skillsMatchScore,
    experienceMatchScore,
    educationMatchScore,
    culturalFitScore,
    summary,
    strengths,
    weaknesses,
    recommendation,
    tailoredInterviewQuestions,
  };
}

serve(async (req) => {
  const corsHeaders = getExtendedCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId, jobId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const tokenStr = authHeader.replace(/^Bearer\s+/i, "").trim();

    let callerId: string | null = null;
    if (tokenStr && tokenStr !== anonKey && tokenStr !== Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) {
      try {
        const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${tokenStr}` } } });
        const { data: userData } = await authClient.auth.getUser();
        if (userData?.user) {
          callerId = userData.user.id;
        }
      } catch (e) {
        console.warn("User auth verification warning:", e);
      }
    }

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();
    if (candErr || !candidate) throw new Error("المرشح غير موجود");

    // Permission check if caller is authenticated
    if (callerId) {
      const isOwner = candidate.user_id === callerId;
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
      const isAdmin = !!roleData;
      let hasCompanyAccess = false;
      if (candidate.company_id) {
        const { data: memberData } = await supabase.from("company_members").select("company_id").eq("company_id", candidate.company_id).eq("user_id", callerId).maybeSingle();
        hasCompanyAccess = !!memberData;
      }
      if (!(isOwner || isAdmin || hasCompanyAccess)) {
        return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to access this candidate" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fetch job if provided
    let job = null;
    if (jobId) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      job = data;
    } else if (candidate.job_id) {
      const { data } = await supabase.from("jobs").select("*").eq("id", candidate.job_id).single();
      job = data;
    }

    let evaluation = null;

    // Try External LLM Gateway
    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
        const API_URL = isDirectGemini
          ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
          : "https://api.lovable.dev/v1/chat/completions";

        const candidateInfo = `
الاسم: ${candidate.name}
الدور: ${candidate.role || "غير محدد"}
المهارات: ${(candidate.skills || []).join(", ") || "غير محددة"}
الخبرة: ${candidate.experience || "غير محددة"}
التعليم: ${candidate.education || "غير محدد"}
الملخص: ${candidate.summary || "غير متوفر"}
`;

        const jobInfo = job ? `
المسمى الوظيفي: ${job.title}
القسم: ${job.department}
الموقع: ${job.location}
نوع العمل: ${job.type}
مستوى الخبرة: ${job.experience_level || "غير محدد"}
الوصف: ${job.description || "غير متوفر"}
المتطلبات: ${(job.requirements || []).join(", ") || "غير محددة"}
` : "لا توجد وظيفة محددة للمقارنة";

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
            tools: [
              {
                type: "function",
                function: {
                  name: "evaluate_candidate",
                  description: "تقييم عالي الدقة لمدى توافق المرشح مع الوظيفة",
                  parameters: {
                    type: "object",
                    properties: {
                      score: { type: "integer", description: "نسبة التوافق الكلية من 0 إلى 100" },
                      skillsMatchScore: { type: "integer", description: "درجة مطابقة المهارات (0-100)" },
                      experienceMatchScore: { type: "integer", description: "درجة مطابقة سنوات وتخصص الخبرة (0-100)" },
                      educationMatchScore: { type: "integer", description: "درجة مطابقة المؤهل العلمي (0-100)" },
                      culturalFitScore: { type: "integer", description: "درجة التوافق التنظيمي والمالي (0-100)" },
                      summary: { type: "string", description: "ملخص التقييم التحليلي في 2-3 جمل بالعربية" },
                      strengths: { type: "array", items: { type: "string" }, description: "أهم نقاط القوة البارزة (3-5 نقاط)" },
                      weaknesses: { type: "array", items: { type: "string" }, description: "الفجوات والمخاطر المتوقعة (2-4 نقاط)" },
                      recommendation: { type: "string", description: "التوصية النهائية باللغة العربية" },
                      tailoredInterviewQuestions: { type: "array", items: { type: "string" }, description: "3 أسئلة مقابلة تقنية مخصصة لهذا المرشح" },
                    },
                    required: ["score", "summary", "strengths", "weaknesses", "recommendation"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "evaluate_candidate" } },
            messages: [
              {
                role: "system",
                content: `أنت خبير كبار الموارد البشرية ومحلل جدارات التوظيف بالذكاء الاصطناعي. قيّم المرشح التالي بدقة متناهية بناءً على معلوماته ومدى توافقه مع الوظيفة.`,
              },
              {
                role: "user",
                content: `قيّم هذا المرشح:\n\n--- معلومات المرشح ---${candidateInfo}\n--- معلومات الوظيفة ---${jobInfo}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            evaluation = JSON.parse(toolCall.function.arguments);
          }
        } else {
          console.warn("AI Gateway response not ok, status:", response.status, await response.text());
        }
      } catch (aiErr) {
        console.warn("LLM API call exception, falling back to smart evaluation:", aiErr);
      }
    }

    // Fallback: Smart Rule-Based AI Evaluator
    if (!evaluation) {
      evaluation = generateSmartFallbackEvaluation(candidate, job);
    }

    // Save evaluation to DB
    await supabase
      .from("candidates")
      .update({
        ai_score: evaluation.score,
        ai_evaluation: JSON.stringify(evaluation),
      })
      .eq("id", candidateId);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});