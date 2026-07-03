import { useQuery } from "@tanstack/react-query";
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

      // 1) Get company_id
      const { data: memberData } = await supabase
        .from("company_members" as any)
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberData?.company_id) return null;

      // 2) Get company subscription
      const { data, error } = await supabase
        .from("company_subscriptions" as any)
        .select("*")
        .eq("company_id", memberData.company_id)
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
