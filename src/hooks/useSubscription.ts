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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
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

      // 2) Get company subscription by company_id OR fallback to user_id
      let { data: subRow, error } = await supabase
        .from("company_subscriptions" as any)
        .select("*")
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      if (!subRow) {
        const { data: userSub } = await supabase
          .from("company_subscriptions" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        subRow = userSub;
      }

      // 3) Auto-reconcile with latest paid invoice from company_invoices if present!
      try {
        const { data: latestInvoice } = await supabase
          .from("company_invoices" as any)
          .select("*")
          .eq("company_id", targetCompanyId)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestInvoice) {
          const needsReconcile =
            !subRow ||
            subRow.plan_id !== latestInvoice.plan_id ||
            subRow.job_posts_limit !== latestInvoice.job_posts_limit;

          if (needsReconcile) {
            // Attempt self-heal in background
            supabase
              .from("company_subscriptions" as any)
              .upsert({
                company_id: targetCompanyId,
                user_id: user.id,
                plan_id: latestInvoice.plan_id,
                job_posts_limit: latestInvoice.job_posts_limit,
                job_posts_used: subRow?.job_posts_used || 0,
                status: "active",
                starts_at: latestInvoice.starts_at,
                expires_at: latestInvoice.expires_at,
                updated_at: new Date().toISOString(),
              } as any, { onConflict: "company_id" })
              .then(() => {});

            return {
              id: subRow?.id || latestInvoice.subscription_id || latestInvoice.id,
              user_id: user.id,
              company_id: targetCompanyId,
              plan_id: latestInvoice.plan_id,
              status: "active",
              job_posts_limit: latestInvoice.job_posts_limit,
              job_posts_used: subRow?.job_posts_used || 0,
              starts_at: latestInvoice.starts_at,
              expires_at: latestInvoice.expires_at,
            } as CompanySubscription;
          }
        }
      } catch (invErr) {
        console.warn("Could not check company_invoices for auto-reconciliation:", invErr);
      }

      if (error && !subRow) throw error;
      return (subRow as unknown) as CompanySubscription | null;
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

      const companyIds = memberRows.map((r: any) => r.company_id);
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name, parent_company_id")
        .in("id", companyIds);

      const mainCompany = (companiesData || []).find((c) => !c.parent_company_id);
      const activeCompany = mainCompany || (companiesData && companiesData[0]);
      const companyId = activeCompany?.parent_company_id || activeCompany?.id || companyIds[0];
      const companyName = activeCompany?.name || "الشركة";

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

      // 1. Dispatch in-app notifications to all system administrators
      try {
        const adminUserIds = new Set<string>();

        // Check user_roles table for admins
        const { data: adminRoles } = await supabase
          .from("user_roles" as any)
          .select("user_id")
          .eq("role", "admin");
        (adminRoles || []).forEach((r: any) => r.user_id && adminUserIds.add(r.user_id));

        // Check profiles table for admins / super_admins
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, email, role")
          .or("role.eq.admin,role.eq.super_admin,email.eq.tx@tawzeefx.com,email.eq.ctraining801@gmail.com");
        (adminProfiles || []).forEach((p: any) => {
          const uid = p.user_id || p.id;
          if (uid) adminUserIds.add(uid);
        });

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

        // Also add confirmation notification for the requester himself
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

      // 2. Dispatch direct EMAIL notification to system admins (tx@tawzeefx.com and ctraining801@gmail.com)
      try {
        const adminEmails = new Set<string>(["tx@tawzeefx.com", "ctraining801@gmail.com"]);
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("email, role")
          .or("role.eq.admin,role.eq.super_admin");
        (adminProfiles || []).forEach((p) => {
          if (p.email && p.email.includes("@")) adminEmails.add(p.email);
        });

        const reviewUrl = `${window.location.origin}/admin/companies`;
        const emailSubject = `🚀 طلب ترقية باقة جديد: شركة "${companyName}" — Tawzeef-X`;
        const emailHtml = `
          <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: right; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">منصة التوظيف الذكي Tawzeef-X</h1>
              <p style="color: #38bdf8; margin: 6px 0 0 0; font-size: 13px; font-weight: 600;">إشعار إداري عاجل — طلب ترقية باقة اشتراك</p>
            </div>
            
            <div style="padding: 28px 24px;">
              <p style="font-size: 16px; color: #1e293b; font-weight: bold; margin-bottom: 16px;">
                مرحباً بإدارة النظام،
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 24px;">
                قامت شركة <strong style="color: #0d9488;">${companyName}</strong> بتقديم طلب رسمي لترقية باقة اشتراكها على المنصة. تفاصيل الطلب:
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 35%;">اسم الشركة:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${companyName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">الباقة المطلوبة:</td>
                    <td style="padding: 8px 0; color: #0d9488; font-weight: 800;">${targetPlanName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">مقدم الطلب:</td>
                    <td style="padding: 8px 0; color: #0f172a;">${user.email || "حساب الشركة"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">تاريخ الطلب:</td>
                    <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                  ${notes ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; vertical-align: top;">ملاحظات العميل:</td>
                    <td style="padding: 8px 0; color: #334155; background: #ffffff; border-radius: 6px; padding: 8px;">${notes}</td>
                  </tr>
                  ` : ""}
                </table>
              </div>

              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${reviewUrl}" style="background: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                  مراجعة واعتماد الطلب في لوحة التحكم ←
                </a>
              </div>
            </div>

            <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">هذا إشعار آلي صادر من نظام Tawzeef-X لإدارة الاشتراكات</p>
            </div>
          </div>
        `;

        for (const adminEmail of adminEmails) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: adminEmail,
                subject: emailSubject,
                html: emailHtml,
                user_id: user.id,
              },
            });
          } catch (emErr) {
            console.warn(`Could not send upgrade email to ${adminEmail}:`, emErr);
          }
        }
      } catch (err) {
        console.warn("Error sending admin upgrade request emails:", err);
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

      try {
        const { data: upserted, error: upErr } = await supabase
          .from("company_subscriptions" as any)
          .upsert({
            company_id: companyId,
            user_id: activeUserId,
            plan_id: planId,
            job_posts_limit: jobPostsLimit,
            job_posts_used: 0,
            status: "active",
            starts_at: startsAt,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          } as any, {
            onConflict: "company_id"
          })
          .select()
          .single();

        if (upErr) {
          console.warn("Upsert on company_subscriptions failed, trying update by ID:", upErr);
          if (existing?.id) {
            await supabase
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
              .eq("id", existing.id);
          }
        } else if (upserted?.id) {
          subId = upserted.id;
        }
      } catch (subErr) {
        console.warn("Subscription update error:", subErr);
      }

      // Also ensure any row for activeUserId has company_id set
      if (activeUserId) {
        try {
          await supabase
            .from("company_subscriptions" as any)
            .update({ company_id: companyId, plan_id: planId, job_posts_limit: jobPostsLimit, status: "active" } as any)
            .eq("user_id", activeUserId)
            .is("company_id", null);
        } catch {}
      }

      // 2) Generate Invoice if requested
      let invoiceNum = "";
      if (issueInvoice) {
        const invoiceCount = Math.floor(100 + Math.random() * 900);
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        invoiceNum = `INV-${year}-${month}-${invoiceCount}`;

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
          console.warn("Could not record invoice into company_invoices:", invErr);
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

      // 4) Send approval in-app notification to the company owner
      if (ownerUserId) {
        try {
          await supabase.from("notifications").insert({
            user_id: ownerUserId,
            title: `تمت ترقية وتفعيل باقة شركتكم بنجاح! 🎉`,
            description: `تم اعتماد وتفعيل باقة "${planNameAr}". استمتع بجميع المزايا والصلاحيات وحدود التوظيف الجديدة.`,
            type: "upgrade_approved",
            read: false,
          });
        } catch (notifErr) {
          console.warn("Could not send approval notification:", notifErr);
        }
      }

      // 5) Send celebratory approval EMAIL to company owner & company email
      try {
        const { data: companyRow } = await supabase
          .from("companies")
          .select("name, contact_email, owner_user_id")
          .eq("id", companyId)
          .maybeSingle();

        const targetCompanyTitle = companyRow?.name || "شركتكم الموقرة";
        const recipientEmails = new Set<string>();
        if (companyRow?.contact_email && companyRow.contact_email.includes("@")) {
          recipientEmails.add(companyRow.contact_email);
        }

        const effectiveOwnerId = ownerUserId || companyRow?.owner_user_id;
        if (effectiveOwnerId) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", effectiveOwnerId)
            .maybeSingle();
          if (ownerProfile?.email && ownerProfile.email.includes("@")) {
            recipientEmails.add(ownerProfile.email);
          }
        }

        const dashboardUrl = `${window.location.origin}/dashboard`;
        const emailSubject = `🎉 تهانينا! تم تفعيل باقة "${planNameAr}" بنجاح لشركة ${targetCompanyTitle} — Tawzeef-X`;
        const emailHtml = `
          <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: right; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
            <div style="background: linear-gradient(135deg, #065f46 0%, #0d9488 100%); padding: 36px 24px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                🎉
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900;">تهانينا! تم تفعيل باقتكم بنجاح</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">منصة التوظيف الذكي Tawzeef-X</p>
            </div>

            <div style="padding: 28px 24px;">
              <p style="font-size: 16px; color: #1e293b; font-weight: bold; margin-bottom: 12px;">
                عزيزنا الشريك في شركة <span style="color: #0d9488;">${targetCompanyTitle}</span>،
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 24px;">
                يسعدنا إبلاغكم بأنه تم اعتماد وترقية اشتراككم رسميًا إلى باقة <strong style="color: #0d9488;">"${planNameAr}"</strong>، وتم تحديث صلاحياتكم وحدود نشر الوظائف بنجاح!
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                  📋 تفاصيل الاشتراك المفعّل:
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 40%;">نوع الباقة:</td>
                    <td style="padding: 8px 0; color: #0d9488; font-weight: 800;">${planNameAr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">حدود منشورات التوظيف:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">
                      ${jobPostsLimit === -1 ? "غير محدود (منشورات مفتوحة) 🚀" : `${jobPostsLimit} وظيفة نشطة`}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">تاريخ بداية الاشتراك:</td>
                    <td style="padding: 8px 0; color: #0f172a;">${new Date(startsAt).toLocaleDateString("ar-SA")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">تاريخ انتهاء / تجديد الاشتراك:</td>
                    <td style="padding: 8px 0; color: #0f172a;">${expiresAt ? new Date(expiresAt).toLocaleDateString("ar-SA") : "تجديد تلقائي"}</td>
                  </tr>
                  ${invoiceNum ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">رقم الفاتورة الرسمية:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${invoiceNum}</td>
                  </tr>
                  ` : ""}
                </table>
              </div>

              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${dashboardUrl}" style="background: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                  بدء استخدام المزايا ونشر الوظائف الآن ←
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 12px;">
                يمكنكم أيضاً مراجعة وتحميل الفاتورة الضريبية في أي وقت من قسم "الإعدادات ← الاشتراك والفواتير".
              </p>
            </div>

            <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">شكراً لاختياركم Tawzeef-X شريكاً لنجاح توظيفكم</p>
            </div>
          </div>
        `;

        for (const email of recipientEmails) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: email,
                subject: emailSubject,
                html: emailHtml,
                user_id: user.id,
              },
            });
          } catch (e) {
            console.warn(`Could not dispatch approval email to ${email}:`, e);
          }
        }
      } catch (emailErr) {
        console.warn("Could not dispatch approval email notification:", emailErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["company-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });
}

export function useRejectUpgradeRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

      // 3. Notify owner in-app
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

      // 4. Send email notification to owner if email exists
      if (ownerUserId && user) {
        try {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", ownerUserId)
            .maybeSingle();

          if (ownerProfile?.email && ownerProfile.email.includes("@")) {
            await supabase.functions.invoke("send-email", {
              body: {
                to: ownerProfile.email,
                subject: `تحديث بشأن طلب ترقية باقة الاشتراك — Tawzeef-X`,
                html: `
                  <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: right; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #0f172a; margin-top: 0;">منصة Tawzeef-X</h2>
                    <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                      مرحباً ${ownerProfile.full_name || "عزيزنا العميل"}،
                    </p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.8;">
                      تمت مراجعة طلب ترقية باقة اشتراككم من قِبل إدارة المنصة.
                    </p>
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 16px 0; color: #991b1b; font-size: 14px;">
                      ${reason ? `السبب: ${reason}` : "تعذر قبول طلب الترقية في الوقت الحالي. للمزيد من التفاصيل أو لترتيب باقة مخصصة، يرجى التواصل مع فريق الدعم."}
                    </div>
                    <p style="font-size: 13px; color: #94a3b8;">فريق إدارة Tawzeef-X</p>
                  </div>
                `,
                user_id: user.id,
              },
            });
          }
        } catch (emErr) {
          console.warn("Could not send rejection email:", emErr);
        }
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
