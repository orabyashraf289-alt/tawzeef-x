export const DEFAULT_PIPELINE_STAGES = [
  "تقديم الطلب",
  "فحص السيرة",
  "اختبار تحريري",
  "مقابلة تقنية",
  "مقابلة نهائية",
  "العرض الوظيفي",
];

export const FALLBACK_STAGES = DEFAULT_PIPELINE_STAGES;

export const INTERVIEW_STAGES = ["مقابلة تقنية", "مقابلة نهائية", "مقابلة شخصية", "مقابلة هاتفية", "المقابلة الفنية"];

export function isRealInterviewStage(stageName?: string | null, stageObj?: any): boolean {
  if (!stageName) return false;
  const name = stageName.trim();

  // If the stage explicitly has require_interview enabled in DB transition rules
  if (stageObj?.transition_rules?.require_interview) return true;

  // Exclude non-interview stages explicitly (CV screening, file checks, initial sorting, tests, coding tasks, offers)
  if (/سيرة|ملف|مستند|وثائق|أوراق|cv|resume|screening|تصفية|فرز|اختبار|امتحان|task|كود|عرض|offer|عقد/i.test(name)) {
    return false;
  }

  // Check for interview keywords
  return /مقابلة|interview|محادثة|انترفيو/i.test(name);
}

export function findStageIndex(stages: string[], stageName: string): number {
  if (!stageName || stages.length === 0) return 0;
  const clean = stageName.trim().toLowerCase();

  // 1. Exact match
  const exact = stages.findIndex(s => s.trim().toLowerCase() === clean);
  if (exact !== -1) return exact;

  // 2. Semantic matching for common recruitment stages
  if (/سيرة|cv|resume|screening/i.test(clean)) {
    const idx = stages.findIndex(s => /سيرة|cv|resume|screening/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/تقديم|applied|طلب|جديد|تسجيل/i.test(clean)) {
    const idx = stages.findIndex(s => /تقديم|applied|طلب|جديد|تسجيل/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/اختبار|امتحان|task|assessment|test|كود/i.test(clean)) {
    const idx = stages.findIndex(s => /اختبار|امتحان|task|assessment|test|كود/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/مقابلة.*(أولى|مبدئية|هاتفية)|phone/i.test(clean)) {
    const idx = stages.findIndex(s => /مقابلة.*(أولى|مبدئية|هاتفية)|phone/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/مقابلة.*(نهائية|أخيرة)|final/i.test(clean)) {
    const idx = stages.findIndex(s => /مقابلة.*(نهائية|أخيرة)|final/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/مقابلة|interview/i.test(clean)) {
    const idx = stages.findIndex(s => /مقابلة|interview/i.test(s));
    if (idx !== -1) return idx;
  }
  if (/عرض|offer|عقد|توظيف|قوى/i.test(clean)) {
    const idx = stages.findIndex(s => /عرض|offer|عقد|توظيف|قوى/i.test(s));
    if (idx !== -1) return idx;
  }

  return 0;
}

export function generateRoomId() {
  return `tawzeef-x-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
