import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Company {
  id: string;
  name: string;
  name_en: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  owner_user_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  member_role: "owner" | "hr" | "viewer";
  joined_at: string;
}

// Admin: list all companies
export function useAllCompanies() {
  return useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Company[];
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Company | null;
    },
    enabled: !!id,
  });
}

// Companies the current user belongs to
export function useMyCompanies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-companies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members" as any)
        .select("member_role, company:company_id(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]).map((r) => ({ ...r.company, member_role: r.member_role })) as (Company & { member_role: string })[];
    },
    enabled: !!user,
  });
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data as unknown as CompanyMember[];
    },
    enabled: !!companyId,
  });
}

// Current user's role inside a specific company
export function useMyCompanyRole(companyId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-company-role", companyId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_members" as any)
        .select("member_role")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return ((data as any)?.member_role as "owner" | "hr" | "viewer" | undefined) || null;
    },
    enabled: !!companyId && !!user,
  });
}

export function useAddCompanyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, userId, role }: { companyId: string; userId: string; role: "owner" | "hr" | "viewer" }) => {
      const { error } = await supabase.from("company_members" as any).insert({
        company_id: companyId,
        user_id: userId,
        member_role: role,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["company-members", v.companyId] });
      toast({ title: "تمت الإضافة ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useRemoveCompanyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-members"] });
      toast({ title: "تمت الإزالة" });
    },
  });
}

export function useToggleCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const { error } = await supabase.from("companies" as any).update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-companies"] });
      qc.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "تم تحديث الحالة ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Company>) => {
      const { data, error } = await supabase
        .from("companies" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Company;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["all-companies"] });
      toast({ title: "تم إنشاء الشركة بنجاح ✅" });

      if (data.contact_email) {
        supabase.functions.invoke("send-email", {
          body: {
            to: data.contact_email,
            subject: `مرحباً بك في منصة Tawzeef-X - ${data.name}`,
            html: `
              <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #0d9488; margin: 0;">منصة التوظيف الذكية Tawzeef-X</h2>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">مرحباً بك،</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                  لقد تم تسجيل شركتكم <strong>${data.name}</strong> بنجاح في منصة التوظيف الذكية <strong>Tawzeef-X</strong>.
                </p>
                <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                  يمكنكم الآن الدخول واستخدام المنصة لإدارة الوظائف، تقييم المرشحين بالذكاء الاصطناعي، وجدولة المقابلات.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/auth" style="background-color: #0d9488; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">تسجيل الدخول للمنصة</a>
                </div>
                <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 30px;">
                  مع تحيات فريق عمل Tawzeef-X.
                </p>
              </div>
            `
          }
        }).catch(err => {
          console.error("Failed to send welcome email:", err);
        });
      }
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Company> & { id: string }) => {
      const { error } = await supabase.from("companies" as any).update(input as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["all-companies"] });
      qc.invalidateQueries({ queryKey: ["company", v.id] });
      toast({ title: "تم التحديث ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-companies"] });
      toast({ title: "تم الحذف ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

// Stats for a single company
export function useCompanyStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-stats", companyId],
    queryFn: async () => {
      const sb = supabase as any;
      const [jobs, candidates, interviews, offers] = await Promise.all([
        sb.from("jobs").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("candidates").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("interviews").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("job_offers").select("id, status", { count: "exact" }).eq("company_id", companyId!),
      ]);
      return {
        jobsTotal: jobs.count || 0,
        jobsActive: (jobs.data || []).filter((j: any) => j.status === "نشطة").length,
        candidatesTotal: candidates.count || 0,
        interviewsTotal: interviews.count || 0,
        offersTotal: offers.count || 0,
        offersAccepted: (offers.data || []).filter((o: any) => o.status === "accepted").length,
      };
    },
    enabled: !!companyId,
  });
}
