import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any[]).map(p => ({
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
    queryFn: async () => {
      if (!user) return null;

      // 1) Get all company memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from("company_members" as any)
        .select("company_id")
        .eq("user_id", user.id);

      if (memberErr || !memberRows || memberRows.length === 0) return null;

      const companyIds = memberRows.map((r: any) => r.company_id);
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
      return (data as any) as CompanySubscription | null;
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

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ planId, limit }: { planId: string; limit: number }) => {
      if (!user) throw new Error("User not authenticated");

      // 1) Get all company memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from("company_members" as any)
        .select("company_id")
        .eq("user_id", user.id);

      if (memberErr || !memberRows || memberRows.length === 0) throw new Error("No company found for user");

      const companyIds = memberRows.map((r: any) => r.company_id);
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, parent_company_id")
        .in("id", companyIds);

      if (!companiesData || companiesData.length === 0) throw new Error("No company found for user");

      // Prefer main company (parent_company_id is null)
      const mainCompany = companiesData.find((c) => !c.parent_company_id);
      const activeCompany = mainCompany || companiesData[0];
      const targetCompanyId = activeCompany.parent_company_id || activeCompany.id;

      // 2) Update subscription
      const { data, error } = await supabase
        .from("company_subscriptions" as any)
        .update({
          plan_id: planId,
          job_posts_limit: limit,
          job_posts_used: 0,
          updated_at: new Date().toISOString()
        } as any)
        .eq("company_id", targetCompanyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    }
  });
}
