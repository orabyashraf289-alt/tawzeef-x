import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getPublicBaseUrl } from "@/lib/getPublicUrl";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { getActiveCompanyId, resolveTenantCompanyScope } from "@/hooks/useJobs";

export interface JobOfferWithCandidate extends JobOffer {
  candidates: {
    name: string;
    email: string;
  } | null;
}

export interface JobOffer {
  id: string;
  user_id: string;
  candidate_id: string | null;
  job_id: string | null;
  position: string;
  department: string | null;
  salary: number;
  currency: string;
  start_date: string | null;
  offer_type: string;
  benefits: string[] | null;
  additional_terms: string | null;
  status: string;
  token: string;
  response_date: string | null;
  response_notes: string | null;
  signature_url: string | null;
  expires_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

async function triggerOfferAutomationEvent(params: {
  eventType: string;
  userId: string;
  offerId: string;
  position: string;
  candidateId?: string | null;
  status?: string;
}) {
  if (!params.candidateId) return;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, name, email")
    .eq("id", params.candidateId)
    .single();

  if (!candidate?.email) return;

  await supabase.functions.invoke("send-webhook", {
    body: {
      event_type: params.eventType,
      user_id: params.userId,
      payload: {
        offer_id: params.offerId,
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        position: params.position,
        status: params.status,
      },
    },
  });
}

export function useOffers(specificCompanyId?: string | null) {
  const { user } = useAuth();
  const activeCompanyId = specificCompanyId !== undefined ? specificCompanyId : getActiveCompanyId();

  return useQuery({
    queryKey: ["offers", user?.id, activeCompanyId],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const scopedCompanyIds = await resolveTenantCompanyScope(user?.id, activeCompanyId);

      let companyUserIds: string[] = [];
      if (scopedCompanyIds.length > 0) {
        try {
          const { data: compMems } = await supabase
            .from("company_members")
            .select("user_id")
            .in("company_id", scopedCompanyIds);
          if (compMems) {
            companyUserIds = compMems.map((m: any) => m.user_id).filter(Boolean);
          }
        } catch (e) {
          console.warn("Could not fetch user company memberships for offers:", e);
        }
      }

      let scopedCandidateIds: string[] = [];
      if (scopedCompanyIds.length > 0) {
        try {
          const { data: cands } = await supabase
            .from("candidates")
            .select("id")
            .in("company_id", scopedCompanyIds);
          if (cands) {
            scopedCandidateIds = cands.map((c: any) => c.id);
          }
        } catch (e) {}
      }

      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (companyUserIds.length > 0 || scopedCandidateIds.length > 0) {
        return (data || []).filter((o: any) =>
          (companyUserIds.length > 0 && companyUserIds.includes(o.user_id)) ||
          (scopedCandidateIds.length > 0 && scopedCandidateIds.includes(o.candidate_id))
        ) as JobOffer[];
      }

      return (data || []).filter((o: any) => o.user_id === user?.id) as JobOffer[];
    },
    enabled: !!user,
  });
}


export function useOffer(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["offer", id],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as JobOffer;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (offer: {
      candidate_id?: string;
      job_id?: string;
      position: string;
      department?: string;
      salary: number;
      currency?: string;
      start_date?: string;
      offer_type?: string;
      benefits?: string[];
      additional_terms?: string;
      expires_at?: string;
    }) => {
      // Resolve company_id for the current recruiter
      const { data: memberData } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      const companyId = memberData?.company_id || null;

      const { data, error } = await supabase
        .from("job_offers")
        .insert({
          user_id: user!.id,
          company_id: companyId,
          candidate_id: offer.candidate_id || null,
          job_id: offer.job_id || null,
          position: offer.position,
          department: offer.department || null,
          salary: offer.salary,
          currency: offer.currency || "SAR",
          start_date: offer.start_date || null,
          offer_type: offer.offer_type || "full-time",
          benefits: offer.benefits || null,
          additional_terms: offer.additional_terms || null,
          expires_at: offer.expires_at || null,
        })
        .select()
        .single();
      if (error) throw error;

      await triggerOfferAutomationEvent({
        eventType: "offer.email_requested",
        userId: user!.id,
        offerId: data.id,
        position: data.position,
        candidateId: data.candidate_id,
        status: data.status,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "تم إنشاء العرض بنجاح ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useSendOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("job_offers")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Send email to candidate
      if (data.candidate_id) {
        const { data: candidate } = await supabase
          .from("candidates")
          .select("name, email")
          .eq("id", data.candidate_id)
          .single();

        if (candidate?.email) {
          const baseUrl = getPublicBaseUrl();
          const offerLink = `${baseUrl}/offer/${data.token}`;
          const sarImgUrl = `${baseUrl}/sar-symbol.png`;
          const salaryFormatted = new Intl.NumberFormat("ar-SA").format(data.salary);
          const html = `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 عرض وظيفي جديد</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151;">مرحباً <strong>${candidate.name}</strong>،</p>
              <p style="font-size: 16px; color: #374151;">يسعدنا إبلاغك بأنه تم إرسال عرض وظيفي لك للمنصب:</p>
              <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 20px; font-weight: bold; color: #4f46e5; margin: 0;">${data.position}</p>
                ${data.department ? `<p style="font-size: 14px; color: #6b7280; margin: 8px 0 0;">القسم: ${data.department}</p>` : ''}
                <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 12px 0 0;">${salaryFormatted} <img src="${sarImgUrl}" alt="SAR" width="18" height="18" style="vertical-align: middle;" /></p>
              </div>
              <p style="font-size: 16px; color: #374151;">يرجى مراجعة تفاصيل العرض والرد عبر الرابط التالي:</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${offerLink}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">عرض تفاصيل العرض الوظيفي</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
            </div>
          </div>`;

          await supabase.functions.invoke("send-email", {
            body: {
              to: candidate.email,
              subject: `عرض وظيفي - ${data.position}`,
              html,
              user_id: data.user_id,
            },
          });
        }
      }

      // Update candidate status to مكتمل when offer is sent
      if (data.candidate_id) {
        await supabase
          .from("candidates")
          .update({ status: "مكتمل", updated_at: new Date().toISOString() })
          .eq("id", data.candidate_id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      logAuditEvent({ eventType: "offer.sent", userId: data.user_id, details: { offerId: data.id, position: data.position } });
      toast({ title: "تم إرسال العرض بنجاح ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, response_notes }: { id: string; status: string; response_notes?: string }) => {
      const update: Record<string, unknown> = { status };
      if (status === "accepted" || status === "rejected") {
        update.response_date = new Date().toISOString();
      }
      if (response_notes) update.response_notes = response_notes;
      
      const { data, error } = await supabase
        .from("job_offers")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useWithdrawOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("job_offers")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, candidates(name, email)")
        .single();
      if (error) throw error;

      // Notify candidate via email
      const candidate = (data as unknown as JobOfferWithCandidate).candidates;
      if (candidate?.email) {
        const html = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: #6b7280; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ تم سحب العرض الوظيفي</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151;">مرحباً <strong>${candidate.name}</strong>،</p>
            <p style="font-size: 16px; color: #374151;">نود إبلاغك بأنه تم سحب العرض الوظيفي للمنصب:</p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 20px; font-weight: bold; color: #374151; margin: 0;">${data.position}</p>
            </div>
            <p style="font-size: 16px; color: #374151;">نعتذر عن أي إزعاج ونتمنى لك التوفيق.</p>
            <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
          </div>
        </div>`;

        await supabase.functions.invoke("send-email", {
          body: {
            to: candidate.email,
            subject: `⚠️ تم سحب العرض الوظيفي - ${data.position}`,
            html,
            user_id: data.user_id,
          },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      logAuditEvent({ eventType: "offer.withdrawn", userId: data.user_id, details: { offerId: data.id, position: data.position } });
      toast({ title: "تم سحب العرض بنجاح ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      position?: string;
      department?: string | null;
      salary?: number;
      currency?: string;
      start_date?: string | null;
      offer_type?: string;
      benefits?: string[] | null;
      additional_terms?: string | null;
      expires_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("job_offers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "تم تعديل العرض بنجاح ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "تم حذف العرض ✅" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
