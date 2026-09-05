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

      // Get company name for notifications
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      const companyName = companyData?.name || "الشركة";

      let insertedRecord: any = null;

      try {
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
        insertedRecord = data;
      } catch (err: any) {
        const isTableMissing =
          err?.code === "PGRST205" ||
          err?.message?.includes("schema cache") ||
          err?.message?.includes("subscription_upgrade_requests");

        if (isTableMissing) {
          console.warn("Table subscription_upgrade_requests is missing in Supabase. Using fallback notification and local storage queue.");

          const fallbackReq: UpgradeRequestRow = {
            id: `local-req-${Date.now()}`,
            company_id: companyId,
            requested_by_user_id: user.id,
            target_plan_id: targetPlanId,
            target_plan_name: targetPlanName,
            status: "pending",
            notes: notes || null,
            created_at: new Date().toISOString(),
          };

          try {
            const saved = JSON.parse(localStorage.getItem("tx_pending_upgrade_requests") || "[]");
            saved.unshift(fallbackReq);
            localStorage.setItem("tx_pending_upgrade_requests", JSON.stringify(saved));
          } catch (e) {
            console.warn("Could not save to localStorage:", e);
          }

          insertedRecord = fallbackReq;
        } else {
          throw err;
        }
      }

      // Dispatch notifications to all system administrators
      try {
        const adminUserIds = new Set<string>();

        // 1. Check user_roles table for admins
        const { data: adminRoles } = await supabase
          .from("user_roles" as any)
          .select("user_id")
          .eq("role", "admin");
        (adminRoles || []).forEach((r: any) => r.user_id && adminUserIds.add(r.user_id));

        // 2. Check profiles table for admins / super_admins
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, email, role")
          .or("role.eq.admin,role.eq.super_admin,email.eq.tx@tawzeefx.com,email.eq.ctraining801@gmail.com");
        (adminProfiles || []).forEach((p: any) => {
          const uid = p.user_id || p.id;
          if (uid) adminUserIds.add(uid);
        });

        // Insert notification for each admin found
        const notifsToInsert: any[] = [];
        adminUserIds.forEach((adminId) => {
          notifsToInsert.push({
            user_id: adminId,
            title: `طلب ترقية باقة جديد: ${companyName} 🚀`,
            description: `طلبت شركة "${companyName}" الترقية إلى باقة "${targetPlanName}". ${notes ? `ملاحظات: "${notes}"` : ""}`,
            type: "subscription_upgrade",
            read: false,
          });
        });

        // Also add notification for the requester himself
        notifsToInsert.push({
          user_id: user.id,
          title: `تم إرسال طلب ترقية الباقة بنجاح 📋`,
          description: `تم إرسال طلب ترقية باقة شركتك إلى "${targetPlanName}" لإدارة المنصة، وستتم المراجعة والتفعيل قريباً.`,
          type: "subscription_upgrade",
          read: false,
        });

        if (notifsToInsert.length > 0) {
          await supabase.from("notifications").insert(notifsToInsert);
        }

        // Activity log
        try {
          await supabase.from("activity_log" as any).insert({
            user_id: user.id,
            action: "subscription.upgrade_requested",
            entity_type: "company",
            entity_id: companyId,
            details: `طلب ترقية إلى باقة ${targetPlanName} من شركة ${companyName}`,
          });
        } catch {}
      } catch (notifErr) {
        console.warn("Could not dispatch admin notifications:", notifErr);
      }

      return insertedRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });
}

export function useUpgradeRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-upgrade-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      let dbRequests: UpgradeRequestRow[] = [];
      try {
        const { data, error } = await supabase
          .from("subscription_upgrade_requests" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          const isTableMissing =
            error.code === "PGRST205" ||
            error.message?.includes("schema cache") ||
            error.message?.includes("subscription_upgrade_requests");
          if (!isTableMissing) throw error;
        } else if (data) {
          dbRequests = data as UpgradeRequestRow[];
        }
      } catch (err) {
        console.warn("Table subscription_upgrade_requests query skipped:", err);
      }

      // Merge with local fallback
      let localRequests: UpgradeRequestRow[] = [];
      try {
        localRequests = JSON.parse(localStorage.getItem("tx_pending_upgrade_requests") || "[]");
      } catch {}

      const allRequests = [...localRequests, ...dbRequests.filter((d) => !localRequests.some((l) => l.id === d.id))];
      if (allRequests.length === 0) return [];

      const companyIds = Array.from(new Set(allRequests.map((r: UpgradeRequestRow) => r.company_id)));
      const userIds = Array.from(new Set(allRequests.map((r: UpgradeRequestRow) => r.requested_by_user_id).filter(Boolean)));

      const { data: cos } = await supabase.from("companies").select("id, name").in("id", companyIds);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      return allRequests.map((r: UpgradeRequestRow) => {
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
      requestId,
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
      requestId?: string;
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

      // 2) Generate Invoice if requested (wrapped safely in case company_invoices table is not yet migrated)
      if (issueInvoice) {
        const invoiceCount = Math.floor(100 + Math.random() * 900);
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const invoiceNum = `INV-${year}-${month}-${invoiceCount}`;

        try {
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
        } catch (invErr) {
          console.warn("Could not record invoice into company_invoices (table might need migration):", invErr);
        }
      }

      // 3) If this upgrade resolves a specific request, mark it as approved
      if (requestId) {
        try {
          await supabase
            .from("subscription_upgrade_requests" as any)
            .update({
              status: "approved",
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", requestId);
        } catch (reqErr) {
          console.warn("Could not mark request as approved in DB:", reqErr);
        }

        // Also update local storage fallback queue if present
        try {
          const local = JSON.parse(localStorage.getItem("tx_pending_upgrade_requests") || "[]");
          const updated = local.map((r: any) => (r.id === requestId ? { ...r, status: "approved" } : r));
          localStorage.setItem("tx_pending_upgrade_requests", JSON.stringify(updated));
        } catch {}
      }

      // 4) Send approval notification to the company owner
      if (ownerUserId) {
        try {
          await supabase.from("notifications").insert({
            user_id: ownerUserId,
            title: `تمت ترقية باقة شركتكم بنجاح! 🎉`,
            description: `تم اعتماد وتفعيل باقة "${planNameAr}". استمتع بجميع المزايا والصلاحيات الجديدة.`,
            type: "upgrade_approved",
            read: false,
          });
        } catch (notifErr) {
          console.warn("Could not send approval notification:", notifErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["company-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });
}

export function useRejectUpgradeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, ownerUserId, reason }: { requestId: string; ownerUserId?: string | null; reason?: string }) => {
      // 1. Update in DB
      try {
        await supabase
          .from("subscription_upgrade_requests" as any)
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", requestId);
      } catch (e) {
        console.warn("Could not reject in DB:", e);
      }

      // 2. Update local storage
      try {
        const local = JSON.parse(localStorage.getItem("tx_pending_upgrade_requests") || "[]");
        const updated = local.map((r: any) => (r.id === requestId ? { ...r, status: "rejected" } : r));
        localStorage.setItem("tx_pending_upgrade_requests", JSON.stringify(updated));
      } catch {}

      // 3. Notify owner
      if (ownerUserId) {
        try {
          await supabase.from("notifications").insert({
            user_id: ownerUserId,
            title: `بشأن طلب ترقية الباقة`,
            description: reason
              ? `تعذر قبول طلب الترقية حالياً: ${reason}`
              : `تمت مراجعة طلب ترقية الباقة ولم تتم الموافقة عليه في الوقت الحالي. يمكنك التواصل مع فريق الدعم للمزيد من التفاصيل.`,
            type: "upgrade_rejected",
            read: false,
          });
        } catch {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });
}

export function useCompanyInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["company-invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from("company_invoices" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          const isTableMissing =
            error.code === "PGRST205" ||
            error.message?.includes("schema cache") ||
            error.message?.includes("company_invoices");
          if (isTableMissing) return [];
          throw error;
        }
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
      } catch (err) {
        console.warn("Table company_invoices query skipped:", err);
        return [];
      }
    },
    enabled: !!user,
  });
}
