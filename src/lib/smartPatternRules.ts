/**
 * Smart Pattern-Based Rules Engine (p4-smart-rules)
 * Evaluates candidate data patterns (scores, SLA stagnation, licensing, multi-applications)
 * and executes intelligent routing and automated alerts.
 */

export interface SmartPatternRule {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: "quality" | "stagnation" | "compliance" | "multi_apply";
  enabled: boolean;
  thresholds: {
    minAiScore?: number;
    stagnationDays?: number;
    requiredLicense?: boolean;
    maxApplications?: number;
    targetStage?: string;
  };
  actions: {
    type: "move_stage" | "add_tag" | "notify_manager" | "flag_sla" | "archive";
    label: string;
    targetValue?: string;
  }[];
}

export interface CandidatePatternProfile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  stage?: string | null;
  status?: string | null;
  ai_score?: number | null;
  skills?: string[] | null;
  created_at: string;
  last_activity_at?: string;
  applications_count?: number;
  license_status?: string | null;
  role?: string | null;
}

export interface PatternMatchResult {
  ruleId: string;
  ruleName: string;
  candidateId: string;
  candidateName: string;
  matchedReason: string;
  suggestedAction: string;
  severity: "info" | "warning" | "success" | "urgent";
}

export const DEFAULT_SMART_PATTERN_RULES: SmartPatternRule[] = [
  {
    id: "pattern-top-talent",
    name: "التصعيد التلقائي للمواهب الاستثنائية (Top Talent Fast-Track)",
    nameEn: "Top Talent Fast-Track",
    description: "نقل المرشحين ذوي التقييم الذكي العالي (85%+) فوراً لمرحلة المقابلة مع تنبيه فريق التوظيف.",
    category: "quality",
    enabled: true,
    thresholds: {
      minAiScore: 85,
      targetStage: "مقابلة تقنية",
    },
    actions: [
      { type: "move_stage", label: "نقل إلى مرحلة المقابلة التقنية", targetValue: "مقابلة تقنية" },
      { type: "add_tag", label: "إضافة وسم: موهبة استثنائية 🌟", targetValue: "موهبة استثنائية" },
      { type: "notify_manager", label: "إشعار فوري لمدير التوظيف عبر Slack/Teams" },
    ],
  },
  {
    id: "pattern-stagnation-guard",
    name: "رصد ركود المرشحين وتجاوز الـ SLA (Stagnation Guard)",
    nameEn: "Stage Stagnation Guard",
    description: "كشف المرشحين العالقين في مرحلة الفرز لأكثر من 5 أيام دون إجراء، وتصعيد الطلب لتسريع الإجراءات.",
    category: "stagnation",
    enabled: true,
    thresholds: {
      stagnationDays: 5,
    },
    actions: [
      { type: "flag_sla", label: "وسم بتجاوز مهلة الـ SLA وتنبيه المسؤول ⏱️" },
      { type: "notify_manager", label: "تذكير يومي لمسؤول المقابلات" },
    ],
  },
  {
    id: "pattern-license-compliance",
    name: "أولوية التراخيص والاعتمادات المهنية (License Compliance)",
    nameEn: "Professional License Priority",
    description: "منح الأولوية للمرشحين الحاصلين على رخص مهنية معتمدة وسارية للوظائف التخصصية.",
    category: "compliance",
    enabled: true,
    thresholds: {
      requiredLicense: true,
      targetStage: "مراجعة السيرة",
    },
    actions: [
      { type: "add_tag", label: "إضافة وسم: مرخص مهنياً 🛡️", targetValue: "مرخص مهنياً" },
      { type: "move_stage", label: "تقديم الطلب في قائمة الفرز المسبق", targetValue: "مراجعة السيرة" },
    ],
  },
  {
    id: "pattern-multi-applicant",
    name: "رصد المتقدمين المتعددين (Multi-Job Re-Applicant Pattern)",
    nameEn: "Multi-Job Re-Applicant",
    description: "رصد المرشحين المتقدمين على أكثر من وظيفتين خلال 30 يوماً وتوحيد تاريخ تقييماتهم لمساعدة مسؤولي المقابلات.",
    category: "multi_apply",
    enabled: true,
    thresholds: {
      maxApplications: 2,
    },
    actions: [
      { type: "add_tag", label: "إضافة وسم: متقدم متعدد 📑", targetValue: "متقدم متعدد" },
    ],
  },
];

/**
 * Evaluates candidates against active pattern rules and returns actionable matches
 */
export function evaluateCandidatePatterns(
  candidates: CandidatePatternProfile[],
  rules: SmartPatternRule[] = DEFAULT_SMART_PATTERN_RULES
): PatternMatchResult[] {
  const matches: PatternMatchResult[] = [];
  const now = Date.now();

  const enabledRules = rules.filter((r) => r.enabled);

  candidates.forEach((candidate) => {
    enabledRules.forEach((rule) => {
      // 1. Top Talent Fast-Track
      if (rule.id === "pattern-top-talent") {
        const minScore = rule.thresholds.minAiScore ?? 85;
        if ((candidate.ai_score ?? 0) >= minScore && candidate.stage !== "مقابلة تقنية" && candidate.stage !== "مقبول") {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchedReason: `حقق المرشح تقييم ذكاء اصطناعي (${candidate.ai_score}%) يتجاوز حد التميز (${minScore}%)`,
            suggestedAction: "نقل مباشر إلى المقابلة التقنية وإشعار الفريق",
            severity: "success",
          });
        }
      }

      // 2. Stagnation Guard
      if (rule.id === "pattern-stagnation-guard") {
        const daysLimit = rule.thresholds.stagnationDays ?? 5;
        const lastDate = new Date(candidate.last_activity_at || candidate.created_at).getTime();
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays >= daysLimit && candidate.status === "قيد المراجعة") {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchedReason: `المرشح متوقف في مرحلة "${candidate.stage || "تقديم"}" منذ ${diffDays} أيام دون تفاعل`,
            suggestedAction: "تصعيد الطلب وتنبيه مراجع المقابلات",
            severity: "warning",
          });
        }
      }

      // 3. License Compliance
      if (rule.id === "pattern-license-compliance") {
        if (candidate.license_status === "valid" || candidate.license_status === "سارية") {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchedReason: "المرشح يحمل رخصة مهنية معتمدة وسارية الصلاحية",
            suggestedAction: "إضافة وسم الاعتماد المهني 🛡️ ومنح الأولوية في الفرز",
            severity: "info",
          });
        }
      }

      // 4. Multi-Applicant
      if (rule.id === "pattern-multi-applicant") {
        const appLimit = rule.thresholds.maxApplications ?? 2;
        if ((candidate.applications_count ?? 1) >= appLimit) {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchedReason: `قام المرشح بالتقديم على ${candidate.applications_count} شواغر وظيفية في وقت متقارب`,
            suggestedAction: "إضافة وسم (متقدم متعدد 📑) وتوحيد ملف المراجعة",
            severity: "info",
          });
        }
      }
    });
  });

  return matches;
}