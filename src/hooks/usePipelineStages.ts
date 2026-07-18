import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PipelineStage {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  color: string;
  icon: string;
  is_active: boolean;
  is_default: boolean;
  transition_rules: TransitionRules;
  automation_rules?: any;
  assessment_id?: string | null;
  assigned_user_ids?: string[];
  sla_hours?: number;
}

export interface TransitionRules {
  require_interview?: boolean;
  require_ai_evaluation?: boolean;
  min_ai_score?: number;
  require_assessment?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface SubStage {
  id: string;
  stage_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  description: string;
  estimated_hours: number;
  checklist: ChecklistItem[];
  assignee_type: string;
}

export function usePipelineStages() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["pipeline_stages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]) as PipelineStage[];
    },
  });

  return query;
}

export function useActiveStages() {
  const { data: stages } = usePipelineStages();
  return (stages || []).filter(s => s.is_active);
}

export function useSubStages(stageId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pipeline_sub_stages", stageId],
    enabled: !!user && !!stageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_sub_stages" as any)
        .select("*")
        .eq("stage_id", stageId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map(d => ({
        ...d,
        checklist: Array.isArray(d.checklist) ? d.checklist : [],
        description: d.description || '',
        estimated_hours: d.estimated_hours || 0,
        assignee_type: d.assignee_type || 'recruiter',
      })) as SubStage[];
    },
  });
}

export function useAllSubStages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pipeline_sub_stages", "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_sub_stages" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map(d => ({
        ...d,
        checklist: Array.isArray(d.checklist) ? d.checklist : [],
        description: d.description || '',
        estimated_hours: d.estimated_hours || 0,
        assignee_type: d.assignee_type || 'recruiter',
      })) as SubStage[];
    },
  });
}

export function useStageMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["pipeline_stages", user?.id];

  const addStage = useMutation({
    mutationFn: async (stage: { name: string; color: string; icon: string; sort_order: number }) => {
      const { error } = await supabase.from("pipeline_stages" as any).insert({
        user_id: user!.id,
        ...stage,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineStage> & { id: string }) => {
      const { error } = await supabase
        .from("pipeline_stages" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pipeline_stages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reorderStages = useMutation({
    mutationFn: async (stages: { id: string; sort_order: number }[]) => {
      for (const s of stages) {
        await supabase
          .from("pipeline_stages" as any)
          .update({ sort_order: s.sort_order } as any)
          .eq("id", s.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const setDefaultStage = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("pipeline_stages" as any)
        .update({ is_default: false } as any)
        .neq("id", id);
      const { error } = await supabase
        .from("pipeline_stages" as any)
        .update({ is_default: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateTransitionRules = useMutation({
    mutationFn: async ({ id, rules }: { id: string; rules: TransitionRules }) => {
      const { error } = await supabase
        .from("pipeline_stages" as any)
        .update({ transition_rules: rules } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const applyTemplate = useMutation({
    mutationFn: async (templateStages: { name: string; color: string; icon: string; sort_order: number }[]) => {
      await supabase
        .from("pipeline_stages" as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      const rows = templateStages.map((s, i) => ({
        user_id: user!.id,
        ...s,
        sort_order: i,
        is_default: i === 0,
      }));
      const { error } = await supabase
        .from("pipeline_stages" as any)
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { addStage, updateStage, deleteStage, reorderStages, setDefaultStage, updateTransitionRules, applyTemplate };
}

export function useSubStageMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const addSubStage = useMutation({
    mutationFn: async (sub: { stage_id: string; name: string; sort_order: number; description?: string; estimated_hours?: number; assignee_type?: string }) => {
      const { error } = await supabase
        .from("pipeline_sub_stages" as any)
        .insert({ user_id: user!.id, ...sub } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pipeline_sub_stages", vars.stage_id] });
      qc.invalidateQueries({ queryKey: ["pipeline_sub_stages", "all"] });
    },
  });

  const updateSubStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubStage> & { id: string }) => {
      const { error } = await supabase
        .from("pipeline_sub_stages" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline_sub_stages"] });
    },
  });

  const deleteSubStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pipeline_sub_stages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline_sub_stages"] });
    },
  });

  return { addSubStage, updateSubStage, deleteSubStage };
}

export function useCandidateStageActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const rejectCandidate = useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason: string }) => {
      const { error } = await supabase
        .from("candidates")
        .update({ status: 'مرفوض', stage: 'مرفوض', rejection_reason: reason } as any)
        .eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });

  const deferCandidate = useMutation({
    mutationFn: async ({ candidateId }: { candidateId: string }) => {
      const { error } = await supabase
        .from("candidates")
        .update({ status: 'مؤجل', is_deferred: true } as any)
        .eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });

  const restoreCandidate = useMutation({
    mutationFn: async ({ candidateId, stage }: { candidateId: string; stage: string }) => {
      const { error } = await supabase
        .from("candidates")
        .update({ status: 'قيد المراجعة', stage, is_deferred: false, rejection_reason: null } as any)
        .eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });

  return { rejectCandidate, deferCandidate, restoreCandidate };
}

// Pipeline stage templates
export const STAGE_TEMPLATES = [
  {
    id: "ksa_full",
    name: "مسار التوظيف السعودي الكامل",
    nameEn: "KSA Full Recruitment Flow",
    description: "9 مراحل: من تحديد الاحتياج حتى عقد قوى",
    stages: [
      { name: "تحديد الاحتياج الوظيفي", color: "#6366f1", icon: "file-text" },
      { name: "تسجيل المتقدمين", color: "#8b5cf6", icon: "users" },
      { name: "الفرز الأولي AI", color: "#0ea5e9", icon: "file-search" },
      { name: "الاختبار التحريري", color: "#f97316", icon: "code" },
      { name: "المقابلة الفنية", color: "#f59e0b", icon: "users" },
      { name: "الاعتماد الإداري", color: "#a855f7", icon: "users" },
      { name: "عرض الوظيفة", color: "#10b981", icon: "briefcase" },
      { name: "إجراءات الاستقدام", color: "#0d9488", icon: "briefcase" },
      { name: "النقل إلى HR (قوى)", color: "#059669", icon: "briefcase" },
    ],
  },
  {
    id: "technical",
    name: "تقني",
    nameEn: "Technical",
    description: "مناسب لتوظيف المبرمجين والمهندسين",
    stages: [
      { name: "تقديم الطلب", color: "#6366f1", icon: "file-text" },
      { name: "فحص السيرة", color: "#8b5cf6", icon: "file-search" },
      { name: "اختبار كود", color: "#0ea5e9", icon: "code" },
      { name: "مقابلة تقنية", color: "#f59e0b", icon: "code" },
      { name: "مقابلة نهائية", color: "#10b981", icon: "users" },
      { name: "العرض الوظيفي", color: "#059669", icon: "briefcase" },
    ],
  },
  {
    id: "administrative",
    name: "إداري",
    nameEn: "Administrative",
    description: "مناسب للوظائف الإدارية والتنفيذية",
    stages: [
      { name: "تقديم الطلب", color: "#6366f1", icon: "file-text" },
      { name: "فحص السيرة", color: "#8b5cf6", icon: "file-search" },
      { name: "مقابلة هاتفية", color: "#0ea5e9", icon: "phone" },
      { name: "مقابلة شخصية", color: "#f59e0b", icon: "users" },
      { name: "العرض الوظيفي", color: "#059669", icon: "briefcase" },
    ],
  },
  {
    id: "marketing",
    name: "تسويق",
    nameEn: "Marketing",
    description: "مناسب لوظائف التسويق والمبيعات",
    stages: [
      { name: "تقديم الطلب", color: "#6366f1", icon: "file-text" },
      { name: "فحص السيرة", color: "#8b5cf6", icon: "file-search" },
      { name: "مهمة عملية", color: "#f97316", icon: "code" },
      { name: "مقابلة", color: "#10b981", icon: "users" },
      { name: "العرض الوظيفي", color: "#059669", icon: "briefcase" },
    ],
  },
  {
    id: "fast",
    name: "سريع",
    nameEn: "Fast Track",
    description: "مسار مختصر للتوظيف السريع",
    stages: [
      { name: "تقديم الطلب", color: "#6366f1", icon: "file-text" },
      { name: "مقابلة", color: "#f59e0b", icon: "users" },
      { name: "العرض الوظيفي", color: "#059669", icon: "briefcase" },
    ],
  },
];
