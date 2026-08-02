import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CompanyRow {
  id: string;
  parent_company_id?: string | null;
  manager_user_id?: string | null;
  status: string;
  [key: string]: unknown;
}

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
}

export interface CompanyMemberRow {
  id: string;
  company_id: string;
  user_id: string;
  member_role: string;
  company?: Company;
}

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
  address?: string | null;
  owner_user_id: string | null;
  manager_user_id?: string | null;
  manager_profile?: {
    full_name: string | null;
    job_title?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
  status: string;
  created_at: string;
  parent_company_id?: string | null;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  member_role: "owner" | "hr" | "viewer" | "admin";
  joined_at: string;
  profiles?: {
    full_name: string | null;
    job_title?: string | null;
    avatar_url?: string | null;
  } | null;
}

// Helper to encode custom company metadata into DB-safe notes JSON
export function prepareCompanyPayload(input: Record<string, any>, existingNotes?: string | null) {
  let existingMeta: Record<string, any> = {};
  if (existingNotes) {
    try {
      existingMeta = typeof existingNotes === "string" && existingNotes.startsWith("{")
        ? JSON.parse(existingNotes)
        : { description: existingNotes };
    } catch {
      existingMeta = { description: existingNotes };
    }
  }

  // Extract non-schema custom fields
  const { parent_company_id, manager_user_id, address, e2e_encryption, brand_settings, notes: inputNotes, description: inputDesc, ...schemaFields } = input;

  const cleanDesc = typeof inputNotes === "string" && !inputNotes.startsWith("{")
    ? inputNotes
    : typeof inputDesc === "string"
    ? inputDesc
    : existingMeta.description || null;

  const mergedMeta = {
    ...existingMeta,
    ...(parent_company_id !== undefined ? { parent_company_id } : {}),
    ...(manager_user_id !== undefined ? { manager_user_id } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(e2e_encryption !== undefined ? { e2e_encryption } : {}),
    ...(brand_settings !== undefined ? { brand_settings } : {}),
    ...(cleanDesc ? { description: cleanDesc } : {}),
  };

  return {
    ...schemaFields,
    notes: Object.keys(mergedMeta).length > 0 ? JSON.stringify(mergedMeta) : null,
  };
}

// Helper to decode DB row notes JSON back into full Company object
export function parseCompanyRow(c: Record<string, any>): Company {
  if (!c) return c as Company;
  let meta: Record<string, any> = {};
  let isJsonNotes = false;

  if (c.notes && typeof c.notes === "string" && c.notes.startsWith("{")) {
    try {
      meta = JSON.parse(c.notes);
      isJsonNotes = typeof meta === "object" && meta !== null;
    } catch {}
  }

  const cleanNotes = isJsonNotes
    ? (typeof meta.description === "string" ? meta.description : typeof meta.address === "string" ? meta.address : null)
    : c.notes;

  return {
    ...c,
    notes: cleanNotes,
    parent_company_id: c.parent_company_id || meta.parent_company_id || null,
    manager_user_id: c.manager_user_id || meta.manager_user_id || null,
    address: c.address || meta.address || cleanNotes || null,
    e2e_encryption: c.e2e_encryption || meta.e2e_encryption || false,
    brand_settings: c.brand_settings || meta.brand_settings || null,
  } as Company;
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
      return (data || []).map(parseCompanyRow);
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
      return data ? parseCompanyRow(data) : null;
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
      return (data as CompanyMemberRow[]).map((r) => ({
        ...parseCompanyRow(r.company as any),
        member_role: r.member_role,
      })) as (Company & { member_role: string })[];
    },
    enabled: !!user,
  });
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_members" as any)
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = Array.from(new Set(data.map((m: CompanyMemberRow) => m.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, job_title, avatar_url")
        .in("user_id", userIds);

      return data.map((m: CompanyMemberRow) => {
        const pr = (profiles || []).find((p: ProfileRow) => p.user_id === m.user_id);
        return {
          ...m,
          profiles: pr || null,
        };
      }) as CompanyMember[];
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
      return ((data as CompanyMemberRow)?.member_role as "owner" | "hr" | "viewer" | undefined) || null;
    },
    enabled: !!companyId && !!user,
  });
}

export function useAddCompanyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, userId, role }: { companyId: string; userId: string; role: "owner" | "hr" | "viewer" | "admin" }) => {
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
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Company>) => {
      const payload = prepareCompanyPayload(input);
      const { data, error } = await supabase
        .from("companies" as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return parseCompanyRow(data);
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
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Company> & { id: string }) => {
      const { data: existing } = await supabase
        .from("companies" as any)
        .select("notes")
        .eq("id", id)
        .maybeSingle();

      const payload = prepareCompanyPayload(input, existing?.notes);
      const { error } = await supabase.from("companies" as any).update(payload as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["all-companies"] });
      qc.invalidateQueries({ queryKey: ["company", v.id] });
      qc.invalidateQueries({ queryKey: ["company-branches"] });
      toast({ title: "تم التحديث ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
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
      qc.invalidateQueries({ queryKey: ["company-branches"] });
      toast({ title: "تم الحذف ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

// Stats for a single company
export function useCompanyStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-stats", companyId],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
      const [jobs, candidates, interviews, offers] = await Promise.all([
        sb.from("jobs").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("candidates").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("interviews").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        sb.from("job_offers").select("id, status", { count: "exact" }).eq("company_id", companyId!),
      ]);
      return {
        jobsTotal: jobs.count || 0,
        jobsActive: (jobs.data || []).filter((j: Record<string, unknown>) => j.status === "نشطة").length,
        candidatesTotal: candidates.count || 0,
        interviewsTotal: interviews.count || 0,
        offersTotal: offers.count || 0,
        offersAccepted: (offers.data || []).filter((o: Record<string, unknown>) => o.status === "accepted").length,
      };
    },
    enabled: !!companyId,
  });
}

// Fetch all branches of a parent company with assigned manager profiles
export function useCompanyBranches(parentId: string | undefined) {
  return useQuery({
    queryKey: ["company-branches", parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const parsedCompanies = data.map(parseCompanyRow);
      const branchCompanies = parsedCompanies.filter((c) => c.parent_company_id === parentId);

      const managerUserIds = Array.from(
        new Set(branchCompanies.map((c) => c.manager_user_id).filter(Boolean))
      ) as string[];
      let profilesMap: Record<string, unknown> = {};

      if (managerUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, job_title, avatar_url")
          .in("user_id", managerUserIds);

        (profs || []).forEach((p: ProfileRow) => {
          profilesMap[p.user_id] = p;
        });
      }

      return branchCompanies.map((c) => ({
        ...c,
        manager_profile: c.manager_user_id ? profilesMap[c.manager_user_id] || null : null,
      })) as Company[];
    },
    enabled: !!parentId,
  });
}

// Create a branch for a parent company with assigned manager
export function useCreateCompanyBranch() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Company> & { parent_company_id: string; manager_user_id?: string | null }) => {
      const payload = prepareCompanyPayload({
        ...input,
        status: "active",
        owner_user_id: user?.id || null,
      });

      // 1) Insert branch company
      const { data: comp, error: compErr } = await supabase
        .from("companies" as any)
        .insert(payload as any)
        .select()
        .single();

      if (compErr) throw compErr;

      // 2) Add owner to company_members

      if (user) {
        await supabase
          .from("company_members" as any)
          .insert({
            company_id: comp.id,
            user_id: user.id,
            member_role: "owner"
          } as any);
      }

      // 3) Add assigned branch manager to company_members if specified and not user
      if (input.manager_user_id && input.manager_user_id !== user?.id) {
        await supabase
          .from("company_members" as any)
          .insert({
            company_id: comp.id,
            user_id: input.manager_user_id,
            member_role: "hr"
          } as any);
      }

      return comp as unknown as Company;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["company-branches", v.parent_company_id] });
      qc.invalidateQueries({ queryKey: ["my-companies", user?.id] });
      toast({ title: "تم إنشاء الفرع وتعيين المسؤول بنجاح ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
