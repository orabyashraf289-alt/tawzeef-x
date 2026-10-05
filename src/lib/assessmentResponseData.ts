export interface AnswerEntry {
  question_id: string;
  answer: string;
  is_correct: boolean;
  points_earned: number;
  ai_evaluated?: boolean;
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
