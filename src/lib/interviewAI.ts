export interface EvaluationCriterion {
  key: string;
  label: string;
  score: number; // 1 to 5
  maxScore: number;
}

export type NormalizedRecommendation = "strong_hire" | "hire" | "maybe" | "no_hire";

export interface ParsedInterviewEvaluation {
  hasEvaluation: boolean;
  scorePercent: number; // 0 to 100
  starRating: number; // 1 to 5
  recommendation: NormalizedRecommendation;
  recommendationLabel: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  communication?: string;
  criteria: EvaluationCriterion[];
  interviewerNotes?: string;
  evaluatorType: "ai" | "human_scorecard" | "hybrid" | "simple";
}

export function normalizeRecommendation(raw: string): { key: NormalizedRecommendation; label: string } {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("strong") || lower.includes("بقوة") || lower.includes("متميز")) {
    return { key: "strong_hire", label: "موصى به بقوة (Strong Hire)" };
  }
  if (lower.includes("no") || lower.includes("رفض") || lower.includes("مرفوض") || lower.includes("غير ملائم")) {
    return { key: "no_hire", label: "غير ملائم (No Hire)" };
  }
  if (lower.includes("maybe") || lower.includes("احتياط") || lower.includes("انتظار") || lower.includes("hold")) {
    return { key: "maybe", label: "قيد المراجعة / احتياط (On Hold)" };
  }
  return { key: "hire", label: "مقبول للتعيين (Hire)" };
}

export function parseInterviewEvaluation(
  notes: string | null | undefined,
  fallbackRating?: number | null
): ParsedInterviewEvaluation {
  const defaultRating = Math.max(1, Math.min(5, Math.round(fallbackRating || 3)));
  const defaultScore = defaultRating * 20;

  if (!notes || typeof notes !== "string" || !notes.trim()) {
    return {
      hasEvaluation: !!fallbackRating,
      scorePercent: defaultScore,
      starRating: defaultRating,
      recommendation: defaultRating >= 4 ? "hire" : defaultRating === 3 ? "maybe" : "no_hire",
      recommendationLabel: defaultRating >= 4 ? "مقبول للتعيين (Hire)" : defaultRating === 3 ? "قيد المراجعة / احتياط (On Hold)" : "غير ملائم (No Hire)",
      summary: "",
      strengths: [],
      weaknesses: [],
      criteria: [],
      evaluatorType: "simple",
    };
  }

  // 1. Check for AI Interview Format
  if (notes.includes("--- تقييم الذكاء الاصطناعي للمقابلة ---")) {
    const rawRec = notes.match(/التوصية:\s*(.*)/)?.[1] || "";
    const scoreStr = notes.match(/التقييم العام:\s*(\d+)/)?.[1] || "";
    const scoreVal = scoreStr ? parseInt(scoreStr, 10) : defaultScore;
    const starVal = Math.max(1, Math.min(5, Math.round(scoreVal / 20)));

    const summaryMatch = notes.match(/الملخص:\s*\n([\s\S]*?)(?=\n\nنقاط القوة:|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : "";

    const strengthsMatch = notes.match(/نقاط القوة:\s*\n([\s\S]*?)(?=\n\nنقاط الضعف:|$)/);
    const strengths = strengthsMatch
      ? strengthsMatch[1]
          .split("\n")
          .map((s) => s.replace(/^-\s*/, "").trim())
          .filter(Boolean)
      : [];

    const weaknessesMatch = notes.match(/نقاط الضعف:\s*\n([\s\S]*?)(?=\n\nمهارات التواصل:|$)/);
    const weaknesses = weaknessesMatch
      ? weaknessesMatch[1]
          .split("\n")
          .map((s) => s.replace(/^-\s*/, "").trim())
          .filter(Boolean)
      : [];

    const commMatch = notes.match(/مهارات التواصل:\s*\n([\s\S]*?)$/);
    const communication = commMatch ? commMatch[1].trim() : "";

    const rec = normalizeRecommendation(rawRec);

    return {
      hasEvaluation: true,
      scorePercent: scoreVal,
      starRating: starVal,
      recommendation: rec.key,
      recommendationLabel: rec.label,
      summary,
      strengths,
      weaknesses,
      communication,
      criteria: [
        { key: "overall", label: "التقييم العام بالذكاء الاصطناعي", score: starVal, maxScore: 5 },
      ],
      evaluatorType: "ai",
    };
  }

  // 2. Check for Live Scorecard Rubric Format
  if (notes.includes("--- بطاقة التقييم اللحظية للمقابلة ---")) {
    const totalMatch = notes.match(/النتيجة الكلية:\s*(\d+)%/);
    const scoreVal = totalMatch ? parseInt(totalMatch[1], 10) : defaultScore;
    const starVal = Math.max(1, Math.min(5, Math.round(scoreVal / 20)));

    const rawRec = notes.match(/التوصية:\s*(.*)/)?.[1] || "";
    const rec = normalizeRecommendation(rawRec);

    const technical = parseInt(notes.match(/المهارات الفنية والتخصصية:\s*(\d+)/)?.[1] || "3", 10);
    const comm = parseInt(notes.match(/مهارات التواصل والحضور:\s*(\d+)/)?.[1] || "3", 10);
    const problemSolving = parseInt(notes.match(/حل المشكلات والتفكير النقدي:\s*(\d+)/)?.[1] || "3", 10);
    const cultureFit = parseInt(notes.match(/التوافق الثقافي والدافعية:\s*(\d+)/)?.[1] || "3", 10);

    const notesMatch = notes.match(/ملاحظات المقيم:\s*\n([\s\S]*?)$/);
    const interviewerNotes = notesMatch ? notesMatch[1].trim() : "";

    return {
      hasEvaluation: true,
      scorePercent: scoreVal,
      starRating: starVal,
      recommendation: rec.key,
      recommendationLabel: rec.label,
      summary: interviewerNotes || "تم تقييم المرشح عبر بطاقة التقييم اللحظية أثناء المقابلة.",
      strengths: technical >= 4 ? ["أداء فني وتخصصي متميز"] : [],
      weaknesses: technical <= 2 ? ["يحتاج إلى تعميق الجانب التقني"] : [],
      interviewerNotes,
      criteria: [
        { key: "technical", label: "المهارات الفنية والتخصصية", score: technical, maxScore: 5 },
        { key: "communication", label: "مهارات التواصل والحضور", score: comm, maxScore: 5 },
        { key: "problemSolving", label: "حل المشكلات والتفكير النقدي", score: problemSolving, maxScore: 5 },
        { key: "cultureFit", label: "التوافق الثقافي والدافعية", score: cultureFit, maxScore: 5 },
      ],
      evaluatorType: "human_scorecard",
    };
  }

  // 3. Fallback: Normal notes with star rating
  const rec = normalizeRecommendation(defaultRating >= 4 ? "hire" : defaultRating === 3 ? "maybe" : "no_hire");
  return {
    hasEvaluation: true,
    scorePercent: defaultScore,
    starRating: defaultRating,
    recommendation: rec.key,
    recommendationLabel: rec.label,
    summary: notes.trim(),
    strengths: [],
    weaknesses: [],
    criteria: [
      { key: "general", label: "التقييم العام", score: defaultRating, maxScore: 5 },
    ],
    interviewerNotes: notes.trim(),
    evaluatorType: "simple",
  };
}
