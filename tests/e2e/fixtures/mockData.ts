/**
 * Strongly-typed Mock Data for Tawzeef-X Playwright E2E Tests
 */

export type AppRole = "admin" | "recruiter" | "reviewer" | "job_seeker";

export interface MockUser {
  id: string;
  email: string;
  role: AppRole;
  app_metadata: { provider: string };
  user_metadata: { full_name: string };
  aud: string;
  created_at: string;
}

export interface MockCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  industry: string;
  status: string;
  is_active: boolean;
  parent_company_id: string | null;
  manager_user_id: string | null;
  notes: string | null;
  e2e_encryption: boolean;
  brand_settings: Record<string, unknown> | null;
  contact_email: string;
  contact_phone: string;
  created_at: string;
}

export interface MockJob {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  type: string;
  experience_level: string;
  status: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  branches: string[];
  application_deadline: string | null;
  is_featured: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface MockCandidate {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  stage: string;
  status: string;
  ai_score: number;
  rating: number;
  experience: string;
  skills: string[];
  tracking_code: string;
  stage_entered_at: string;
  company_id: string;
  job_id: string;
  created_at: string;
  updated_at: string;
}

export interface MockPipelineStage {
  id: string;
  user_id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  order_index: number;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  sla_hours: number;
  assigned_user_ids: string[];
  transition_rules: {
    require_ai_evaluation?: boolean;
    min_ai_score?: number;
    require_interview?: boolean;
    require_assessment?: boolean;
  };
}

export interface MockOffer {
  id: string;
  user_id: string;
  candidate_id: string;
  job_id: string;
  token: string;
  position: string;
  department: string;
  salary: number;
  currency: string;
  offer_type: string;
  start_date: string;
  benefits: string[];
  additional_terms: string;
  status: string;
  response_date: string | null;
  response_notes: string | null;
  signature_url: string | null;
  expires_at: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  company_name: string;
  candidates: {
    name: string;
    email: string;
  };
}

export interface MockAssessmentOption {
  id: string;
  option_text: string;
  sort_order: number;
}

export interface MockAssessmentQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "code" | "matching" | "ordering";
  points: number;
  code_language: string | null;
  correct_answer: string;
  options: MockAssessmentOption[];
  matching_choices: string[];
}

export interface MockAssessment {
  id: string;
  token: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  question_count: number;
  is_randomized: boolean;
  questions: MockAssessmentQuestion[];
}

export interface MockInvitation {
  id: string;
  token: string;
  email: string;
  role: AppRole;
  member_role: "owner" | "hr" | "viewer";
  status: string;
  branch_id: string | null;
  company_id: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
  company: {
    name: string;
    logo_url: string;
  };
}

export interface MockHiringGoal {
  id: string;
  user_id: string;
  month: string;
  hire_target: number;
  candidates_target: number;
  interviews_target: number;
  offers_target: number;
  created_at: string;
  updated_at: string;
}

export interface MockInterview {
  id: string;
  user_id: string;
  candidate_id: string;
  job_id: string;
  company_id: string;
  status: string;
  scheduled_at: string;
  created_at: string;
}

export interface MockAssessmentResponse {
  id: string;
  candidate_email: string;
  assessment_id: string;
  status: string;
  percentage: number;
  tab_switches: number;
  tab_switch_log: {
    cheat_score?: number;
    events?: { time: string; type: string }[];
  };
  integrity_score?: number;
}

export interface MockRolePermission {
  id: string;
  permission_key: string;
  description: string;
  admin: boolean;
  recruiter: boolean;
  reviewer: boolean;
}

export const mockUser: MockUser = {
  id: "usr-admin-001",
  email: "admin@tawzeefx.com",
  role: "admin",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "مدير النظام" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockNonSuperAdmin: MockUser = {
  id: "usr-recruiter-002",
  email: "recruiter@tawzeefx.com",
  role: "recruiter",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "مسؤول توظيف" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockReviewerUser: MockUser = {
  id: "usr-reviewer-003",
  email: "reviewer@tawzeefx.com",
  role: "reviewer",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "مقيم ومشاهد" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockInvitedUser: MockUser = {
  id: "usr-invited-001",
  email: "newmember@tawzeefx.com",
  role: "recruiter",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "عضو مدعو" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockCompany: MockCompany = {
  id: "comp-riyadh-001",
  name: "شركة الرياض للتقنية",
  slug: "riyadh-tech",
  logo_url: "https://placehold.co/100x100.png",
  industry: "تقنية المعلومات",
  status: "active",
  is_active: true,
  parent_company_id: null,
  manager_user_id: null,
  notes: null,
  e2e_encryption: false,
  brand_settings: null,
  contact_email: "hr@riyadhtech.sa",
  contact_phone: "+966500000000",
  created_at: "2026-01-01T00:00:00Z",
};

const nowIso = new Date().toISOString();

export const mockJob: MockJob = {
  id: "job-react-001",
  user_id: mockUser.id,
  title: "مطور واجهات أمامية (React / TypeScript)",
  slug: "frontend-developer-react",
  department: "الهندسة والتقنية",
  location: "الرياض، المملكة العربية السعودية",
  type: "full-time",
  experience_level: "mid",
  status: "نشطة",
  description: "نبحث عن مطور React محترف للانضمام إلى فريقنا",
  requirements: ["React 18", "TypeScript", "Tailwind CSS"],
  skills: ["React", "TypeScript", "Tailwind CSS"],
  salary_min: 12000,
  salary_max: 18000,
  branches: ["الفرع الرئيسي - الرياض"],
  application_deadline: null,
  is_featured: true,
  company_id: mockCompany.id,
  created_at: nowIso,
  updated_at: nowIso,
};

export const mockCandidate: MockCandidate = {
  id: "cand-001",
  user_id: mockUser.id,
  name: "خالد بن محمد",
  email: "khaled@example.com",
  phone: "+966500000001",
  role: "مطور React",
  stage: "تقديم الطلب",
  status: "مقبول",
  ai_score: 88,
  rating: 4,
  experience: "5 سنوات",
  skills: ["React", "TypeScript", "Vite"],
  tracking_code: "TX-CANDIDATE-001",
  stage_entered_at: nowIso,
  company_id: mockCompany.id,
  job_id: mockJob.id,
  created_at: nowIso,
  updated_at: nowIso,
};

export const mockIneligibleCandidate: MockCandidate = {
  id: "cand-ineligible-002",
  user_id: mockUser.id,
  name: "سعد بن علي (غير مؤهل)",
  email: "saad@example.com",
  phone: "+966500000002",
  role: "مطور React",
  stage: "تقديم الطلب",
  status: "جديد",
  ai_score: 45,
  rating: 2,
  experience: "سنة واحدة",
  skills: ["HTML", "CSS"],
  tracking_code: "TX-INELIGIBLE-002",
  stage_entered_at: nowIso,
  company_id: mockCompany.id,
  job_id: mockJob.id,
  created_at: nowIso,
  updated_at: nowIso,
};

export const mockPipelineStages: MockPipelineStage[] = [
  {
    id: "stage-1",
    user_id: mockUser.id,
    name: "تقديم الطلب",
    label: "تقديم الطلب",
    color: "#6366f1",
    icon: "inbox",
    order_index: 0,
    sort_order: 0,
    is_active: true,
    is_default: true,
    sla_hours: 48,
    assigned_user_ids: [],
    transition_rules: {},
  },
  {
    id: "stage-2",
    user_id: mockUser.id,
    name: "مراجعة السيرة",
    label: "مراجعة السيرة",
    color: "#8b5cf6",
    icon: "file-text",
    order_index: 1,
    sort_order: 1,
    is_active: true,
    is_default: false,
    sla_hours: 48,
    assigned_user_ids: [],
    transition_rules: {
      require_ai_evaluation: true,
      min_ai_score: 75,
    },
  },
  {
    id: "stage-3",
    user_id: mockUser.id,
    name: "فحص هاتفي",
    label: "فحص هاتفي",
    color: "#0ea5e9",
    icon: "phone",
    order_index: 2,
    sort_order: 2,
    is_active: true,
    is_default: false,
    sla_hours: 72,
    assigned_user_ids: [],
    transition_rules: {},
  },
  {
    id: "stage-4",
    user_id: mockUser.id,
    name: "مقابلة تقنية",
    label: "مقابلة تقنية",
    color: "#f59e0b",
    icon: "video",
    order_index: 3,
    sort_order: 3,
    is_active: true,
    is_default: false,
    sla_hours: 72,
    assigned_user_ids: [],
    transition_rules: {
      require_interview: true,
    },
  },
  {
    id: "stage-5",
    user_id: mockUser.id,
    name: "العرض الوظيفي",
    label: "العرض الوظيفي",
    color: "#059669",
    icon: "award",
    order_index: 4,
    sort_order: 4,
    is_active: true,
    is_default: false,
    sla_hours: 48,
    assigned_user_ids: [],
    transition_rules: {},
  },
];

export const mockOffer: MockOffer = {
  id: "ofr-001",
  user_id: mockUser.id,
  candidate_id: mockCandidate.id,
  job_id: mockJob.id,
  token: "valid-offer-token-12345",
  position: "مهندس برمجيات أول",
  department: "تطوير المنتجات",
  salary: 18000,
  currency: "SAR",
  offer_type: "full-time",
  start_date: "2026-10-01",
  benefits: ["تأمين طبي VIP", "بدل سكن ومواصلات", "مكافأة سنوية"],
  additional_terms: "تفصيل الراتب:\nالراتب الأساسي: 12,000 SAR\nبدل سكن: 3,000 SAR\nبدل مواصلات: 3,000 SAR\nالإجمالي: 18,000 SAR",
  status: "sent",
  response_date: null,
  response_notes: null,
  signature_url: null,
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  sent_at: nowIso,
  created_at: nowIso,
  updated_at: nowIso,
  company_id: mockCompany.id,
  company_name: mockCompany.name,
  candidates: {
    name: mockCandidate.name,
    email: mockCandidate.email,
  },
};

export const mockTrackingCode = "TX-CANDIDATE-001";

export const mockAssessment: MockAssessment = {
  id: "asm-001",
  token: "valid-assessment-token-999",
  title: "اختبار الكفاءة في React و TypeScript",
  description: "اختبار تقييمي لقياس المهارات البرمجية وأساسيات الواجهات",
  duration_minutes: 15,
  passing_score: 70,
  question_count: 2,
  is_randomized: false,
  questions: [
    {
      id: "q-1",
      question_text: "ما هو الـ Hook المستخدم لحفظ القيم بين دورات إعادة التصيير (Render) دون التسبب في إعادة التصيير؟",
      question_type: "multiple_choice",
      points: 50,
      code_language: null,
      correct_answer: "useRef",
      options: [
        { id: "opt-1", option_text: "useMemo", sort_order: 0 },
        { id: "opt-2", option_text: "useRef", sort_order: 1 },
        { id: "opt-3", option_text: "useState", sort_order: 2 },
        { id: "opt-4", option_text: "useEffect", sort_order: 3 },
      ],
      matching_choices: [],
    },
    {
      id: "q-2",
      question_text: "كيف تتعامل مع Side Effects في مكونات React الوظيفية؟",
      question_type: "multiple_choice",
      points: 50,
      code_language: null,
      correct_answer: "useEffect",
      options: [
        { id: "opt-5", option_text: "useEffect", sort_order: 0 },
        { id: "opt-6", option_text: "useCallback", sort_order: 1 },
        { id: "opt-7", option_text: "useId", sort_order: 2 },
      ],
      matching_choices: [],
    },
  ],
};

export const mockAssessmentResponses: MockAssessmentResponse[] = [
  {
    id: "resp-001",
    candidate_email: mockCandidate.email,
    assessment_id: mockAssessment.id,
    status: "completed",
    percentage: 95,
    tab_switches: 0,
    tab_switch_log: { cheat_score: 96, events: [] },
    integrity_score: 96,
  },
  {
    id: "resp-002",
    candidate_email: mockIneligibleCandidate.email,
    assessment_id: mockAssessment.id,
    status: "completed",
    percentage: 40,
    tab_switches: 4,
    tab_switch_log: {
      cheat_score: 35,
      events: [{ time: nowIso, type: "visibilitychange" }],
    },
    integrity_score: 35,
  },
];

export const mockInvitation: MockInvitation = {
  id: "inv-001",
  token: "valid-invite-token-777",
  email: "newmember@tawzeefx.com",
  role: "recruiter",
  member_role: "hr",
  status: "pending",
  branch_id: null,
  company_id: mockCompany.id,
  invited_by: mockUser.id,
  expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  created_at: nowIso,
  company: {
    name: mockCompany.name,
    logo_url: mockCompany.logo_url,
  },
};

export const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

export const mockHiringGoals: MockHiringGoal = {
  id: "goal-001",
  user_id: mockUser.id,
  month: currentMonthKey,
  hire_target: 10,
  candidates_target: 50,
  interviews_target: 20,
  offers_target: 8,
  created_at: nowIso,
  updated_at: nowIso,
};

export const mockInterview: MockInterview = {
  id: "int-001",
  user_id: mockUser.id,
  candidate_id: mockCandidate.id,
  job_id: mockJob.id,
  company_id: mockCompany.id,
  status: "مكتملة",
  scheduled_at: nowIso,
  created_at: nowIso,
};

const SCREEN_KEYS = [
  "screen.dashboard",
  "screen.jobs",
  "screen.candidates",
  "screen.pipeline",
  "screen.offers",
  "screen.converted_orders",
  "screen.hiring_plan",
  "screen.tasks",
  "screen.evaluation",
  "screen.workflow",
  "screen.team",
  "screen.audit_log",
  "screen.company",
  "screen.company_agencies",
  "screen.agency",
  "screen.interviews",
  "screen.ai_assistant",
  "screen.ai_tools",
  "screen.talent_pool",
  "screen.resume_archive",
  "screen.question_bank",
  "screen.checklist_tracker",
  "screen.reports",
  "screen.notifications",
  "screen.settings",
  "screen.tutorial",
  "screen.library",
];

export const mockRolePermissions: MockRolePermission[] = SCREEN_KEYS.map((key, idx) => ({
  id: `rp-${idx + 1}`,
  permission_key: key,
  description: key,
  admin: true,
  recruiter: key !== "screen.team" && key !== "screen.audit_log",
  reviewer: ["screen.dashboard", "screen.jobs", "screen.candidates", "screen.interviews", "screen.tasks", "screen.evaluation"].includes(key),
}));

export const mockSubscriptionPlans = [
  {
    id: "plan-starter",
    name: "Starter",
    name_ar: "الباقة الأساسية",
    description: "للشركات الناشئة",
    price: 0,
    currency: "SAR",
    billing_period: "monthly",
    job_posts_limit: 5,
    features: ["نشر حتى 5 وظائف", "فرز تلقائي بالذكاء الاصطناعي"],
    is_active: true,
    sort_order: 1,
  },
  {
    id: "plan-growth",
    name: "Growth",
    name_ar: "باقة النمو",
    description: "لفرق التوظيف النشطة",
    price: 990,
    currency: "SAR",
    billing_period: "monthly",
    job_posts_limit: 25,
    features: ["حتى 25 شاغراً", "تقارير ومصفوفة صلاحيات متقدمة"],
    is_active: true,
    sort_order: 2,
  },
];
