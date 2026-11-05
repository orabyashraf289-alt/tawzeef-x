export interface AnswerEntry {
  question_id: string;
  answer: string;
  is_correct: boolean;
  points_earned: number;
  max_points?: number;
  ai_evaluated?: boolean;
  requires_review?: boolean;
  ai_feedback?: string;
  ai_strengths?: string;
  ai_improvements?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readAssessmentAnswers(value: unknown): AnswerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.question_id !== "string" || typeof entry.answer !== "string") return [];
    if (entry.points_earned != null && (typeof entry.points_earned !== "number" || !Number.isFinite(entry.points_earned))) return [];
    if (entry.is_correct != null && typeof entry.is_correct !== "boolean") return [];
    return [{
      question_id: entry.question_id,
      answer: entry.answer,
      is_correct: entry.is_correct === true,
      points_earned: typeof entry.points_earned === "number" ? entry.points_earned : 0,
      ...(typeof entry.max_points === "number" && Number.isFinite(entry.max_points) ? { max_points: entry.max_points } : {}),
      ...(typeof entry.requires_review === "boolean" ? { requires_review: entry.requires_review } : {}),
      ...(typeof entry.ai_evaluated === "boolean" ? { ai_evaluated: entry.ai_evaluated } : {}),
      ...(typeof entry.ai_feedback === "string" ? { ai_feedback: entry.ai_feedback } : {}),
      ...(typeof entry.ai_strengths === "string" ? { ai_strengths: entry.ai_strengths } : {}),
      ...(typeof entry.ai_improvements === "string" ? { ai_improvements: entry.ai_improvements } : {}),
    }];
  });
}

interface ProctoringData {
  cheat_score?: number;
  cheat_level?: string;
  counters: Record<string, number>;
  events: { time: string; type: string }[];
}

export function readProctoringLog(value: unknown): ProctoringData | null {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!isRecord(parsed)) return null;
  const counters: Record<string, number> = {};
  if (isRecord(parsed.counters)) {
    for (const [key, count] of Object.entries(parsed.counters)) {
      if (typeof count === "number" && Number.isFinite(count) && count >= 0) counters[key] = count;
    }
  }
  const events = Array.isArray(parsed.events) ? parsed.events.flatMap((event) =>
    isRecord(event) && typeof event.time === "string" && typeof event.type === "string"
      ? [{ time: event.time, type: event.type }] : []) : [];
  return {
    ...(typeof parsed.cheat_score === "number" && Number.isFinite(parsed.cheat_score) && parsed.cheat_score >= 0 && parsed.cheat_score <= 100
      ? { cheat_score: parsed.cheat_score } : {}),
    ...(typeof parsed.cheat_level === "string" ? { cheat_level: parsed.cheat_level } : {}),
    counters,
    events,
  };
}

export interface ReviewQuestion {
  id: string;
  question_text: string;
  points: number;
  question_type: string;
  options?: { id: string; option_text: string }[];
}

export function displayAssessmentAnswer(answer: string, question?: ReviewQuestion): string {
  if (!answer) return "لم تُقدم إجابة";
  if (question?.question_type === "multiple_choice") return question.options?.find(option => option.id === answer)?.option_text || answer;
  if (question?.question_type === "true_false") return answer === "true" ? "صحيح" : answer === "false" ? "خطأ" : answer;
  try {
    const parsed = JSON.parse(answer);
    if (question?.question_type === "ordering" && Array.isArray(parsed) && parsed.every(item => typeof item === "string")) return parsed.map((item, i) => `${i + 1}. ${item}`).join("\n");
    if (question?.question_type === "matching" && isRecord(parsed)) return Object.entries(parsed).map(([id, value]) => `${question.options?.find(option => option.id === id)?.option_text || id}: ${String(value)}`).join("\n");
  } catch { /* Preserve the recorded answer if a legacy value is not structured. */ }
  return answer;
}
