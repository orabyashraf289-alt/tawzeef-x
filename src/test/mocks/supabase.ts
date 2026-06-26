import { vi } from "vitest";

// Reusable mock data
export const mockUser = {
  id: "test-user-id-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { full_name: "Test User", account_type: "company" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockJobs = [
  {
    id: "job-1",
    user_id: mockUser.id,
    title: "مطور واجهات أمامية",
    department: "الهندسة",
    location: "الرياض",
    type: "دوام كامل",
    status: "نشطة",
    description: "نبحث عن مطور React",
    requirements: ["React", "TypeScript"],
    salary_min: 15000,
    salary_max: 25000,
    experience_level: "3-5 سنوات",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "job-2",
    user_id: mockUser.id,
    title: "مصمم UI/UX",
    department: "التصميم",
    location: "جدة",
    type: "عن بُعد",
    status: "نشطة",
    description: null,
    requirements: null,
    salary_min: null,
    salary_max: null,
    experience_level: null,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  },
];

export const mockCandidates = [
  {
    id: "cand-1",
    user_id: mockUser.id,
    name: "أحمد محمد",
    email: "ahmed@test.com",
    phone: "0501234567",
    role: "مطور واجهات أمامية",
    stage: "تقديم الطلب",
    status: "قيد المراجعة",
    source: "نموذج التقديم",
    ai_score: 85,
    job_id: "job-1",
    created_at: "2024-01-16T10:00:00Z",
    updated_at: "2024-01-16T10:00:00Z",
    tracking_code: "ABC12345",
    skills: ["React", "TypeScript"],
    experience: "4 سنوات",
    education: "بكالوريوس علوم حاسب",
    location: "الرياض",
    summary: null,
    ai_evaluation: null,
    rating: 0,
    resume_url: null,
  },
];

export const mockInterviews = [
  {
    id: "int-1",
    user_id: mockUser.id,
    candidate_name: "أحمد محمد",
    candidate_id: "cand-1",
    position: "مطور واجهات أمامية",
    date: "2024-02-01",
    time: "10:00:00",
    type: "عن بُعد",
    status: "مجدولة",
    interviewer: "محمد علي",
    meeting_url: "https://meet.google.com/abc-def",
    notes: null,
    rating: null,
    recording_url: null,
    transcript: null,
    created_at: "2024-01-20T10:00:00Z",
    updated_at: "2024-01-20T10:00:00Z",
  },
];

export const mockNotifications = [
  {
    id: "notif-1",
    user_id: mockUser.id,
    title: "طلب توظيف جديد: أحمد محمد",
    description: "تقدم أحمد محمد لوظيفة مطور واجهات أمامية",
    type: "application",
    read: false,
    created_at: "2024-01-16T10:00:00Z",
  },
];

// Create chainable query builder mock
function createQueryBuilder(data: any[] = [], error: any = null) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data, error, count: data.length })),
  };
  // Make the builder thenable
  builder[Symbol.toStringTag] = "Promise";
  return builder;
}

export function createMockSupabase() {
  const mockFrom = vi.fn((table: string) => {
    switch (table) {
      case "jobs": return createQueryBuilder(mockJobs);
      case "candidates": return createQueryBuilder(mockCandidates);
      case "interviews": return createQueryBuilder(mockInterviews);
      case "notifications": return createQueryBuilder(mockNotifications);
      default: return createQueryBuilder([]);
    }
  });

  return {
    from: mockFrom,
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      resetPasswordForEmail: vi.fn(),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  };
}
