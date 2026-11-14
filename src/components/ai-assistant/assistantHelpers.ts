import type { QueryClient } from "@tanstack/react-query";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { CopilotActionData } from "@/types/copilotActions";
import { extractTextFromDocx, extractTextFromPDF } from "@/lib/fileParser";
import { toast } from "@/hooks/use-toast";
import type { BulkMovedData } from "./BulkMovedCard";
import type { ProactiveInsights } from "./ProactiveInsightsCard";
import type {
  AddJobInitialData,
  AssistantMessage,
  CandidateComparisonData,
  CandidateMovedSummary,
  EmailSentSummary,
  InterviewGuideData,
  InterviewScheduledSummary,
  JobCreatedSummary,
  JobData,
  JobPreviewState,
  OfferData,
  StatsReportData,
  StreamActionPayload,
  VoiceBriefingData,
  WhatsappSmsData,
} from "./assistantTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getErrorMessage(err: unknown, fallback = "حدث خطأ غير معروف"): string {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
}

/** Extract structured job draft fields from an assistant markdown response. */
export function extractJobFromMessage(content: string): JobData | null {
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

  const department = getField(["القسم", "الإدارة", "Department"]);
  const location = getField(["الموقع", "المدينة", "Location"]);
  const type = getField(["نوع التوظيف", "نوع الدوام", "النوع", "Type"]);
  if (!department || !location || !type) return null;
  const experience_level = getField(["الخبرة", "مستوى الخبرة", "Experience"]);
  const salaryStr = getField(["الراتب", "نطاق الراتب", "Salary"]);

  let salary_min: number | undefined;
  let salary_max: number | undefined;
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
    salary_min,
    salary_max,
  };
}

export function toAddJobInitialData(job: JobData): AddJobInitialData {
  return {
    title: job.title,
    department: job.department,
    location: job.location,
    type: job.type,
    description: job.description ?? undefined,
    requirements: job.requirements ?? undefined,
    experience: job.experience_level ?? undefined,
    salaryMin: job.salary_min !== null && job.salary_min !== undefined ? String(job.salary_min) : undefined,
    salaryMax: job.salary_max !== null && job.salary_max !== undefined ? String(job.salary_max) : undefined,
  };
}

export function toJsonValue(value: unknown): Json {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (isRecord(value)) {
    const obj: { [key: string]: Json | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        obj[key] = toJsonValue(entry);
      }
    }
    return obj;
  }
  return null;
}

export function buildMessageMetadata(
  msg: AssistantMessage,
  overrides?: {
    jobPreview?: JobPreviewState;
    jobCreated?: JobCreatedSummary | null;
  }
): Json {
  const raw: Record<string, unknown> = {};
  if (msg.jobCreated) raw.jobCreated = msg.jobCreated;
  if (msg.jobUpdated) raw.jobUpdated = msg.jobUpdated;
  if (msg.jobPreview) raw.jobPreview = msg.jobPreview;
  if (msg.candidateMoved) raw.candidateMoved = msg.candidateMoved;
  if (msg.interviewScheduled) raw.interviewScheduled = msg.interviewScheduled;
  if (msg.offerCreated) raw.offerCreated = msg.offerCreated;
  if (msg.statsReport) raw.statsReport = msg.statsReport;
  if (msg.proactiveInsights) raw.proactiveInsights = msg.proactiveInsights;
  if (msg.emailSent) raw.emailSent = msg.emailSent;
  if (msg.bulkMoved) raw.bulkMoved = msg.bulkMoved;
  if (msg.candidateComparison) raw.candidateComparison = msg.candidateComparison;
  if (msg.interviewGuide) raw.interviewGuide = msg.interviewGuide;
  if (msg.whatsappSms) raw.whatsappSms = msg.whatsappSms;
  if (msg.voiceBriefing) raw.voiceBriefing = msg.voiceBriefing;
  if (msg.copilotAction) raw.copilotAction = msg.copilotAction;

  if (overrides) {
    if ("jobPreview" in overrides) {
      if (overrides.jobPreview) raw.jobPreview = overrides.jobPreview;
      else delete raw.jobPreview;
    }
    if ("jobCreated" in overrides) {
      raw.jobCreated = overrides.jobCreated;
    }
  }

  return Object.keys(raw).length > 0 ? toJsonValue(raw) : {};
}

function pickMetadataField<T>(meta: Record<string, unknown>, key: string): T | undefined {
  const val = meta[key];
  return isRecord(val) ? (val as unknown as T) : undefined;
}

export function parseChatMessageRow(row: Tables<"chat_messages">): AssistantMessage {
  const meta = isRecord(row.metadata) ? row.metadata : {};
  const role: "user" | "assistant" = row.role === "user" ? "user" : "assistant";

  return {
    id: row.id,
    role,
    content: row.content,
    jobCreated: pickMetadataField<JobCreatedSummary>(meta, "jobCreated"),
    jobUpdated: pickMetadataField<JobCreatedSummary>(meta, "jobUpdated"),
    jobPreview: pickMetadataField<JobPreviewState>(meta, "jobPreview"),
    candidateMoved: pickMetadataField<CandidateMovedSummary>(meta, "candidateMoved"),
    interviewScheduled: pickMetadataField<InterviewScheduledSummary>(meta, "interviewScheduled"),
    offerCreated: pickMetadataField<OfferData>(meta, "offerCreated"),
    statsReport: pickMetadataField<StatsReportData>(meta, "statsReport"),
    proactiveInsights: pickMetadataField<ProactiveInsights>(meta, "proactiveInsights"),
    emailSent: pickMetadataField<EmailSentSummary>(meta, "emailSent"),
    bulkMoved: pickMetadataField<BulkMovedData>(meta, "bulkMoved"),
    candidateComparison: pickMetadataField<CandidateComparisonData>(meta, "candidateComparison"),
    interviewGuide: pickMetadataField<InterviewGuideData>(meta, "interviewGuide"),
    whatsappSms: pickMetadataField<WhatsappSmsData>(meta, "whatsappSms"),
    voiceBriefing: pickMetadataField<VoiceBriefingData>(meta, "voiceBriefing"),
    copilotAction: pickMetadataField<CopilotActionData>(meta, "copilotAction"),
  };
}

export function applyActionToMessage(
  msg: AssistantMessage,
  action: StreamActionPayload,
  queryClient: QueryClient,
  isStreamMode: boolean
): void {
  if (action.type === "job_preview" && action.job_data) {
    msg.jobPreview = { data: action.job_data, status: "pending" };
  } else if (action.type === "job_created" && action.job) {
    msg.jobCreated = action.job;
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  } else if (action.type === "job_updated" && action.job) {
    msg.jobUpdated = action.job;
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  } else if (action.type === "candidate_moved" && action.candidate) {
    msg.candidateMoved = action.candidate;
    void queryClient.invalidateQueries({ queryKey: ["candidates"] });
  } else if (action.type === "interview_scheduled" && action.interview) {
    msg.interviewScheduled = action.interview;
    void queryClient.invalidateQueries({
      queryKey: isStreamMode ? ["interviews", "candidates"] : ["interviews"],
    });
  } else if (action.type === "offer_created" && action.offer) {
    msg.offerCreated = action.offer;
    void queryClient.invalidateQueries({
      queryKey: isStreamMode ? ["offers", "candidates"] : ["offers"],
    });
  } else if (action.type === "stats_report" && action.stats) {
    msg.statsReport = { report_type: action.report_type || "", stats: action.stats };
  } else if (action.type === "proactive_insights" && action.insights) {
    msg.proactiveInsights = action.insights;
  } else if (action.type === "email_sent" && action.email) {
    msg.emailSent = action.email;
  } else if (action.type === "bulk_moved" && action.result) {
    msg.bulkMoved = action.result;
    void queryClient.invalidateQueries({ queryKey: ["candidates"] });
  } else if (action.type === "candidate_comparison" && action.comparison) {
    msg.candidateComparison = action.comparison;
  } else if (action.type === "interview_guide_generated" && action.guide) {
    msg.interviewGuide = action.guide;
  } else if (action.type === "whatsapp_sms_template" && action.dispatcher) {
    msg.whatsappSms = action.dispatcher;
  } else if (action.type === "voice_briefing_generated" && action.briefing) {
    msg.voiceBriefing = action.briefing;
  }
}

export async function readAssistantFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf")) {
      return await extractTextFromPDF(file);
    }
    if (name.endsWith(".docx")) {
      return await extractTextFromDocx(file);
    }
    if (name.endsWith(".doc")) {
      toast({
        title: "صيغة غير مدعومة بالكامل",
        description: "يرجى تحويل ملف .doc إلى .docx أو .pdf لتحليله بشكل أفضل.",
        variant: "destructive",
      });
      return await file.text();
    }
    return await file.text();
  } catch (err) {
    console.error("Error reading file:", file.name, err);
    throw err;
  }
}
