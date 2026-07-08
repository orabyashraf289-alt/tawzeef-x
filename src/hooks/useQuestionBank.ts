import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QuestionOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;
  user_id: string;
  job_id: string | null;
  question_text: string;
  question_type: "multiple_choice" | "open_ended" | "code" | "true_false";
  difficulty: "easy" | "medium" | "hard";
  category: string;
  correct_answer: string | null;
  explanation: string | null;
  code_language: string | null;
  time_limit_seconds: number | null;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
  jobs?: { title: string } | null;
}

export interface Assessment {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  is_randomized: boolean;
  is_active: boolean;
  token: string;
  created_at: string;
  updated_at: string;
  jobs?: { title: string } | null;
  assessment_questions?: { id: string; question_id: string; sort_order: number; points_override: number | null }[];
  _response_count?: number;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  candidate_id: string | null;
  candidate_name: string;
  candidate_email: string;
  started_at: string;
  completed_at: string | null;
  answers: any[];
  total_score: number;
  max_score: number;
  percentage: number;
  status: string;
}

export const mockQuestions: Question[] = [
  {
    id: "mock-q-1",
    user_id: "mock-user",
    job_id: null,
    question_text: "ما الفرق بين == و === في JavaScript؟",
    question_type: "multiple_choice",
    difficulty: "easy",
    category: "programming",
    correct_answer: null,
    explanation: "== تقارن القيمة فقط (بعد تحويل النوع)، بينما === تقارن القيمة والنوع معاً دون تحويل.",
    code_language: null,
    time_limit_seconds: 60,
    points: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      { id: "mock-opt-1", option_text: "== تقارن القيمة فقط، === تقارن القيمة والنوع", is_correct: true, sort_order: 0 },
      { id: "mock-opt-2", option_text: "لا يوجد فرق بينهما", is_correct: false, sort_order: 1 },
      { id: "mock-opt-3", option_text: "=== أسرع في الأداء فقط", is_correct: false, sort_order: 2 },
      { id: "mock-opt-4", option_text: "== تقارن النوع فقط", is_correct: false, sort_order: 3 },
    ],
  },
  {
    id: "mock-q-2",
    user_id: "mock-user",
    job_id: null,
    question_text: "ما هو مفهوم الـ RESTful API؟",
    question_type: "open_ended",
    difficulty: "medium",
    category: "programming",
    correct_answer: "RESTful API هو نمط معماري لبناء واجهات برمجة التطبيقات يعتمد على بروتوكول HTTP ويستخدم أفعال HTTP القياسية (GET, POST, PUT, DELETE) للتعامل مع الموارد.",
    explanation: "نمط يعتمد على الموارد والماتشينج مع HTTP verbs.",
    code_language: null,
    time_limit_seconds: 120,
    points: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [],
  },
  {
    id: "mock-q-3",
    user_id: "mock-user",
    job_id: null,
    question_text: "SQL Injection هو ثغرة أمنية تحدث عند عدم تنقية مدخلات المستخدم",
    question_type: "true_false",
    difficulty: "easy",
    category: "programming",
    correct_answer: "true",
    explanation: "تحدث هذه الثغرة عند دمج مدخلات المستخدم مباشرة في استعلامات SQL.",
    code_language: null,
    time_limit_seconds: 45,
    points: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [],
  },
  {
    id: "mock-q-4",
    user_id: "mock-user",
    job_id: null,
    question_text: "اكتب دالة تقوم بعكس نص (String) بدون استخدام الدوال الجاهزة",
    question_type: "code",
    difficulty: "medium",
    category: "programming",
    correct_answer: "function reverseString(str) {\n  let result = '';\n  for (let i = str.length - 1; i >= 0; i--) {\n    result += str[i];\n  }\n  return result;\n}",
    explanation: "يمكن عكس النص باستخدام حلقة تكرار تبدأ من النهاية إلى البداية.",
    code_language: "JavaScript",
    time_limit_seconds: 300,
    points: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [],
  }
];

export const mockAssessments: Assessment[] = [
  {
    id: "mock-a-1",
    user_id: "mock-user",
    job_id: null,
    title: "اختبار تقييم مطوري جافا سكريبت الأساسي",
    description: "يقيم هذا الاختبار المفاهيم الأساسية للغة جافا سكريبت وثغرات الويب الشائعة وهياكل البيانات.",
    duration_minutes: 30,
    passing_score: 70,
    is_randomized: false,
    is_active: true,
    token: "JSBASIC2026",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    jobs: null,
    assessment_questions: [
      { id: "mock-aq-1", question_id: "mock-q-1", sort_order: 0, points_override: null },
      { id: "mock-aq-2", question_id: "mock-q-2", sort_order: 1, points_override: null },
      { id: "mock-aq-3", question_id: "mock-q-3", sort_order: 2, points_override: null },
      { id: "mock-aq-4", question_id: "mock-q-4", sort_order: 3, points_override: null },
    ],
    _response_count: 3,
  }
];

export const mockResponses: AssessmentResponse[] = [
  {
    id: "mock-res-1",
    assessment_id: "mock-a-1",
    candidate_id: null,
    candidate_name: "علي أحمد",
    candidate_email: "ali@example.com",
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3000000).toISOString(),
    answers: [],
    total_score: 9,
    max_score: 11,
    percentage: 81.82,
    status: "completed",
  },
  {
    id: "mock-res-2",
    assessment_id: "mock-a-1",
    candidate_id: null,
    candidate_name: "منى عمر",
    candidate_email: "mona@example.com",
    started_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date(Date.now() - 6600000).toISOString(),
    answers: [],
    total_score: 11,
    max_score: 11,
    percentage: 100.00,
    status: "completed",
  },
  {
    id: "mock-res-3",
    assessment_id: "mock-a-1",
    candidate_id: null,
    candidate_name: "عمر خالد",
    candidate_email: "omar@example.com",
    started_at: new Date(Date.now() - 10800000).toISOString(),
    completed_at: new Date(Date.now() - 10200000).toISOString(),
    answers: [],
    total_score: 6,
    max_score: 11,
    percentage: 54.54,
    status: "completed",
  }
];

export function useQuestions(jobId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["questions", user?.id, jobId],
    queryFn: async () => {
      if (!user) return mockQuestions;

      try {
        let query = supabase
          .from("question_bank")
          .select("*, jobs(title)")
          .order("created_at", { ascending: false });
        if (jobId) query = query.eq("job_id", jobId);
        const { data, error } = await query;
        if (error) throw error;

        // Seed if empty
        if (!data || data.length === 0) {
          const seedKey = `tawzeef_questions_seeded_${user.id}`;
          if (localStorage.getItem(seedKey)) {
            return [];
          }
          console.log("Seeding default questions for user:", user.id);
          localStorage.setItem(seedKey, "true");
          const seededQuestions = mockQuestions.map(q => ({
            user_id: user.id,
            job_id: q.job_id,
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty: q.difficulty,
            category: q.category,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            code_language: q.code_language,
            time_limit_seconds: q.time_limit_seconds,
            points: q.points,
            is_active: q.is_active,
          }));

          const { data: insertedQ, error: errQ } = await supabase
            .from("question_bank")
            .insert(seededQuestions)
            .select();

          if (errQ || !insertedQ) {
            console.error("Error seeding default questions:", errQ);
            return mockQuestions;
          }

          // Now seed options for MCQs, matching, and ordering
          const mcqInDb = insertedQ.filter(q => ["multiple_choice", "matching", "ordering"].includes(q.question_type));
          if (mcqInDb.length > 0) {
            const optionsToInsert: any[] = [];
            mcqInDb.forEach(dbQ => {
              const originalQ = mockQuestions.find(mq => mq.question_text === dbQ.question_text);
              if (originalQ && originalQ.options) {
                originalQ.options.forEach(opt => {
                  optionsToInsert.push({
                    question_id: dbQ.id,
                    option_text: opt.option_text,
                    is_correct: opt.is_correct,
                    sort_order: opt.sort_order,
                  });
                });
              }
            });

            if (optionsToInsert.length > 0) {
              const { error: errOpt } = await supabase
                .from("question_options")
                .insert(optionsToInsert);
              if (errOpt) {
                console.error("Error seeding default question options:", errOpt);
              }
            }
          }

          // Fetch again to get fully populated records
          const { data: refetchedData, error: refetchErr } = await supabase
            .from("question_bank")
            .select("*, jobs(title)")
            .order("created_at", { ascending: false });

          if (!refetchErr && refetchedData && refetchedData.length > 0) {
            const mcIds = refetchedData.filter(q => ["multiple_choice", "matching", "ordering"].includes(q.question_type)).map(q => q.id);
            let optionsMap: Record<string, QuestionOption[]> = {};
            if (mcIds.length > 0) {
              const { data: opts } = await supabase
                .from("question_options")
                .select("*")
                .in("question_id", mcIds)
                .order("sort_order");
              if (opts) {
                opts.forEach(o => {
                  if (!optionsMap[o.question_id]) optionsMap[o.question_id] = [];
                  optionsMap[o.question_id].push(o);
                });
              }
            }
            return refetchedData.map(q => ({ ...q, options: optionsMap[q.id] || [] })) as Question[];
          }
          return insertedQ as Question[];
        }

        // Fetch options for multiple choice, matching, and ordering questions
        const mcIds = data.filter(q => ["multiple_choice", "matching", "ordering"].includes(q.question_type)).map(q => q.id);
        let optionsMap: Record<string, QuestionOption[]> = {};
        if (mcIds.length > 0) {
          const { data: opts } = await supabase
            .from("question_options")
            .select("*")
            .in("question_id", mcIds)
            .order("sort_order");
          if (opts) {
            opts.forEach(o => {
              if (!optionsMap[o.question_id]) optionsMap[o.question_id] = [];
              optionsMap[o.question_id].push(o);
            });
          }
        }

        return data.map(q => ({ ...q, options: optionsMap[q.id] || [] })) as Question[];
      } catch (err) {
        console.error("Failed to fetch/seed questions from supabase, falling back to mock:", err);
        return mockQuestions;
      }
    },
  });
}

export function useCreateQuestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ question, options }: { question: Omit<Question, "id" | "user_id" | "created_at" | "updated_at" | "options" | "jobs">; options?: QuestionOption[] }) => {
      const { data, error } = await supabase
        .from("question_bank")
        .insert({ ...question, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;

      if (options && options.length > 0) {
        const { error: optErr } = await supabase
          .from("question_options")
          .insert(options.map((o, i) => ({ question_id: data.id, option_text: o.option_text, is_correct: o.is_correct, sort_order: i })) as any);
        if (optErr) throw optErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "تم إضافة السؤال بنجاح" });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "تم حذف السؤال" });
    },
    onError: (error: any) => {
      console.error("Error deleting question:", error);
      toast({ title: "خطأ في حذف السؤال", description: error.message, variant: "destructive" });
    },
  });
}

export function useBulkDeleteQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("question_bank").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: `تم حذف ${ids.length} سؤال` });
    },
  });
}

export function useDuplicateQuestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Question) => {
      const { data, error } = await supabase
        .from("question_bank")
        .insert({
          user_id: user!.id,
          question_text: `${q.question_text} (نسخة)`,
          question_type: q.question_type,
          difficulty: q.difficulty,
          job_id: q.job_id,
          points: q.points,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          code_language: q.code_language,
          category: q.category,
          time_limit_seconds: q.time_limit_seconds,
          is_active: q.is_active,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (q.options && q.options.length > 0) {
        await supabase.from("question_options").insert(
          q.options.map((o, i) => ({
            question_id: data.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
            sort_order: i,
          })) as any
        );
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "تم نسخ السؤال" });
    },
  });
}

export function useBulkUpdateQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Question> }) => {
      const { error } = await supabase.from("question_bank").update(updates as any).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "تم التحديث بنجاح" });
    },
  });
}

export function useDuplicateAssessment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data: orig, error: e1 } = await supabase
        .from("assessments")
        .select("*, assessment_questions(question_id, sort_order, points_override)")
        .eq("id", assessmentId)
        .single();
      if (e1 || !orig) throw e1;
      const { data: created, error: e2 } = await supabase
        .from("assessments")
        .insert({
          user_id: user!.id,
          title: `${orig.title} (نسخة)`,
          description: orig.description,
          job_id: orig.job_id,
          duration_minutes: orig.duration_minutes,
          passing_score: orig.passing_score,
          is_randomized: orig.is_randomized,
          is_active: false,
        } as any)
        .select()
        .single();
      if (e2) throw e2;
      const aq = (orig as any).assessment_questions || [];
      if (aq.length > 0) {
        await supabase.from("assessment_questions").insert(
          aq.map((x: any) => ({
            assessment_id: created.id,
            question_id: x.question_id,
            sort_order: x.sort_order,
            points_override: x.points_override,
          })) as any
        );
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم نسخ الاختبار" });
    },
  });
}

export function useToggleAssessmentActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("assessments").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم التحديث" });
    },
  });
}

export function useAssessments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assessments", user?.id],
    queryFn: async () => {
      if (!user) return mockAssessments;

      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*, jobs(title), assessment_questions(id, question_id, sort_order, points_override)")
          .order("created_at", { ascending: false });
        if (error) throw error;

        // Seed if empty
        if (!data || data.length === 0) {
          const seedKey = `tawzeef_assessments_seeded_${user.id}`;
          if (localStorage.getItem(seedKey)) {
            return [];
          }
          console.log("Seeding default assessments for user:", user.id);
          localStorage.setItem(seedKey, "true");
          
          // First, get the user's questions in database (we need their real IDs in DB)
          const { data: dbQuestions } = await supabase
            .from("question_bank")
            .select("id, question_text")
            .eq("user_id", user.id);

          const qMap: Record<string, string> = {};
          if (dbQuestions) {
            dbQuestions.forEach(q => {
              qMap[q.question_text] = q.id;
            });
          }

          // Create the assessment
          const seededAssessment = {
            user_id: user.id,
            job_id: null,
            title: mockAssessments[0].title,
            description: mockAssessments[0].description,
            duration_minutes: mockAssessments[0].duration_minutes,
            passing_score: mockAssessments[0].passing_score,
            is_randomized: mockAssessments[0].is_randomized,
            is_active: mockAssessments[0].is_active,
          };

          const { data: insertedA, error: errA } = await supabase
            .from("assessments")
            .insert(seededAssessment)
            .select()
            .single();

          if (errA || !insertedA) {
            console.error("Error seeding default assessment:", errA);
            return mockAssessments;
          }

          // Link questions to this assessment
          const aqToInsert: any[] = [];
          mockAssessments[0].assessment_questions?.forEach((aq, idx) => {
            const originalQ = mockQuestions.find(mq => mq.id === aq.question_id);
            if (originalQ) {
              const dbQId = qMap[originalQ.question_text];
              if (dbQId) {
                aqToInsert.push({
                  assessment_id: insertedA.id,
                  question_id: dbQId,
                  sort_order: idx,
                  points_override: aq.points_override,
                });
              }
            }
          });

          if (aqToInsert.length > 0) {
            const { error: errAQ } = await supabase
              .from("assessment_questions")
              .insert(aqToInsert);
            if (errAQ) {
              console.error("Error linking default questions to seeded assessment:", errAQ);
            }
          }

          // Seed responses for this new assessment
          const responsesToInsert = mockResponses.map(r => ({
            assessment_id: insertedA.id,
            candidate_name: r.candidate_name,
            candidate_email: r.candidate_email,
            started_at: r.started_at,
            completed_at: r.completed_at,
            answers: r.answers,
            total_score: r.total_score,
            max_score: r.max_score,
            percentage: r.percentage,
            status: r.status,
          }));

          const { error: errRes } = await supabase
            .from("assessment_responses")
            .insert(responsesToInsert);
          if (errRes) {
            console.error("Error seeding responses for assessment:", errRes);
          }

          // Re-fetch fully populated assessments
          const { data: refetchedAssessments } = await supabase
            .from("assessments")
            .select("*, jobs(title), assessment_questions(id, question_id, sort_order, points_override)")
            .order("created_at", { ascending: false });

          if (refetchedAssessments && refetchedAssessments.length > 0) {
            const ids = refetchedAssessments.map(a => a.id);
            let countMap: Record<string, number> = {};
            const { data: respCount } = await supabase
              .from("assessment_responses")
              .select("assessment_id")
              .in("assessment_id", ids);
            if (respCount) {
              respCount.forEach(r => {
                countMap[r.assessment_id] = (countMap[r.assessment_id] || 0) + 1;
              });
            }
            return refetchedAssessments.map(a => ({ ...a, _response_count: countMap[a.id] || 0 })) as Assessment[];
          }

          return [{ ...insertedA, _response_count: mockResponses.length }] as Assessment[];
        }

        // Get response counts
        const ids = data.map(a => a.id);
        let countMap: Record<string, number> = {};
        if (ids.length > 0) {
          const { data: responses } = await supabase
            .from("assessment_responses")
            .select("assessment_id")
            .in("assessment_id", ids);
          if (responses) {
            responses.forEach(r => {
              countMap[r.assessment_id] = (countMap[r.assessment_id] || 0) + 1;
            });
          }
        }

        return data.map(a => ({ ...a, _response_count: countMap[a.id] || 0 })) as Assessment[];
      } catch (err) {
        console.error("Failed to fetch/seed assessments from supabase, falling back to mock:", err);
        return mockAssessments;
      }
    },
  });
}

export function useCreateAssessment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assessment, questionIds }: { assessment: { title: string; description?: string; job_id?: string | null; duration_minutes: number; passing_score: number; is_randomized: boolean }; questionIds: string[] }) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert({ ...assessment, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;

      if (questionIds.length > 0) {
        const { error: aqErr } = await supabase
          .from("assessment_questions")
          .insert(questionIds.map((qid, i) => ({ assessment_id: data.id, question_id: qid, sort_order: i })) as any);
        if (aqErr) throw aqErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم إنشاء الاختبار بنجاح" });
    },
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم حذف الاختبار" });
    },
    onError: (error: any) => {
      console.error("Error deleting assessment:", error);
      toast({ title: "خطأ في حذف الاختبار", description: error.message, variant: "destructive" });
    },
  });
}

export function useAssessmentResponses(assessmentId: string) {
  return useQuery({
    queryKey: ["assessment-responses", assessmentId],
    queryFn: async () => {
      if (assessmentId.startsWith("mock-")) {
        return mockResponses.filter(r => r.assessment_id === assessmentId);
      }
      try {
        const { data, error } = await supabase
          .from("assessment_responses")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as AssessmentResponse[];
      } catch (err) {
        console.error("Failed to fetch responses, returning mock:", err);
        return mockResponses.filter(r => r.assessment_id === assessmentId);
      }
    },
    enabled: !!assessmentId,
  });
}
