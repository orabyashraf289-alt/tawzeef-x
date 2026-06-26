import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ChecklistItemStatus = "pending" | "in_progress" | "done" | "blocked" | "skipped";

export interface ChecklistTemplate {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  description: string | null;
  items: { title: string; description?: string }[];
  is_default: boolean;
}

export interface CandidateChecklist {
  id: string;
  candidate_id: string;
  company_id: string;
  title: string;
  template_key: string | null;
  status: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  status: ChecklistItemStatus;
  sort_order: number;
  assigned_to_type: string | null;
  assigned_to_user_id: string | null;
  agency_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  attachments: any[];
}

export function useChecklistTemplates() {
  return useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates" as any)
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as unknown as ChecklistTemplate[];
    },
  });
}

export function useCandidateChecklists(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-checklists", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_checklists" as any)
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as CandidateChecklist[];
    },
    enabled: !!candidateId,
  });
}

export function useChecklistItems(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-items", checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_checklist_items" as any)
        .select("*")
        .eq("checklist_id", checklistId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as ChecklistItem[];
    },
    enabled: !!checklistId,
  });
}

export function useCreateChecklistFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateId,
      companyId,
      templateKey,
    }: {
      candidateId: string;
      companyId: string;
      templateKey: string;
    }) => {
      // Fetch template
      const { data: tpl, error: tplErr } = await supabase
        .from("checklist_templates" as any)
        .select("*")
        .eq("key", templateKey)
        .maybeSingle();
      if (tplErr) throw tplErr;
      if (!tpl) throw new Error("القالب غير موجود");
      const tplData = tpl as any;

      // Create checklist
      const { data: checklist, error: cErr } = await supabase
        .from("candidate_checklists" as any)
        .insert({
          candidate_id: candidateId,
          company_id: companyId,
          title: tplData.name_ar,
          template_key: tplData.key,
        } as any)
        .select()
        .single();
      if (cErr) throw cErr;

      // Create items
      const items = (tplData.items as any[]).map((item, idx) => ({
        checklist_id: (checklist as any).id,
        title: item.title,
        description: item.description || null,
        sort_order: idx,
        status: "pending",
      }));
      const { error: iErr } = await supabase.from("candidate_checklist_items" as any).insert(items as any);
      if (iErr) throw iErr;
      return checklist;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["candidate-checklists", v.candidateId] });
      toast({ title: "تم إنشاء القائمة ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ChecklistItem> & { id: string }) => {
      const update: any = { ...input };
      if (input.status === "done" && !input.completed_at) {
        update.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("candidate_checklist_items" as any)
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-items"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidate_checklists" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate-checklists"] });
      toast({ title: "تم حذف القائمة" });
    },
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      checklistId,
      title,
      description,
      assigned_to_type,
      due_date,
    }: {
      checklistId: string;
      title: string;
      description?: string;
      assigned_to_type?: string;
      due_date?: string | null;
    }) => {
      const { data: existing } = await supabase
        .from("candidate_checklist_items" as any)
        .select("sort_order")
        .eq("checklist_id", checklistId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((existing as any[])?.[0]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from("candidate_checklist_items" as any).insert({
        checklist_id: checklistId,
        title,
        description: description || null,
        sort_order: nextOrder,
        status: "pending",
        assigned_to_type: assigned_to_type || "recruiter",
        due_date: due_date || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-items"] });
      toast({ title: "تمت الإضافة ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
