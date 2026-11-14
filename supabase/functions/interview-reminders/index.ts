import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  buildReminderEmailHtml,
  DEFAULT_REMINDER_MAX_INCLUSIVE,
  DEFAULT_REMINDER_MIN_EXCLUSIVE,
  evaluateReminderWindow,
  formatInterviewLocalTime,
  getCandidateDateStrings,
  isReminderAuthorized,
  type CompanyTimezoneSource,
  type InterviewReminderRecord,
  type ReminderEvaluationItem,
  type ReminderRunSummary,
} from "../_shared/interviewReminders.ts";

interface ExistingNotificationRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
}

interface CompanyRow {
  id: string;
  country: string | null;
  brand_settings: Record<string, unknown> | null;
}

function getReminderCorsHeaders(req: Request): Record<string, string> {
  const base = getCorsHeaders(req);
  return {
    ...base,
    "Access-Control-Allow-Headers": `${base["Access-Control-Allow-Headers"]}, x-cron-secret`,
  };
}

serve(async (req) => {
  const corsHeaders = getReminderCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cronSecret = Deno.env.get("CRON_SECRET") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authorized = isReminderAuthorized({
      authorizationHeader: req.headers.get("Authorization"),
      cronSecretHeader: req.headers.get("x-cron-secret"),
      cronSecret,
      serviceRoleKey,
    });

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const candidateDates = getCandidateDateStrings(now);

    // Fetch scheduled interviews spanning [-1, +2] UTC days to cover all timezones across midnight
    const { data: interviewsData, error: interviewsError } = await supabase
      .from("interviews")
      .select(
        "id, user_id, interviewer_id, company_id, candidate_name, position, date, time, time_zone, starts_at, status, interviewer, meeting_url",
      )
      .in("date", candidateDates)
      .eq("status", "مجدولة");

    if (interviewsError) {
      console.error("Query error:", interviewsError);
      throw interviewsError;
    }

    const interviews = (interviewsData || []) as InterviewReminderRecord[];

    const companyIds = Array.from(
      new Set(
        interviews
          .map((item) => item.company_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const companyMap = new Map<string, CompanyTimezoneSource>();
    if (companyIds.length > 0) {
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, country, brand_settings")
        .in("id", companyIds);

      if (companiesError) {
        console.warn("Failed loading company timezone metadata:", companiesError.message);
      } else {
        for (const company of (companiesData || []) as CompanyRow[]) {
          const brandSettings =
            company.brand_settings &&
            typeof company.brand_settings === "object" &&
            !Array.isArray(company.brand_settings)
              ? company.brand_settings
              : null;
          companyMap.set(company.id, {
            country: company.country,
            brand_settings: brandSettings,
          });
        }
      }
    }

    const lookbackIso = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const recipientUserIds = Array.from(
      new Set(
        interviews
          .flatMap((item) => [item.user_id, item.interviewer_id])
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const recentNotifsByUser = new Map<string, ExistingNotificationRow[]>();
    if (recipientUserIds.length > 0) {
      const { data: existingData, error: existingError } = await supabase
        .from("notifications")
        .select("id, user_id, title, description")
        .in("user_id", recipientUserIds)
        .eq("type", "interview_reminder")
        .gte("created_at", lookbackIso)
        .limit(500);

      if (existingError) {
        console.warn("Failed fetching recent reminder notifications:", existingError.message);
      } else {
        for (const row of (existingData || []) as ExistingNotificationRow[]) {
          const list = recentNotifsByUser.get(row.user_id) || [];
          list.push(row);
          recentNotifsByUser.set(row.user_id, list);
        }
      }
    }

    let remindersCreated = 0;
    let emailsSent = 0;
    let eligibleInWindow = 0;
    let skippedDuplicate = 0;
    let skippedOutOfWindow = 0;
    let skippedInvalid = 0;
    let failed = 0;
    const details: ReminderEvaluationItem[] = [];

    for (const interview of interviews) {
      const company = interview.company_id ? companyMap.get(interview.company_id) : null;
      const evaluation = evaluateReminderWindow(interview, {
        now,
        company,
        minExclusiveMinutes: DEFAULT_REMINDER_MIN_EXCLUSIVE,
        maxInclusiveMinutes: DEFAULT_REMINDER_MAX_INCLUSIVE,
      });

      if (evaluation.reason === "invalid_time" || !evaluation.startsAtUtc) {
        skippedInvalid += 1;
        details.push({
          interview_id: interview.id,
          candidate_name: interview.candidate_name,
          time_zone: evaluation.timeZone,
          starts_at_utc: null,
          minutes_until: null,
          status: "skipped_invalid_time",
          reason: "Invalid date, time, or timezone",
        });
        continue;
      }

      if (!evaluation.eligible) {
        skippedOutOfWindow += 1;
        details.push({
          interview_id: interview.id,
          candidate_name: interview.candidate_name,
          time_zone: evaluation.timeZone,
          starts_at_utc: evaluation.startsAtUtc.toISOString(),
          minutes_until:
            evaluation.minutesUntil !== null ? Math.round(evaluation.minutesUntil) : null,
          status: "skipped_out_of_window",
        });
        continue;
      }

      eligibleInWindow += 1;
      const localTime = formatInterviewLocalTime(evaluation.startsAtUtc, evaluation.timeZone);
      const recipients = Array.from(
        new Set(
          [interview.user_id, interview.interviewer_id].filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
        ),
      );

      let notifiedForInterview = 0;
      let duplicateForInterview = 0;
      let emailSentForInterview = false;
      let failureReason: string | undefined;

      for (const recipientId of recipients) {
        const userRecent = recentNotifsByUser.get(recipientId) || [];
        const alreadySent = userRecent.some(
          (n) =>
            n.title.includes(interview.candidate_name) &&
            (n.description || "").includes(localTime),
        );

        if (alreadySent) {
          duplicateForInterview += 1;
          continue;
        }

        const meetingInfo = interview.meeting_url
          ? `\n🔗 رابط المقابلة: ${interview.meeting_url}`
          : "";
        const interviewerInfo = interview.interviewer
          ? ` | المحاور: ${interview.interviewer}`
          : "";

        const notificationTitle = `⏰ تذكير: مقابلة ${interview.candidate_name} بعد ساعة`;
        const notificationDescription = `لديك مقابلة مع ${interview.candidate_name} لوظيفة ${interview.position} الساعة ${localTime} (${evaluation.timeZone})${interviewerInfo}${meetingInfo}`;

        const { error: insertError } = await supabase.from("notifications").insert({
          user_id: recipientId,
          title: notificationTitle,
          description: notificationDescription,
          type: "interview_reminder",
        });

        if (insertError) {
          console.error("Failed to insert reminder notification:", insertError);
          failureReason = insertError.message;
          continue;
        }

        remindersCreated += 1;
        notifiedForInterview += 1;
        userRecent.push({
          id: `${interview.id}-${recipientId}`,
          user_id: recipientId,
          title: notificationTitle,
          description: notificationDescription,
        });
        recentNotifsByUser.set(recipientId, userRecent);

        try {
          const emailHtml = buildReminderEmailHtml(interview, localTime, evaluation.timeZone);
          const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_id: recipientId,
              notify_recruiter: true,
              subject: `⏰ تذكير: مقابلة ${interview.candidate_name} الساعة ${localTime} (${evaluation.timeZone})`,
              html: emailHtml,
            }),
          });

          if (emailResp.ok) {
            emailsSent += 1;
            emailSentForInterview = true;
          } else {
            const errText = await emailResp.text();
            console.warn("Reminder email delivery returned non-OK status:", emailResp.status, errText);
          }
        } catch (emailErr) {
          console.error("Failed to send reminder email:", emailErr);
        }
      }

      if (notifiedForInterview > 0) {
        details.push({
          interview_id: interview.id,
          candidate_name: interview.candidate_name,
          time_zone: evaluation.timeZone,
          starts_at_utc: evaluation.startsAtUtc.toISOString(),
          minutes_until:
            evaluation.minutesUntil !== null ? Math.round(evaluation.minutesUntil) : null,
          status: "sent",
          email_sent: emailSentForInterview,
          recipients_notified: notifiedForInterview,
        });
      } else if (duplicateForInterview === recipients.length && recipients.length > 0) {
        skippedDuplicate += 1;
        details.push({
          interview_id: interview.id,
          candidate_name: interview.candidate_name,
          time_zone: evaluation.timeZone,
          starts_at_utc: evaluation.startsAtUtc.toISOString(),
          minutes_until:
            evaluation.minutesUntil !== null ? Math.round(evaluation.minutesUntil) : null,
          status: "skipped_duplicate",
        });
      } else {
        failed += 1;
        details.push({
          interview_id: interview.id,
          candidate_name: interview.candidate_name,
          time_zone: evaluation.timeZone,
          starts_at_utc: evaluation.startsAtUtc.toISOString(),
          minutes_until:
            evaluation.minutesUntil !== null ? Math.round(evaluation.minutesUntil) : null,
          status: "failed",
          reason: failureReason || "No eligible recipients or notification insert failed",
        });
      }
    }

    const summary: ReminderRunSummary = {
      success: true,
      evaluated_at: now.toISOString(),
      window_minutes: {
        minExclusive: DEFAULT_REMINDER_MIN_EXCLUSIVE,
        maxInclusive: DEFAULT_REMINDER_MAX_INCLUSIVE,
      },
      total_evaluated: interviews.length,
      eligible_in_window: eligibleInWindow,
      reminders_created: remindersCreated,
      emails_sent: emailsSent,
      skipped_duplicate: skippedDuplicate,
      skipped_out_of_window: skippedOutOfWindow,
      skipped_invalid: skippedInvalid,
      failed,
      details,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interview-reminders error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
