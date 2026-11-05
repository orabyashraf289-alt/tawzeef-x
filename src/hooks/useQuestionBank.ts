import type { Json } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
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
  question_type: "multiple_choice" | "open_ended" | "code" | "true_false" | "matching" | "ordering";
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
  answers: Json;
  tab_switches?: number | null;
  tab_switch_log?: Json;
  total_score: number;
  max_score: number;
  percentage: number;
  status: string;
}

export function useQuestions(jobId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["questions", user?.id, activeCompanyId, jobId],
    enabled: !!user && !!activeCompanyId,
    queryFn: async () => {
      let query = supabase.from("question_bank").select("*, jobs(title)")
        .eq("company_id", activeCompanyId!).order("created_at", { ascending: false });
      if (jobId && jobId !== "undefined" && jobId !== "null") query = query.eq("job_id", jobId);
      const { data, error } = await query;
      if (error) throw error;
      const ids = (data || []).map(q => q.id);
      if (!ids.length) return [];
      const { data: options, error: optionsError } = await supabase.from("question_options")
        .select("*").in("question_id", ids).order("sort_order");
      if (optionsError) throw optionsError;
      return data.map(q => ({ ...q, options: (options || []).filter(o => o.question_id === q.id) })) as Question[];
    },
  });
}

export function useCreateQuestion() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ question, options }: { question: Omit<Question, "id" | "user_id" | "created_at" | "updated_at" | "options" | "jobs">; options?: QuestionOption[] }) => {
      const { data, error } = await (supabase.rpc as any)("create_question_bank_item", {
        _company: activeCompanyId, _kind: "question", _item: question, _children: options || [],
      });
      if (error) throw error;
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
      const { error } = await supabase.from("question_bank").delete().eq("id", id).select("id").single();
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
      const { data, error } = await supabase.from("question_bank").delete().in("id", ids).select("id");
      if (error) throw error;
      if (data?.length !== new Set(ids).size) throw new Error("لم تتغير كل السجلات المطلوبة. راجع الصلاحيات وحدّث القائمة.");
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: `تم حذف ${ids.length} سؤال` });
    },
  });
}

export function useDuplicateQuestion() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Question) => {
      const { data, error } = await (supabase.rpc as any)("create_question_bank_item", {
        _company: activeCompanyId, _kind: "question",
        _item: { ...q, question_text: `${q.question_text} (نسخة)` }, _children: q.options || [],
      });
      if (error) throw error;
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
      const { data, error } = await supabase.from("question_bank").update(updates as any).in("id", ids).select("id");
      if (error) throw error;
      if (data?.length !== new Set(ids).size) throw new Error("لم تتغير كل السجلات المطلوبة. راجع الصلاحيات وحدّث القائمة.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "تم التحديث بنجاح" });
    },
  });
}

export function useDuplicateAssessment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data: orig, error: e1 } = await supabase
        .from("assessments")
        .select("*, assessment_questions(question_id, sort_order, points_override)")
        .eq("id", assessmentId)
        .single();
      if (e1 || !orig) throw e1;
      const { data: created, error: e2 } = await (supabase.rpc as any)("create_question_bank_item", {
        _company: activeCompanyId, _kind: "assessment",
        _item: { ...orig, title: `${orig.title} (نسخة)`, is_active: false },
        _children: (orig as any).assessment_questions || [],
      });
      if (e2) throw e2;
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
      const { error } = await supabase.from("assessments").update({ is_active } as any).eq("id", id).select("id").single();
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
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["assessments", user?.id, activeCompanyId],
    enabled: !!user && !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments")
        .select("*, jobs(title), assessment_questions(id, question_id, sort_order, points_override)")
        .eq("company_id", activeCompanyId!).order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      const { data: responses, error: responsesError } = await supabase.from("assessment_responses")
        .select("assessment_id").in("assessment_id", data.map(a => a.id));
      if (responsesError) throw responsesError;
      return data.map(a => ({ ...a, _response_count: (responses || []).filter(r => r.assessment_id === a.id).length })) as Assessment[];
    },
  });
}

export function useCreateAssessment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assessment, questionIds }: { assessment: { title: string; description?: string; job_id?: string | null; duration_minutes: number; passing_score: number; is_randomized: boolean }; questionIds: string[] }) => {
      const { data, error } = await (supabase.rpc as any)("create_question_bank_item", {
        _company: activeCompanyId, _kind: "assessment", _item: assessment,
        _children: questionIds.map(question_id => ({ question_id })),
      });
      if (error) throw error;
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
      const { error } = await supabase.from("assessments").delete().eq("id", id).select("id").single();
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
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["assessment-responses", activeCompanyId, user?.id, assessmentId],
    enabled: !!user && !!activeCompanyId && !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_responses")
        .select("*, assessments!inner(company_id)").eq("assessment_id", assessmentId)
        .eq("assessments.company_id", activeCompanyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AssessmentResponse[];
    },
  });
}
