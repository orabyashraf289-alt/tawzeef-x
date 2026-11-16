/**
 * Predictive Hiring & BI Labor Market Engine (Saudi Market Edition)
 *
 * Provides:
 * 1. Saudi Labor Market Salary & Hiring Benchmarks (p5-benchmark)
 * 2. Predictive Time-to-Fill Model per Vacancy (p5-forecast)
 * 3. Offer Acceptance Probability Forecasting (p5-forecast)
 * 4. KSA Labor Market Dynamics & In-Demand Tech Skills (p5-trends)
 * 5. Headcount & Hiring Budget Forecasting (p5-bi)
 */

export interface DepartmentBenchmark {
  department: string;
  departmentAr: string;
  salaryP25: number;
  salaryP50: number; // Median
  salaryP75: number;
  salaryP90: number;
  avgTimeToFillDays: number;
  avgCostPerHireSar: number;
  avgOfferAcceptanceRate: number; // 0 - 1
  turnoverRateAnnual: number;
}

export const SAUDI_MARKET_BENCHMARKS: Record<string, DepartmentBenchmark> = {
  engineering: {
    department: "engineering",
    departmentAr: "هندسة البرمجيات والتقنية",
    salaryP25: 12000,
    salaryP50: 17500,
    salaryP75: 24000,
    salaryP90: 32000,
    avgTimeToFillDays: 38,
    avgCostPerHireSar: 5500,
    avgOfferAcceptanceRate: 0.74,
    turnoverRateAnnual: 0.14,
  },
  ai_data: {
    department: "ai_data",
    departmentAr: "الذكاء الاصطناعي وعلوم البيانات",
    salaryP25: 14000,
    salaryP50: 20000,
    salaryP75: 28000,
    salaryP90: 36000,
    avgTimeToFillDays: 44,
    avgCostPerHireSar: 6800,
    avgOfferAcceptanceRate: 0.71,
    turnoverRateAnnual: 0.12,
  },
  product: {
    department: "product",
    departmentAr: "إدارة المنتجات والتصميم",
    salaryP25: 11000,
    salaryP50: 16000,
    salaryP75: 22000,
    salaryP90: 29000,
    avgTimeToFillDays: 32,
    avgCostPerHireSar: 4800,
    avgOfferAcceptanceRate: 0.79,
    turnoverRateAnnual: 0.11,
  },
  hr: {
    department: "hr",
    departmentAr: "الموارد البشرية والعمليات",
    salaryP25: 8500,
    salaryP50: 12500,
    salaryP75: 17500,
    salaryP90: 23000,
    avgTimeToFillDays: 24,
    avgCostPerHireSar: 3400,
    avgOfferAcceptanceRate: 0.84,
    turnoverRateAnnual: 0.09,
  },
  sales_marketing: {
    department: "sales_marketing",
    departmentAr: "المبيعات والتسويق الرقمي",
    salaryP25: 8000,
    salaryP50: 12000,
    salaryP75: 18000,
    salaryP90: 25000,
    avgTimeToFillDays: 26,
    avgCostPerHireSar: 3900,
    avgOfferAcceptanceRate: 0.78,
    turnoverRateAnnual: 0.16,
  },
  finance: {
    department: "finance",
    departmentAr: "المالية والمحاسبة",
    salaryP25: 9000,
    salaryP50: 13500,
    salaryP75: 19000,
    salaryP90: 26000,
    avgTimeToFillDays: 28,
    avgCostPerHireSar: 4100,
    avgOfferAcceptanceRate: 0.82,
    turnoverRateAnnual: 0.08,
  },
  customer_support: {
    department: "customer_support",
    departmentAr: "خدمة وتجربة العملاء",
    salaryP25: 6000,
    salaryP50: 8500,
    salaryP75: 12000,
    salaryP90: 15500,
    avgTimeToFillDays: 16,
    avgCostPerHireSar: 2200,
    avgOfferAcceptanceRate: 0.88,
    turnoverRateAnnual: 0.18,
  },
};

/**
 * Maps raw department string to benchmark key
 */
export function resolveBenchmarkKey(deptName?: string | null): string {
  if (!deptName) return "engineering";
  const s = deptName.toLowerCase();
  if (s.includes("ai") || s.includes("ذكاء") || s.includes("بيانات") || s.includes("data")) return "ai_data";
  if (s.includes("product") || s.includes("منتج") || s.includes("تصميم") || s.includes("design") || s.includes("ux")) return "product";
  if (s.includes("hr") || s.includes("بشرية") || s.includes("عمليات") || s.includes("ops")) return "hr";
  if (s.includes("sale") || s.includes("مبيع") || s.includes("تسويق") || s.includes("market")) return "sales_marketing";
  if (s.includes("finan") || s.includes("مال") || s.includes("محاسب") || s.includes("account")) return "finance";
  if (s.includes("support") || s.includes("دعم") || s.includes("خدمة") || s.includes("عملاء")) return "customer_support";
  return "engineering";
}

export interface TimeToFillPrediction {
  predictedDays: number;
  marketMedianDays: number;
  confidence: number; // 0 - 100%
  riskLevel: "low" | "medium" | "high";
  salaryCompetitiveness: "below_market" | "competitive" | "premium";
  salaryRatioToMarket: number;
  factors: {
    label: string;
    impactDays: number; // positive = delays hiring, negative = accelerates
  }[];
  recommendations: string[];
}

export interface PredictTimeToFillInput {
  department?: string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  candidates_count?: number;
}

export function predictTimeToFill(input: PredictTimeToFillInput): TimeToFillPrediction {
  const benchKey = resolveBenchmarkKey(input.department);
  const benchmark = SAUDI_MARKET_BENCHMARKS[benchKey] || SAUDI_MARKET_BENCHMARKS.engineering;

  let baseDays = benchmark.avgTimeToFillDays;
  const factors: { label: string; impactDays: number }[] = [];
  const recommendations: string[] = [];

  // 1. Seniority Impact
  const level = (input.experience_level || "").toLowerCase();
  if (level.includes("senior") || level.includes("خبير") || level.includes("متقدم")) {
    baseDays += 10;
    factors.push({ label: "مستوى خبرة خبير/أقدم (Seniority Demand)", impactDays: 10 });
  } else if (level.includes("lead") || level.includes("manager") || level.includes("قائد") || level.includes("مدير")) {
    baseDays += 18;
    factors.push({ label: "منصب قيادي/إداري (Leadership Scarcity)", impactDays: 18 });
  } else if (level.includes("junior") || level.includes("entry") || level.includes("مبتدئ") || level.includes("حديث")) {
    baseDays -= 8;
    factors.push({ label: "وظيفة مبتدئة/حديث تخرج (High Candidate Volume)", impactDays: -8 });
  }

  // 2. Salary Competitiveness
  const offeredMid = input.salary_max && input.salary_min
    ? (input.salary_max + input.salary_min) / 2
    : input.salary_max || input.salary_min || benchmark.salaryP50;

  const salaryRatio = offeredMid / benchmark.salaryP50;
  let salaryComp: "below_market" | "competitive" | "premium" = "competitive";

  if (salaryRatio < 0.88) {
    salaryComp = "below_market";
    const delay = Math.round(12 * (1 - salaryRatio));
    baseDays += delay;
    factors.push({ label: "المعروض المالي أقل من متوسط السوق السعودي", impactDays: delay });
    recommendations.push(`زيادة سقف الراتب بنسبة ${Math.round((1 - salaryRatio) * 100)}% ليتماشى مع معدل السوق (${benchmark.salaryP50.toLocaleString("ar-SA")} ر.س) لتقليل وقت التوظيف بنحو ${delay} يوماً.`);
  } else if (salaryRatio > 1.10) {
    salaryComp = "premium";
    const speedup = -Math.min(10, Math.round(8 * (salaryRatio - 1)));
    baseDays += speedup;
    factors.push({ label: "عرض مالي تنافسي متميز يجذب أفضل الكفاءات سريعاً", impactDays: speedup });
  }

  // 3. Candidate Pool Size
  const pool = input.candidates_count || 0;
  if (pool > 25) {
    baseDays -= 5;
    factors.push({ label: "وفرة مرشحين في المسار (أكثر من 25 مرشح)", impactDays: -5 });
  } else if (pool < 3 && pool > 0) {
    baseDays += 6;
    factors.push({ label: "قلة المتقدمين الفعليين (أقل من 3 مرشحين)", impactDays: 6 });
    recommendations.push("تفعيل النشر المتعدد على Google Jobs وقنوات التواصل الاجتماعي لتوسيع نطاق الاستقطاب.");
  }

  const finalDays = Math.max(7, Math.round(baseDays));

  // Risk determination
  let riskLevel: "low" | "medium" | "high" = "low";
  if (finalDays > benchmark.avgTimeToFillDays + 10 || salaryComp === "below_market") {
    riskLevel = "high";
  } else if (finalDays > benchmark.avgTimeToFillDays) {
    riskLevel = "medium";
  }

  if (recommendations.length === 0) {
    recommendations.push("المؤشرات متوازنة مع متوسط السوق. حافظ على وتيرة مقابلات سريعة لضمان إغلاق الشاغر في الموعد المحدد.");
  }

  return {
    predictedDays: finalDays,
    marketMedianDays: benchmark.avgTimeToFillDays,
    confidence: 88,
    riskLevel,
    salaryCompetitiveness: salaryComp,
    salaryRatioToMarket: Number(salaryRatio.toFixed(2)),
    factors,
    recommendations,
  };
}

export interface OfferAcceptancePrediction {
  acceptanceProbability: number; // 0 - 100%
  expectedDecisionDays: number;
  confidence: number;
  status: "high_probability" | "moderate" | "at_risk";
  positiveFactors: string[];
  riskFactors: string[];
  recommendedCounterOfferSar?: number;
}

export interface PredictOfferAcceptanceInput {
  expectedSalarySar?: number | string | null;
  offeredSalarySar?: number | null;
  aiScore?: number | null;
  daysInInterviewPipeline?: number;
  noticePeriodDays?: number;
}

export function predictOfferAcceptance(input: PredictOfferAcceptanceInput): OfferAcceptancePrediction {
  let prob = 75; // baseline acceptance rate in Saudi tech
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  const rawExpected = input.expectedSalarySar ? Number(String(input.expectedSalarySar).replace(/[^0-9]/g, "")) : 0;
  const offered = input.offeredSalarySar || 0;

  // 1. Salary alignment
  if (rawExpected > 0 && offered > 0) {
    const ratio = offered / rawExpected;
    if (ratio >= 1.05) {
      prob += 18;
      positiveFactors.push(`العرض المالي يغطي أو يتجاوز التوقع المطلوب بنسبة ${Math.round((ratio - 1) * 100)}%`);
    } else if (ratio >= 0.95) {
      prob += 8;
      positiveFactors.push("العرض المالي متطابق تماماً مع توقعات المرشح");
    } else if (ratio < 0.85) {
      const penalty = Math.round((1 - ratio) * 50);
      prob -= penalty;
      riskFactors.push(`العرض أقل من الراتب المتوقع بنسبة ${Math.round((1 - ratio) * 100)}% (فارق ${(rawExpected - offered).toLocaleString("ar-SA")} ر.س)`);
    }
  }

  // 2. Pipeline duration / candidate fatigue
  const daysInPipeline = input.daysInInterviewPipeline || 14;
  if (daysInPipeline > 28) {
    prob -= 15;
    riskFactors.push(`طول فترة مسار المقابلات (${daysInPipeline} يوماً) يزيد من احتمالية تلقي عروض منافسة`);
  } else if (daysInPipeline <= 12) {
    prob += 7;
    positiveFactors.push("سرعة إنجاز مراحل المقابلة تعزز انطباع وجاذبية بيئة العمل");
  }

  // 3. Notice Period
  const notice = input.noticePeriodDays ?? 30;
  if (notice > 60) {
    prob -= 8;
    riskFactors.push(`فترة إشعار طويلة (${notice} يوماً) قد تزيد احتمالية تقديم عرض مضاد من صاحب العمل الحالي`);
  }

  // 4. Candidate AI fit score
  const score = input.aiScore || 75;
  if (score >= 88) {
    positiveFactors.push("توافق تقني وثقافي عالي جداً مع متطلبات الوظيفة");
  }

  const finalProb = Math.min(96, Math.max(15, Math.round(prob)));
  let status: "high_probability" | "moderate" | "at_risk" = "moderate";
  if (finalProb >= 80) status = "high_probability";
  else if (finalProb < 60) status = "at_risk";

  return {
    acceptanceProbability: finalProb,
    expectedDecisionDays: notice <= 30 ? 3 : 5,
    confidence: 85,
    status,
    positiveFactors,
    riskFactors,
    recommendedCounterOfferSar: rawExpected > offered ? rawExpected : undefined,
  };
}

export interface MarketTrendItem {
  id: string;
  roleTitleAr: string;
  roleTitleEn: string;
  growthYoY: number; // e.g. 48 for +48%
  demandIntensity: "very_high" | "high" | "moderate";
  medianSalarySar: number;
  topSkills: string[];
  saudizationPriority: boolean;
}

export function getSaudiLaborMarketTrends(): MarketTrendItem[] {
  return [
    {
      id: "gen-ai-eng",
      roleTitleAr: "مهندس ذكاء اصطناعي ونماذج لغوية (GenAI)",
      roleTitleEn: "Generative AI Engineer",
      growthYoY: 52,
      demandIntensity: "very_high",
      medianSalarySar: 23500,
      topSkills: ["LLM Fine-tuning", "Python", "RAG Architecture", "Prompt Ops", "LangChain"],
      saudizationPriority: true,
    },
    {
      id: "cyber-sec",
      roleTitleAr: "أخصائي أمن سيبراني واستجابة حوادث",
      roleTitleEn: "Cybersecurity Specialist",
      growthYoY: 38,
      demandIntensity: "very_high",
      medianSalarySar: 19500,
      topSkills: ["NCA ECC Compliance", "SOC Operations", "Threat Hunting", "Cloud Security"],
      saudizationPriority: true,
    },
    {
      id: "cloud-devops",
      roleTitleAr: "مهندس سحابي وعمليات بنية تحتية (DevOps)",
      roleTitleEn: "Cloud & DevOps Engineer",
      growthYoY: 34,
      demandIntensity: "high",
      medianSalarySar: 18000,
      topSkills: ["Kubernetes", "Terraform", "CI/CD", "AWS/Oracle Cloud KSA", "Docker"],
      saudizationPriority: false,
    },
    {
      id: "product-manager",
      roleTitleAr: "مدير منتجات رقمية ومنصات SaaS",
      roleTitleEn: "Digital Product Manager",
      growthYoY: 29,
      demandIntensity: "high",
      medianSalarySar: 17000,
      topSkills: ["Agile/Scrum", "Product Analytics", "FinTech/HRTech", "User Research"],
      saudizationPriority: true,
    },
    {
      id: "talent-acquisition",
      roleTitleAr: "أخصائي استقطاب مواهب تقنية ومدير موارد بشرية",
      roleTitleEn: "Tech Talent Acquisition Specialist",
      growthYoY: 24,
      demandIntensity: "moderate",
      medianSalarySar: 13500,
      topSkills: ["Saudi Labor Law", "Qiwa Portal", "Technical Sourcing", "ATS Optimization"],
      saudizationPriority: true,
    },
  ];
}

export interface BenchmarkComparisonSummary {
  metricName: string;
  metricNameAr: string;
  companyValue: number;
  marketBenchmark: number;
  unit: string;
  status: "superior" | "aligned" | "lagging";
  variancePct: number;
  commentaryAr: string;
}

export function evaluateCompanyVsBenchmark(metrics: {
  avgTimeToFillDays: number;
  avgCostPerHireSar: number;
  offerAcceptanceRate: number; // 0 - 100
  avgMonthlySalarySar: number;
}): BenchmarkComparisonSummary[] {
  // Market averages across tech/SaaS in Saudi Arabia
  const M_TIME = 32;
  const M_COST = 4600;
  const M_ACCEPT = 77;
  const M_SALARY = 14500;

  return [
    {
      metricName: "time_to_fill",
      metricNameAr: "متوسط وقت التوظيف (Time to Fill)",
      companyValue: metrics.avgTimeToFillDays,
      marketBenchmark: M_TIME,
      unit: "يوم",
      variancePct: Math.round(((metrics.avgTimeToFillDays - M_TIME) / M_TIME) * 100),
      status: metrics.avgTimeToFillDays <= M_TIME ? "superior" : metrics.avgTimeToFillDays <= M_TIME + 6 ? "aligned" : "lagging",
      commentaryAr: metrics.avgTimeToFillDays <= M_TIME
        ? `أسرع من متوسط السوق السعودي بنسبة ${Math.abs(Math.round(((metrics.avgTimeToFillDays - M_TIME) / M_TIME) * 100))}% بفضل الذكاء الاصطناعي والمقابلات المؤتمتة.`
        : "تتجاوز وتيرة التوظيف متوسط القطاع، مما يستدعي تقليل جولات المقابلات اليدوية.",
    },
    {
      metricName: "cost_per_hire",
      metricNameAr: "متوسط تكلفة التعيين (Cost Per Hire)",
      companyValue: metrics.avgCostPerHireSar,
      marketBenchmark: M_COST,
      unit: "ر.س",
      variancePct: Math.round(((metrics.avgCostPerHireSar - M_COST) / M_COST) * 100),
      status: metrics.avgCostPerHireSar <= M_COST ? "superior" : "lagging",
      commentaryAr: metrics.avgCostPerHireSar <= M_COST
        ? "كفاءة إنفاق عالية وتوفير ملحوظ مقارنة بالاعتماد على وكالات التوظيف الخارجية."
        : "تكلفة التعيين أعلى من المعدل، يوصى بالاعتماد أكثر على شبكة التوظيف المباشرة وتوصيات الموظفين.",
    },
    {
      metricName: "offer_acceptance_rate",
      metricNameAr: "معدل قبول العروض الوظيفية (Offer Acceptance)",
      companyValue: metrics.offerAcceptanceRate,
      marketBenchmark: M_ACCEPT,
      unit: "%",
      variancePct: Math.round(metrics.offerAcceptanceRate - M_ACCEPT),
      status: metrics.offerAcceptanceRate >= M_ACCEPT ? "superior" : metrics.offerAcceptanceRate >= M_ACCEPT - 5 ? "aligned" : "lagging",
      commentaryAr: metrics.offerAcceptanceRate >= M_ACCEPT
        ? "نسبة قبول ممتازة تعكس تنافسية الحزم والمزايا المطروحة وسرعة التواصل."
        : "يُنصح بمراجعة سلم الرواتب وبدلات السكن والتأمين لرفع نسبة قبول العروض.",
    },
    {
      metricName: "average_salary",
      metricNameAr: "متوسط الرواتب المعروضة (Salary Benchmarking)",
      companyValue: metrics.avgMonthlySalarySar,
      marketBenchmark: M_SALARY,
      unit: "ر.س",
      variancePct: Math.round(((metrics.avgMonthlySalarySar - M_SALARY) / M_SALARY) * 100),
      status: Math.abs(metrics.avgMonthlySalarySar - M_SALARY) / M_SALARY < 0.1 ? "aligned" : metrics.avgMonthlySalarySar > M_SALARY ? "superior" : "lagging",
      commentaryAr: metrics.avgMonthlySalarySar >= M_SALARY
        ? "حزمة رواتب تنافسية تضمن استقطاب كفاءات النخبة في المملكة."
        : "سلم الرواتب أدنى من الشريحة الوسطى في السوق للقطاع التقني.",
    },
  ];
}

export interface QuarterlyForecast {
  quarter: string;
  quarterAr: string;
  projectedNewHires: number;
  projectedBudgetSar: number;
  primaryDepartments: string[];
  seasonalFactor: string;
}

export function forecastQuarterlyHiring(activeJobsCount: number, currentHeadcount: number): QuarterlyForecast[] {
  const baseHires = Math.max(3, Math.round(activeJobsCount * 1.4));
  const avgSalary = 14500;

  return [
    {
      quarter: "Q1 2027",
      quarterAr: "الربع الأول (Q1)",
      projectedNewHires: Math.round(baseHires * 1.3),
      projectedBudgetSar: Math.round(baseHires * 1.3 * avgSalary * 3),
      primaryDepartments: ["الهندسة التقنية", "المبيعات وتطوير الأعمال"],
      seasonalFactor: "ذروة الميزانيات المالية السنوية الجديدة للشركات والتوسع التشغيلي",
    },
    {
      quarter: "Q2 2027",
      quarterAr: "الربع الثاني (Q2)",
      projectedNewHires: Math.round(baseHires * 0.9),
      projectedBudgetSar: Math.round(baseHires * 0.9 * avgSalary * 3),
      primaryDepartments: ["العمليات والخدمات المشتركة", "التسويق"],
      seasonalFactor: "فترة استقرار ومراجعة الأداء النصفي قبل إجازات الصيف",
    },
    {
      quarter: "Q3 2027",
      quarterAr: "الربع الثالث (Q3)",
      projectedNewHires: Math.round(baseHires * 1.2),
      projectedBudgetSar: Math.round(baseHires * 1.2 * avgSalary * 3),
      primaryDepartments: ["برامج تطوير الخريجين الجدد", "دعم العملاء", "الذكاء الاصطناعي"],
      seasonalFactor: "موجة تخرج الجامعات ومعارض التوظيف وتعيين المواهب الشابة الوطنية",
    },
    {
      quarter: "Q4 2027",
      quarterAr: "الربع الرابع (Q4)",
      projectedNewHires: Math.round(baseHires * 1.0),
      projectedBudgetSar: Math.round(baseHires * 1.0 * avgSalary * 3),
      primaryDepartments: ["القيادات التنفيذية", "المالية والمحاسبة"],
      seasonalFactor: "استكمال خطة التعيينات السنوية وإغلاق الشواغر الاستراتيجية",
    },
  ];
}
