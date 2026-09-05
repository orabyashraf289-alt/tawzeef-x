/**
 * Comprehensive Mock Data & Route Handlers for Tawzeef-X E2E Tests
 */

export const mockUser = {
  id: "usr-admin-001",
  email: "admin@tawzeefx.com",
  role: "admin",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "مدير النظام" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockNonSuperAdmin = {
  id: "usr-recruiter-002",
  email: "recruiter@tawzeefx.com",
  role: "recruiter",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "مسؤول توظيف" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockCompany = {
  id: "comp-riyadh-001",
  name: "شركة الرياض للتقنية",
  slug: "riyadh-tech",
  logo_url: "https://placehold.co/100x100.png",
  industry: "تقنية المعلومات",
};

export const mockJob = {
  id: "job-react-001",
  title: "مطور واجهات أمامية (React / TypeScript)",
  slug: "frontend-developer-react",
  department: "الهندسة والتقنية",
  location: "الرياض، المملكة العربية السعودية",
  type: "full-time",
  experience_level: "mid",
  status: "published",
  description: "نبحث عن مطور React محترف للانضمام إلى فريقنا",
  requirements: ["React 18", "TypeScript", "Tailwind CSS"],
  company_id: mockCompany.id,
  created_at: "2026-01-01T00:00:00Z",
};

export const mockCandidate = {
  id: "cand-001",
  name: "خالد بن محمد",
  email: "khaled@example.com",
  phone: "+966500000001",
  role: "مطور React",
  stage: "تقديم الطلب",
  ai_score: 88,
  company_id: mockCompany.id,
  job_id: mockJob.id,
  created_at: new Date().toISOString(),
};

export const mockIneligibleCandidate = {
  id: "cand-ineligible-002",
  name: "سعد بن علي (غير مؤهل)",
  email: "saad@example.com",
  phone: "+966500000002",
  role: "مطور React",
  stage: "تقديم الطلب",
  ai_score: 45, // Less than required 75%
  company_id: mockCompany.id,
  job_id: mockJob.id,
  created_at: new Date().toISOString(),
};

export const mockPipelineStages = [
  {
    id: "stage-1",
    name: "تقديم الطلب",
    label: "تقديم الطلب",
    color: "#6366f1",
    order_index: 0,
    transition_rules: {},
  },
  {
    id: "stage-2",
    name: "مراجعة السيرة",
    label: "مراجعة السيرة",
    color: "#8b5cf6",
    order_index: 1,
    transition_rules: {
      require_ai_evaluation: true,
      min_ai_score: 75,
    },
  },
  {
    id: "stage-3",
    name: "فحص هاتفي",
    label: "فحص هاتفي",
    color: "#0ea5e9",
    order_index: 2,
    transition_rules: {},
  },
  {
    id: "stage-4",
    name: "مقابلة تقنية",
    label: "مقابلة تقنية",
    color: "#f59e0b",
    order_index: 3,
    transition_rules: {
      require_interview: true,
    },
  },
  {
    id: "stage-5",
    name: "العرض الوظيفي",
    label: "العرض الوظيفي",
    color: "#059669",
    order_index: 4,
    transition_rules: {},
  },
];

export const mockOffer = {
  id: "ofr-001",
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
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  sent_at: new Date().toISOString(),
  company_id: mockCompany.id,
  company_name: mockCompany.name,
};

export const mockAssessment = {
  id: "asm-001",
  token: "valid-assessment-token-999",
  title: "اختبار الكفاءة في React و TypeScript",
  description: "اختبار تقييمي لقياس المهارات البرمجية وأساسيات الواجهات",
  duration_minutes: 15,
  passing_score: 70,
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
    },
  ],
};

export const mockInvitation = {
  id: "inv-001",
  token: "valid-invite-token-777",
  email: "newmember@tawzeefx.com",
  role: "recruiter",
  status: "pending",
  company_id: mockCompany.id,
  expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  created_at: new Date().toISOString(),
  company: {
    name: mockCompany.name,
    logo_url: mockCompany.logo_url,
  },
};
