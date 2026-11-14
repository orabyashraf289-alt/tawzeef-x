import type { CopilotActionData } from "@/types/copilotActions";
import type { BulkMovedData } from "./BulkMovedCard";
import type { ProactiveInsights } from "./ProactiveInsightsCard";

export interface JobData {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string | null;
  requirements?: string[] | string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface JobConfirmOverride {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string;
  requirements?: string | string[];
  experience?: string;
  experience_level?: string;
  salaryMin?: string;
  salaryMax?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  approvalChain?: string;
}

export interface AddJobInitialData {
  title?: string;
  department?: string;
  location?: string;
  type?: string;
  description?: string;
  requirements?: string | string[];
  salaryMin?: string;
  salaryMax?: string;
  experience?: string;
  approvalChain?: string;
}

export interface OfferData {
  benefits?: string[] | null;
  start_date?: string | null;
  id: string;
  candidate_name: string;
  position: string;
  salary: number;
  currency: string;
  token: string;
}

export interface ComparisonCandidate {
  id: string;
  name: string;
  role: string;
  rating: number;
  matchScore: number;
  experience: string;
  skills: string[];
  education: string;
  summary: string;
  matchAnalysis: string;
}

export interface CandidateComparisonData {
  jobTitle?: string;
  candidates: ComparisonCandidate[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  expectedAnswer: string;
  score: number;
}

export interface InterviewGuideData {
  candidateName: string;
  jobTitle: string;
  experience?: string;
  questions: InterviewQuestion[];
}

export interface WhatsappSmsData {
  candidateName: string;
  phone: string;
  message: string;
  messageType: string;
}

export interface VoiceBriefingData {
  briefingText: string;
  briefingType: "daily" | "weekly";
  stats: {
    activeJobs: number;
    activeCandidates: number;
    upcomingInterviews: number;
    pendingOffers: number;
  };
}

export interface AssistantStatsData {
  total_jobs?: number;
  total_candidates?: number;
  total_interviews?: number;
  total_offers?: number;
  acceptance_rate?: number;
  pipeline?: Record<string, number>;
  accepted?: number;
  rejected?: number;
  pending?: number;
  avg_salary?: number;
  total?: number;
  sources?: Record<string, number>;
  monthly?: Record<string, { candidates: number; interviews: number; offers: number }>;
}

export interface JobCreatedSummary {
  id: string;
  title: string;
}

export interface JobPreviewState {
  data: JobData;
  status: "pending" | "confirmed" | "rejected";
}

export interface CandidateMovedSummary {
  name: string;
  old_stage: string;
  new_stage: string;
}

export interface InterviewScheduledSummary {
  id: string;
  candidate_name: string;
  date: string;
  time: string;
  meeting_url: string;
  type: string;
}

export interface EmailSentSummary {
  candidate_name: string;
  to: string;
  subject: string;
  success: boolean;
}

export interface StatsReportData {
  report_type: string;
  stats: AssistantStatsData;
}

export interface AssistantMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  jobCreated?: JobCreatedSummary;
  jobUpdated?: JobCreatedSummary;
  jobPreview?: JobPreviewState;
  candidateMoved?: CandidateMovedSummary;
  interviewScheduled?: InterviewScheduledSummary;
  offerCreated?: OfferData;
  statsReport?: StatsReportData;
  proactiveInsights?: ProactiveInsights;
  emailSent?: EmailSentSummary;
  bulkMoved?: BulkMovedData;
  candidateComparison?: CandidateComparisonData;
  interviewGuide?: InterviewGuideData;
  whatsappSms?: WhatsappSmsData;
  voiceBriefing?: VoiceBriefingData;
  copilotAction?: CopilotActionData;
  isStreaming?: boolean;
}

export interface ConversationRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

export interface StreamActionPayload {
  type: string;
  job_data?: JobData;
  job?: JobCreatedSummary;
  candidate?: CandidateMovedSummary;
  interview?: InterviewScheduledSummary;
  offer?: OfferData;
  report_type?: string;
  stats?: AssistantStatsData;
  insights?: ProactiveInsights;
  email?: EmailSentSummary;
  result?: BulkMovedData;
  comparison?: CandidateComparisonData;
  guide?: InterviewGuideData;
  dispatcher?: WhatsappSmsData;
  briefing?: VoiceBriefingData;
}

export interface ChatJsonResponse extends StreamActionPayload {
  error?: string;
  content?: string;
}

export interface QrDialogState {
  open: boolean;
  jobId: string;
  jobTitle: string;
}

export interface EditJobModalState {
  open: boolean;
  data: AddJobInitialData | null;
  msgIndex: number | null;
}

export interface CompareDialogState {
  open: boolean;
  reply: string;
  baseMessages: { role: "user" | "assistant"; content: string }[];
  modelLabel: string;
}
