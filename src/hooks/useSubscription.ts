import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  job_posts_limit: number;
  features: string | string[];
  is_active: boolean;
  sort_order: number;
}

export interface CompanyMemberRow {
  company_id: string;
  user_id: string;
}

export interface UpgradeRequestRow {
  id: string;
  company_id: string;
  requested_by_user_id: string | null;
  target_plan_id: string;
  target_plan_name: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  company_id: string;
  subscription_id: string | null;
  plan_id: string;
  plan_name_ar: string;
  amount: number;
  currency: string;
  job_posts_limit: number;
  starts_at: string;
  expires_at: string | null;
  status: "paid" | "pending" | "cancelled";
  issued_by_user_id: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  job_posts_limit: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface CompanySubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  job_posts_used: number;
  job_posts_limit: number;
  starts_at: string;
  expires_at: string | null;
}

export interface SubscriptionUpgradeRequest {
  id: string;
  company_id: string;
  requested_by_user_id: string | null;
  target_plan_id: string;
  target_plan_name: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  company_name?: string;
  requester_name?: string;
}

export interface CompanyInvoice {
  id: string;
  invoice_number: string;
  company_id: string;
  subscription_id: string | null;
  plan_id: string;
  plan_name_ar: string;
  amount: number;
  currency: string;
  job_posts_limit: number;
  starts_at: string;
  expires_at: string | null;
  status: "paid" | "pending" | "cancelled";
  issued_by_user_id: string | null;
  created_at: string;
  company_name?: string;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as SubscriptionPlanRow[]).map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      })) as SubscriptionPlan[];
    },
  });
}

export function useMySubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-subscription", user?.id],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!user) return null;

      // 1) Get all company memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from("company_members" as any)
        .select("company_id")
        .eq("user_id", user.id);

      if (memberErr || !memberRows || memberRows.length === 0) return null;

      const companyIds = memberRows.map((r: CompanyMemberRow) => r.company_id);
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, parent_company_id")
        .in("id", companyIds);

      if (!companiesData || companiesData.length === 0) return null;

      // Prefer main company (parent_company_id is null)
      const mainCompany = companiesData.find((c) => !c.parent_company_id);
      const activeCompany = mainCompany || companiesData[0];
      const targetCompanyId = activeCompany.parent_company_id || activeCompany.id;

      // 2) Get company subscription
      const { data, error } = await supabase
        .from("company_subscriptions" as any)
        .select("*")
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown) as CompanySubscription | null;
    },
    enabled: !!user,
  });
}

export function useCanPostJob() {
  const sub = useMySubscription();
  
  const canPost = sub.data 
    ? sub.data.job_posts_limit === -1 || sub.data.job_posts_used < sub.data.job_posts_limit
    : false;
  
  const remaining = sub.data
    ? sub.data.job_posts_limit === -1 ? Infinity : sub.data.job_posts_limit - sub.data.job_posts_used
    : 0;

  return {
    canPost,
    remaining,
    used: sub.data?.job_posts_used ?? 0,
    limit: sub.data?.job_posts_limit ?? 0,
    isLoading: sub.isLoading,
    subscription: sub.data,
  };
}

export function useCreateUpgradeRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ targetPlanId, targetPlanName, notes }: { targetPlanId: string; targetPlanName: string; notes?: string }) => {
      if (!user) throw new Error("المستخدم غير مسجل الدخول");

      const { data: memberRows } = await supabase
        .from("company_members" as any)
        .select("company_id")
        .eq("user_id", user.id);

      if (!memberRows || memberRows.length === 0) throw new Error("لم يتم العثور على شركة مرتبطة بالحساب");

      const companyId = memberRows[0].company_id;

      const { data, error } = await supabase
        .from("subscription_upgrade_requests" as any)
        .insert({
          company_id: companyId,
          requested_by_user_id: user.id,
          target_plan_id: targetPlanId,
          target_plan_name: targetPlanName,
          status: "pending",
          notes: notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
    },
  });
}

export function useUpgradeRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-upgrade-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("subscription_upgrade_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const companyIds = Array.from(new Set(data.map((r: UpgradeRequestRow) => r.company_id)));
      const userIds = Array.from(new Set(data.map((r: UpgradeRequestRow) => r.requested_by_user_id).filter(Boolean)));

      const { data: cos } = await supabase.from("companies").select("id, name").in("id", companyIds);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      return data.map((r: UpgradeRequestRow) => {
        const co = (cos || []).find((c) => c.id === r.company_id);
        const pr = (profiles || []).find((p) => p.user_id === r.requested_by_user_id);
        return {
          ...r,
          company_name: co?.name || "شركة غير معرفة",
          requester_name: pr?.full_name || "مستخدم غير معرف",
        } as SubscriptionUpgradeRequest;
      });
    },
    enabled: !!user,
  });
}

export function useAdminCustomUpgradeSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      companyId,
      ownerUserId,
      planId,
      planNameAr,
      jobPostsLimit,
      price,
      startsAt,
      expiresAt,
      issueInvoice = true,
    }: {
      companyId: string;
      ownerUserId?: string | null;
      planId: string;
      planNameAr: string;
      jobPostsLimit: number;
      price: number;
      startsAt: string;
      expiresAt: string | null;
      issueInvoice?: boolean;
    }) => {
      if (!user) throw new Error("المستخدم غير مصرح له");

      const activeUserId = ownerUserId || user.id;

      // 1) Update/Upsert company subscription
      const { data: existing } = await supabase
        .from("company_subscriptions" as any)
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();

      let subId = existing?.id;

      if (existing) {
        const { error } = await supabase
          .from("company_subscriptions" as any)
          .update({
            plan_id: planId,
            job_posts_limit: jobPostsLimit,
            job_posts_used: 0,
            status: "active",
            starts_at: startsAt,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("company_id", companyId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("company_subscriptions" as any)
          .insert({
            company_id: companyId,
            user_id: activeUserId,
            plan_id: planId,
            job_posts_limit: jobPostsLimit,
            job_posts_used: 0,
            status: "active",
            starts_at: startsAt,
            expires_at: expiresAt,
          } as any)
          .select()
          .single();
        if (error) throw error;
        subId = created?.id;
      }

      // 2) Generate Invoice if requested
      if (issueInvoice) {
        const invoiceCount = Math.floor(100 + Math.random() * 900);
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const invoiceNum = `INV-${year}-${month}-${invoiceCount}`;

        await supabase.from("company_invoices" as any).insert({
          invoice_number: invoiceNum,
          company_id: companyId,
          subscription_id: subId || null,
          plan_id: planId,
          plan_name_ar: planNameAr,
          amount: price,
          currency: "SAR",
          job_posts_limit: jobPostsLimit,
          starts_at: startsAt,
          expires_at: expiresAt,
          status: "paid",
          issued_by_user_id: user.id,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["company-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
    },
  });
}

export function useCompanyInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["company-invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("company_invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const companyIds = Array.from(new Set(data.map((i: InvoiceRow) => i.company_id)));
      const { data: cos } = await supabase.from("companies").select("id, name").in("id", companyIds);

      return data.map((inv: InvoiceRow) => {
        const co = (cos || []).find((c) => c.id === inv.company_id);
        return {
          ...inv,
          company_name: co?.name || "شركة غير معرفة",
        } as CompanyInvoice;
      });
    },
    enabled: !!user,
  });
}
