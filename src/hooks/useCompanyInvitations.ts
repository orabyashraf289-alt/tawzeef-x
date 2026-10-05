import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CompanyInvitationRow extends CompanyInvitation {
  company?: {
    name: string;
    name_en: string | null;
    logo_url: string | null;
  } | null;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface CompanyInvitation {
  id: string;
  company_id: string;
  branch_id?: string | null;
  email: string;
  member_role: "owner" | "hr" | "viewer";
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
}

function parseInvitation(row: Tables<"company_invitations">): CompanyInvitation {
  const { member_role, status } = row;
  if (!["owner", "hr", "viewer"].includes(member_role) ||
      !["pending", "accepted", "declined", "expired"].includes(status)) {
    throw new Error("تعذر قراءة حالة الدعوة أو صلاحيتها.");
  }
  return {
    ...row,
    member_role: member_role as CompanyInvitation["member_role"],
    status: status as InvitationStatus,
  };
}

// List invitations for a company (owner/admin view)
export function useCompanyInvitations(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-invitations", companyId],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invitations")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(parseInvitation);
    },
    enabled: !!companyId,
  });
}

// Invitations addressed to current user's email
export function useMyPendingInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-pending-invitations", user?.email],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("company_invitations")
        .select("*")
        .eq("email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      // The deployed table has no company_id foreign key for a PostgREST embed.
      const companyIds = [...new Set(data.map((invitation) => invitation.company_id))];
      const { data: companies, error: companyError } = await supabase.from("companies")
        .select("id, name, name_en, logo_url").in("id", companyIds);
      if (companyError) throw companyError;
      return data.map((invitation): CompanyInvitationRow => ({
        ...parseInvitation(invitation),
        company: companies?.find((company) => company.id === invitation.company_id) || null,
      }));
    },
    enabled: !!user?.email,
  });
}

export function useCreateCompanyInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      companyId,
      branchId,
      branchName,
      email,
      role,
    }: {
      companyId: string;
      branchId?: string | null;
      branchName?: string | null;
      email: string;
      role: "owner" | "hr" | "viewer";
    }) => {
      // Query company name first
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      const companyName = companyData ? (companyData as { name?: string })?.name : "شركتنا";

      const { data, error } = await supabase
        .from("company_invitations")
        .insert({
          company_id: companyId,
          branch_id: branchId || null,
          email: email.trim().toLowerCase(),
          member_role: role,
          invited_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as Record<string, unknown>), companyName, branchName, branchId };
    },

    onSuccess: (data: Record<string, unknown>, variables) => {
      qc.invalidateQueries({ queryKey: ["company-invitations", data.company_id] });
      toast({ title: "تم إرسال دعوة الانضمام بنجاح 📩", description: "سيتم إرسال البريد الإلكتروني مع تفاصيل الفرع للموظف" });

      const inviteLink = `${window.location.origin}/invitation/${data.token}`;
      const branchNotice = data.branchName
        ? variables.role === "viewer"
          ? ` والوصول إلى فرع <strong>${data.branchName}</strong>`
          : ` وتولي إدارة فرع <strong>${data.branchName}</strong>`
        : "";
      const emailSubject = data.branchName
        ? `دعوة للانضمام إلى فرع ${data.branchName} - شركة ${data.companyName}`
        : `دعوة للانضمام إلى شركة ${data.companyName} على منصة Tawzeef-X`;

      supabase.functions.invoke("send-email", {
        body: {
          to: data.email,
          subject: emailSubject,
          html: `
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0d9488; margin: 0;">منصة التوظيف الذكية Tawzeef-X</h2>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
              <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">مرحباً بك،</p>
              <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                لقد تمت دعوتك للانضمام إلى شركة <strong>${data.companyName}</strong>${branchNotice} كمسؤول توظيف وإدارة على منصة <strong>Tawzeef-X</strong>.
              </p>
              <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                يرجى الضغط على الرابط التالي لمراجعة وتأكيد قبول الدعوة وتفعيل حسابك المباشر:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background-color: #0d9488; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">قبول الدعوة وتأكيد الحساب الآن</a>
              </div>
              <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                * تنتهي صلاحية هذه الدعوة تلقائياً بعد 7 أيام.
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 30px;">
                مع تحيات فريق عمل Tawzeef-X.
              </p>
            </div>
          `
        }
      }).catch(err => {
        console.error("Failed to send invitation email:", err);
      });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ في إرسال الدعوة", description: e.message, variant: "destructive" }),
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-invitations"] });
      toast({ title: "تم إلغاء الدعوة" });
    },
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_company_invitation" as any, { _token: token });
      if (error) throw error;
      return data as { success: boolean; code?: string; company_id?: string; branch_id?: string };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      qc.invalidateQueries({ queryKey: ["my-companies"] });
      qc.invalidateQueries({ queryKey: ["company-branches"] });
      if (res?.success) toast({ title: "تم القبول وتأكيد الحساب بنجاح ✅", description: "تم تفعيل عضويتك بالشركة." });
      else
        toast({
          title: "تعذّر قبول الدعوة",
          description: res?.code || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeclineInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("decline_company_invitation" as any, { _token: token });
      if (error) throw error;
      return data as { success: boolean; code?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      toast({ title: "تم رفض الدعوة" });
    },
  });
}
