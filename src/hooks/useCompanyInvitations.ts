import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  member_role: "owner" | "hr" | "viewer";
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
}

// List invitations for a company (owner/admin view)
export function useCompanyInvitations(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-invitations", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invitations" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CompanyInvitation[];
    },
    enabled: !!companyId,
  });
}

// Invitations addressed to current user's email
export function useMyPendingInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-pending-invitations", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("company_invitations" as any)
        .select("*, company:company_id(name, name_en, logo_url)")
        .eq("email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
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
      email,
      role,
    }: {
      companyId: string;
      email: string;
      role: "owner" | "hr" | "viewer";
    }) => {
      // Query company name first
      const { data: companyData } = await supabase
        .from("companies" as any)
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      const companyName = companyData ? (companyData as any).name : "شركتنا";

      const { data, error } = await supabase
        .from("company_invitations" as any)
        .insert({
          company_id: companyId,
          email: email.trim().toLowerCase(),
          member_role: role,
          invited_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as any), companyName };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["company-invitations", data.company_id] });
      toast({ title: "تم إرسال الدعوة ✅", description: "سيتم إرسال بريد إلكتروني للدعوة أيضاً" });

      const inviteLink = `${window.location.origin}/invitation/${data.token}`;
      supabase.functions.invoke("send-email", {
        body: {
          to: data.email,
          subject: `دعوة للانضمام إلى شركة ${data.companyName} على منصة Tawzeef-X`,
          html: `
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0d9488; margin: 0;">دعوة انضمام - Tawzeef-X</h2>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
              <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">مرحباً بك،</p>
              <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                لقد تمت دعوتك للانضمام إلى شركة <strong>${data.companyName}</strong> كعضو بفريق التوظيف (بصلاحية <strong>${data.member_role === 'owner' ? 'مالك' : data.member_role === 'hr' ? 'HR' : 'مشاهد'}</strong>) على منصة <strong>Tawzeef-X</strong>.
              </p>
              <p style="font-size: 15px; color: #334155; line-height: 1.8;">
                يرجى الضغط على الرابط التالي لمراجعة وقبول أو رفض الدعوة:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background-color: #0d9488; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">قبول الدعوة الآن</a>
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
    onError: (e: any) =>
      toast({ title: "خطأ في إرسال الدعوة", description: e.message, variant: "destructive" }),
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_invitations" as any).delete().eq("id", id);
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
      return data as { success: boolean; code?: string; company_id?: string };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      qc.invalidateQueries({ queryKey: ["my-companies"] });
      if (res?.success) toast({ title: "تم القبول ✅", description: "أصبحت عضواً في الشركة" });
      else
        toast({
          title: "تعذّر قبول الدعوة",
          description: res?.code || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
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
