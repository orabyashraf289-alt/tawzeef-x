import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(supabaseUrl: string, to: string, subject: string, html: string, userId?: string) {
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ to, subject, html, user_id: userId }),
    });
    if (!resp.ok) {
      console.error("Email send failed:", await resp.text());
    }
  } catch (e) {
    console.error("Email send error:", e);
  }
}

function buildApprovalEmail(candidateName: string, newStage: string, jobTitle: string): string {
  return `
  <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ تحديث حالة طلبك</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151;">مرحباً <strong>${candidateName}</strong>،</p>
      <p style="font-size: 16px; color: #374151;">يسعدنا إبلاغك بأنه تم نقلك إلى مرحلة جديدة في عملية التوظيف:</p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px;">المرحلة الحالية</p>
        <p style="font-size: 20px; font-weight: bold; color: #059669; margin: 0;">${newStage}</p>
        ${jobTitle ? `<p style="font-size: 14px; color: #6b7280; margin: 10px 0 0;">الوظيفة: ${jobTitle}</p>` : ''}
      </div>
      <p style="font-size: 14px; color: #6b7280;">سيتم التواصل معك قريباً بخصوص الخطوات التالية.</p>
      <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
    </div>
  </div>`;
}

function buildRejectionEmail(candidateName: string, stage: string, reason: string, jobTitle: string): string {
  return `
  <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">تحديث حالة طلبك</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151;">مرحباً <strong>${candidateName}</strong>،</p>
      <p style="font-size: 16px; color: #374151;">نشكرك على اهتمامك والوقت الذي استثمرته في عملية التقديم${jobTitle ? ` لوظيفة ${jobTitle}` : ''}.</p>
      <p style="font-size: 16px; color: #374151;">نأسف لإبلاغك بأنه لم يتم المضي قدماً في طلبك في هذه المرحلة.</p>
      ${reason ? `<div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;"><p style="font-size: 14px; color: #6b7280; margin: 0;"><strong>ملاحظة:</strong> ${reason}</p></div>` : ''}
      <p style="font-size: 14px; color: #6b7280;">نتمنى لك كل التوفيق في مسيرتك المهنية.</p>
      <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
    </div>
  </div>`;
}

function buildAssessmentEmail(candidateName: string, assessmentTitle: string, assessmentUrl: string, jobTitle: string): string {
  return `
  <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📝 اختبار مطلوب</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151;">مرحباً <strong>${candidateName}</strong>،</p>
      <p style="font-size: 16px; color: #374151;">كجزء من عملية التوظيف${jobTitle ? ` لوظيفة ${jobTitle}` : ''}، نرجو منك إكمال الاختبار التالي:</p>
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px;">الاختبار</p>
        <p style="font-size: 18px; font-weight: bold; color: #4f46e5; margin: 0 0 15px;">${assessmentTitle}</p>
        <a href="${assessmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: bold;">ابدأ الاختبار الآن</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">يرجى إكمال الاختبار في أقرب وقت ممكن.</p>
      <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
    </div>
  </div>`;
}

async function getCustomTemplate(
  supabase: any,
  companyId: string | null,
  templateType: "approval" | "rejection" | "assessment"
) {
  if (!companyId) return null;

  const companyIds = [companyId];
  try {
    const { data: comp } = await supabase
      .from("companies")
      .select("parent_company_id")
      .eq("id", companyId)
      .maybeSingle();
    if (comp?.parent_company_id) {
      companyIds.push(comp.parent_company_id);
    }
  } catch (e) {
    console.error("Failed to query parent company for template inheritance:", e);
  }

  for (const cid of companyIds.filter(Boolean)) {
    const { data, error } = await supabase
      .from("notification_templates")
      .select("subject, body_html")
      .eq("company_id", cid)
      .eq("type", templateType)
      .maybeSingle();
    if (!error && data) {
      return data;
    }
  }
  return null;
}

function compileTemplate(
  bodyHtml: string,
  subjectText: string,
  vars: {
    candidateName: string;
    stageName: string;
    jobTitle: string;
    rejectionReason?: string;
    assessmentUrl?: string;
    assessmentTitle?: string;
  }
) {
  const replaceAll = (text: string) => {
    return text
      .replace(/{candidate_name}/g, vars.candidateName)
      .replace(/{stage_name}/g, vars.stageName)
      .replace(/{job_title}/g, vars.jobTitle)
      .replace(/{rejection_reason}/g, vars.rejectionReason || "")
      .replace(/{assessment_url}/g, vars.assessmentUrl || "")
      .replace(/{assessment_title}/g, vars.assessmentTitle || "");
  };

  return {
    subject: replaceAll(subjectText),
    html: replaceAll(bodyHtml),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId, newStage, action, rejectionReason } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*, jobs(title, user_id)")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Robust Authorization Check (BOLA Remediation)
    const isOwner = candidate.user_id === callerId;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    const isAdmin = !!roleData;
    let hasCompanyAccess = false;
    if (candidate.company_id) {
      const { data: memberData } = await supabase.from("company_members").select("company_id").eq("company_id", candidate.company_id).eq("user_id", callerId).maybeSingle();
      hasCompanyAccess = !!memberData;
    }
    if (!(isOwner || isAdmin || hasCompanyAccess)) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to modify this candidate" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oldStage = candidate.stage;
    const jobTitle = candidate.jobs?.title || "";
    const updates: Record<string, any> = {};

    if (action === "reject") {
      updates.status = "مرفوض";
      updates.stage = oldStage;
    } else if (action === "approve") {
      updates.stage = newStage;
      if (newStage === "العرض الوظيفي") {
        updates.status = "مقبول";
      }
    }

    const { error: updateError } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidateId);

    if (updateError) throw updateError;

    // Stage labels
    const stageLabels: Record<string, string> = {
      "تقديم الطلب": "تقديم الطلب",
      "مراجعة السيرة": "مراجعة السيرة الذاتية",
      "فحص هاتفي": "الفحص الهاتفي",
      "مقابلة تقنية": "المقابلة التقنية",
      "مقابلة نهائية": "المقابلة النهائية",
      "العرض الوظيفي": "العرض الوظيفي",
    };

    let notifTitle: string;
    let notifDesc: string;

    if (action === "reject") {
      notifTitle = `تم رفض المرشح: ${candidate.name}`;
      notifDesc = `تم رفض ${candidate.name} في مرحلة "${stageLabels[oldStage] || oldStage}"${rejectionReason ? ` - السبب: ${rejectionReason}` : ""}`;
    } else {
      notifTitle = `تم نقل ${candidate.name} إلى "${stageLabels[newStage] || newStage}"`;
      notifDesc = `انتقل المرشح ${candidate.name} من "${stageLabels[oldStage] || oldStage}" إلى "${stageLabels[newStage] || newStage}"`;
    }

    await supabase.from("notifications").insert({
      user_id: candidate.user_id,
      title: notifTitle,
      description: notifDesc,
      type: action === "reject" ? "rejection" : "stage_change",
    });

    await supabase.from("activity_log").insert({
      user_id: candidate.user_id,
      action: action === "reject" ? "رفض مرشح" : "نقل مرشح",
      entity_type: "candidate",
      entity_id: candidateId,
      details: action === "reject"
        ? `تم رفض ${candidate.name}${rejectionReason ? `: ${rejectionReason}` : ""}`
        : `تم نقل ${candidate.name} من "${oldStage}" إلى "${newStage}"`,
    });

    // Send email to candidate
    if (candidate.email) {
      if (action === "reject") {
        const customTpl = await getCustomTemplate(supabase, candidate.company_id, "rejection");
        let subject = `تحديث حالة طلبك${jobTitle ? ` - ${jobTitle}` : ''}`;
        let html = buildRejectionEmail(candidate.name, oldStage, rejectionReason || "", jobTitle);
        
        if (customTpl) {
          const compiled = compileTemplate(customTpl.body_html, customTpl.subject, {
            candidateName: candidate.name,
            stageName: stageLabels[oldStage] || oldStage,
            jobTitle,
            rejectionReason: rejectionReason || "",
          });
          subject = compiled.subject;
          html = compiled.html;
        }
        await sendEmail(supabaseUrl, candidate.email, subject, html, candidate.user_id);
      } else if (action === "approve") {
        const customTpl = await getCustomTemplate(supabase, candidate.company_id, "approval");
        let subject = `تحديث حالة طلبك - ${stageLabels[newStage] || newStage}`;
        let html = buildApprovalEmail(candidate.name, newStage, jobTitle);

        if (customTpl) {
          const compiled = compileTemplate(customTpl.body_html, customTpl.subject, {
            candidateName: candidate.name,
            stageName: stageLabels[newStage] || newStage,
            jobTitle,
          });
          subject = compiled.subject;
          html = compiled.html;
        }
        await sendEmail(supabaseUrl, candidate.email, subject, html, candidate.user_id);

        // Check if the new stage has a linked assessment and auto-send
        const { data: stageData } = await supabase
          .from("pipeline_stages")
          .select("assessment_id")
          .eq("user_id", candidate.user_id)
          .eq("name", newStage)
          .maybeSingle();

        if (stageData?.assessment_id) {
          const { data: assessment } = await supabase
            .from("assessments")
            .select("token, title")
            .eq("id", stageData.assessment_id)
            .eq("is_active", true)
            .maybeSingle();

          if (assessment) {
            const assessmentUrl = `${supabaseUrl.replace('/rest/v1', '').replace('https://odtpjvmayutbwqhlbvsr.supabase.co', Deno.env.get('APP_URL') || 'https://ai-hire-buddy-22.lovable.app')}/assessment/${assessment.token}`;
            const customTpl = await getCustomTemplate(supabase, candidate.company_id, "assessment");
            let subject = `اختبار مطلوب: ${assessment.title}`;
            let html = buildAssessmentEmail(candidate.name, assessment.title, assessmentUrl, jobTitle);

            if (customTpl) {
              const compiled = compileTemplate(customTpl.body_html, customTpl.subject, {
                candidateName: candidate.name,
                stageName: stageLabels[newStage] || newStage,
                jobTitle,
                assessmentUrl,
                assessmentTitle: assessment.title,
              });
              subject = compiled.subject;
              html = compiled.html;
            }
            await sendEmail(supabaseUrl, candidate.email, subject, html, candidate.user_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, candidate: { ...candidate, ...updates } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
