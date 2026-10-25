import { supabase } from "@/integrations/supabase/client";

export interface AccountAccess {
  allowed: boolean;
  reason?: string;
  isAgency?: boolean;
  isApplicant?: boolean;
  onboardingRequired?: boolean;
  registrationRequired?: boolean;
}

export function accountHome(access: AccountAccess): string {
  if (access.registrationRequired) return "/company-registration";
  if (access.onboardingRequired) return "/onboarding";
  if (access.isAgency) return "/agency";
  if (access.isApplicant) return "/applicant-dashboard";
  return "/dashboard";
}

export async function checkCompanyStatus(_user: any): Promise<AccountAccess> {
  try {
    // Single server-side source of truth: validate_tenant_status RPC
    const { data, error } = await supabase.rpc("validate_tenant_status");
    if (error) {
      console.error("Server-side tenant validation RPC error:", error);
      // FAIL CLOSED: Never allow login on security validation error
      return {
        allowed: false,
        reason: "فشل التحقق الأمني من حالة الحساب والمنظمة. يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.",
      };
    }

    const res = data as any;
    if (!res || res.access_state !== "ALLOWED") {
      if (res?.denial_reason === "NO_COMPANY_MEMBERSHIP") {
        const { data: registration, error: registrationError } = await supabase.rpc("get_my_company_registration" as any);
        if (registrationError) return { allowed: false, reason: "تعذر قراءة حالة طلب الشركة. حاول مرة أخرى." };
        if (["pending", "rejected"].includes((registration as any)?.status)) {
          return { allowed: true, registrationRequired: true };
        }
        const { data: pending, error: pendingError } = await supabase.rpc("can_complete_company_onboarding" as any);
        if (!pendingError && pending === true) {
          return { allowed: true, onboardingRequired: true };
        }
      }
      const reasonMap: Record<string, string> = {
        COMPANY_SUSPENDED: "تم إيقاف حساب الشركة مؤقتاً من قِبل إدارة المنصة. يرجى التواصل مع إدارة Tawzeef-X.",
        COMPANY_INACTIVE: "تم تعطيل حساب الشركة. يرجى التواصل مع مسؤول النظام.",
        COMPANY_DELETING: "حساب الشركة قيد الحذف النهائي ولا يمكن الوصول إليه.",
        COMPANY_DELETED: "تم حذف حساب هذه الشركة نهائياً من منصة Tawzeef-X، ولا يمكن تسجيل الدخول بهذا الحساب.",
        COMPANY_DELETE_FAILED: "حساب الشركة غير متاح حالياً بسبب إجراءات صيانة أمنية.",
        COMPANY_BLOCKED: "تم حظر حساب الشركة. يرجى مراجعة إدارة Tawzeef-X.",
        COMPANY_NOT_FOUND: "لم يتم العثور على المنظمة التابع لها هذا الحساب أو تم حذفها نهائياً.",
        NO_COMPANY_MEMBERSHIP: "تم حذف حساب الشركة نهائياً من منصة Tawzeef-X، ولم يعد هذا الحساب مرتبطاً بأي منظمة نشطة.",
        NOT_COMPANY_MEMBER: "هذا الحساب غير مخول بالوصول إلى الشركة المحددة.",
        UNAUTHENTICATED: "جلسة المستخدم غير صالحة.",
      };

      const denialReason = (res?.denial_reason as string) || "";
      const message = reasonMap[denialReason] || "تم رفض تسجيل الدخول بناءً على سياسات التحقق الأمني للشركات.";

      return {
        allowed: false,
        reason: message,
      };
    }

    return { allowed: true, isAgency: res.is_agency === true, isApplicant: res.is_candidate === true && res.is_platform_admin !== true };
  } catch (err) {
    console.error("Critical error during server-side tenant validation (fail-closed):", err);
    // FAIL CLOSED: Strictly deny on unexpected exceptions
    return {
      allowed: false,
      reason: "حدث خطأ أمني غير متوقع أثناء التحقق من حالة الحساب. تم رفض الدخول لحماية البيانات.",
    };
  }
}

