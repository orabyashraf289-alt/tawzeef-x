export type CopilotActionType =
  | "create_job"
  | "schedule_interview"
  | "move_candidate"
  | "filter_candidates"
  | "whatsapp_dispatch";

export type CopilotActionStatus =
  | "pending_review"
  | "executing"
  | "executed"
  | "cancelled"
  | "failed";

export interface CopilotJobPayload {
  title: string;
  department: string;
  location: string;
  type: string;
  salary_min?: number;
  salary_max?: number;
  experience_level?: string;
  description?: string;
  requirements?: string[];
}

export interface CopilotInterviewPayload {
  candidate_id?: string;
  candidate_name: string;
  position: string;
  date: string;
  time: string;
  type: "فيديو أونلاين" | "حضوري" | "هاتفي" | string;
  meeting_url?: string;
  interviewer?: string;
}

export interface CopilotMovePayload {
  candidate_id: string;
  candidate_name: string;
  current_stage: string;
  target_stage: string;
  previous_stage?: string;
}

export interface CopilotMatchedCandidate {
  id: string;
  name: string;
  role: string;
  stage: string;
  match_score: number;
  phone?: string;
  email?: string;
  skills?: string[];
}

export interface CopilotFilterPayload {
  job_id?: string;
  job_title?: string;
  query?: string;
  matched_candidates?: CopilotMatchedCandidate[];
}

export interface CopilotWhatsappPayload {
  candidate_id?: string;
  candidate_name: string;
  phone: string;
  message: string;
}

export interface CopilotActionData {
  id: string;
  type: CopilotActionType;
  title: string;
  description: string;
  status: CopilotActionStatus;
  resultDetails?: string;
  recordId?: string;
  executedAt?: string;
  jobPayload?: CopilotJobPayload;
  interviewPayload?: CopilotInterviewPayload;
  movePayload?: CopilotMovePayload;
  filterPayload?: CopilotFilterPayload;
  whatsappPayload?: CopilotWhatsappPayload;
}
