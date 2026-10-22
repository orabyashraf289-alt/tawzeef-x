import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { isConvertedOrder } from "@/types/convertedOrders";
import type { ConvertedOrder, OrderStatus, OrderChecklist, OrderType } from "@/types/convertedOrders";
import { resolveTenantCompanyScope } from "@/hooks/useJobs";

const STORAGE_KEY_PREFIX = "tawzeef_converted_orders_";
const isDatabaseOrder = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function getLocalStorageKey(companyId: string) {
  return `${STORAGE_KEY_PREFIX}${companyId || "default"}`;
}

const DEFAULT_SEEDED_ORDERS: ConvertedOrder[] = [
  {
    id: "ord-seed-001",
    order_number: "ORD-2026-001",
    candidate_id: "cand-1",
    candidate_name: "أحمد بن محمد القحطاني",
    candidate_email: "ahmed.qahtani@example.com",
    candidate_phone: "0501234567",
    candidate_national_id: "1089345210",
    candidate_nationality: "سعودي",
    job_id: "job-1",
    job_title: "معلم لغة عربية (ثانوي)",
    department: "المرحلة الثانوية",
    company_id: "",
    company_name: "مدارس الأندلس الأهلية",
    source_branch: "مجمع بنين - الرياض",
    target_branch: "مجمع بنين - الرياض",
    order_type: "direct_hire",
    status: "ready_for_work",
    basic_salary: 8500,
    housing_allowance: 2000,
    transport_allowance: 700,
    other_allowances: 300,
    total_salary: 11500,
    currency: "SAR",
    joining_date: "2026-09-01",
    contract_period_months: 12,
    probation_period_months: 3,
    documents_checklist: {
      id_copy: true,
      educational_cert: true,
      medical_report: true,
      criminal_record: true,
      signed_contract: true,
      bank_iban: true,
      experience_certs: true,
    },
    notes: "تم استكمال كافة المسوغات وتوقيع العقد الرسمي وجاهز للمباشرة مع بداية العام الدراسي.",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "ord-seed-002",
    order_number: "ORD-2026-002",
    candidate_id: "cand-2",
    candidate_name: "سارة بنت عبدالله المنصور",
    candidate_email: "sara.almansoor@example.com",
    candidate_phone: "0559876543",
    candidate_national_id: "1098765432",
    candidate_nationality: "سعودية",
    job_id: "job-2",
    job_title: "مشرفة لغة إنجليزية وأكاديمية",
    department: "الإشراف الأكاديمي",
    company_id: "",
    company_name: "مدارس الأندلس الأهلية",
    source_branch: "مجمع بنات - جدة",
    target_branch: "مجمع بنات - الرياض",
    order_type: "branch_transfer",
    status: "contract_issued",
    basic_salary: 9500,
    housing_allowance: 2500,
    transport_allowance: 800,
    other_allowances: 500,
    total_salary: 13300,
    currency: "SAR",
    joining_date: "2026-09-05",
    contract_period_months: 24,
    probation_period_months: 3,
    transfer_reason: "نقل بناءً على طلب الموظفة نظراً لظروف الانتقال العائلي لمدينة الرياض",
    documents_checklist: {
      id_copy: true,
      educational_cert: true,
      medical_report: true,
      criminal_record: true,
      signed_contract: true,
      bank_iban: true,
      experience_certs: true,
    },
    notes: "تمت الموافقة على التحويل من إدارة الفرعين.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "ord-seed-003",
    order_number: "ORD-2026-003",
    candidate_name: "طلب استقدام: 4 معلمات علوم ورياضيات (STEM)",
    job_title: "معلمات STEM وعلوم باللغة الإنجليزية",
    department: "القسم الدولي",
    company_id: "",
    company_name: "مدارس الأندلس الأهلية",
    source_branch: "القسم الدولي - الرياض",
    target_branch: "القسم الدولي - الرياض",
    agency_id: "agency-1",
    agency_name: "مكتب الإنجاز للتوظيف والاستقدام الدولي",
    agency_quota: 4,
    agency_fulfilled_count: 2,
    order_type: "agency_fulfillment",
    status: "visa_processing",
    basic_salary: 7500,
    housing_allowance: 1800,
    transport_allowance: 600,
    other_allowances: 0,
    total_salary: 9900,
    currency: "SAR",
    joining_date: "2026-08-28",
    contract_period_months: 12,
    probation_period_months: 3,
    documents_checklist: {
      id_copy: true,
      educational_cert: true,
      medical_report: true,
      criminal_record: false,
      signed_contract: false,
      bank_iban: false,
    },
    notes: "تم اعتماد مرشحتين وجاري استخراج التأشيرات، والمكتب بصدد ترشيح السير الذاتية المتبقية.",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "ord-seed-004",
    order_number: "ORD-2026-004",
    candidate_id: "cand-4",
    candidate_name: "م. خالد بن سامي العمري",
    candidate_email: "khaled.omari@example.com",
    candidate_phone: "0543210987",
    candidate_national_id: "1076543219",
    candidate_nationality: "سعودي",
    job_id: "job-4",
    job_title: "مسؤول أنظمة وتطوير البرمجيات",
    department: "تقنية المعلومات",
    company_id: "",
    company_name: "مدارس الأندلس الأهلية",
    source_branch: "الإدارة العامة",
    target_branch: "الإدارة العامة",
    order_type: "direct_hire",
    status: "pending_documents",
    basic_salary: 12000,
    housing_allowance: 3000,
    transport_allowance: 1000,
    other_allowances: 1000,
    total_salary: 17000,
    currency: "SAR",
    joining_date: "2026-09-15",
    contract_period_months: 24,
    probation_period_months: 3,
    documents_checklist: {
      id_copy: true,
      educational_cert: true,
      medical_report: false,
      criminal_record: false,
      signed_contract: true,
      bank_iban: true,
    },
    notes: "بانتظار استلام التقرير الطبي وشهادة الخلو من السوابق.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getStoredOrders(companyId: string): ConvertedOrder[] {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(companyId));
    if (raw) {
      return JSON.parse(raw);
    }
    // Seed initial orders for this company
    const seeded = DEFAULT_SEEDED_ORDERS.map((o) => ({
      ...o,
      company_id: companyId,
    }));
    localStorage.setItem(getLocalStorageKey(companyId), JSON.stringify(seeded));
    return seeded;
  } catch (err) {
    console.error("Error reading converted orders from storage:", err);
    return [];
  }
}

function saveStoredOrders(companyId: string, orders: ConvertedOrder[]) {
  try {
    localStorage.setItem(getLocalStorageKey(companyId), JSON.stringify(orders));
  } catch (err) {
    console.error("Error saving converted orders to storage:", err);
  }
}

export function useConvertedOrders() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const companyId = activeCompanyId || "default";

  return useQuery({
    queryKey: ["converted-orders", user?.id, companyId],
    queryFn: async () => {
      const scope = await resolveTenantCompanyScope(user?.id, activeCompanyId);
      if (!scope.length) return [];
      const { data, error } = await supabase.from("converted_orders" as any)
        .select("*").in("company_id", scope).order("created_at", { ascending: false });
      if (error) throw error;
      const rawOrders: unknown[] = ((data || []) as unknown as Record<string, unknown>[])
        .map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null ? undefined : value])));
      const serverOrders = rawOrders.filter(isConvertedOrder);
      // Keep legacy, real browser records visible on the device where they were
      // created. The bundled sample orders are never shown as live tenant data.
      const legacyOrders = getStoredOrders(companyId).filter(o =>
        !o.id.startsWith("ord-seed-") && !!user?.email && o.created_by === user.email
        && scope.includes(o.company_id));
      return [...serverOrders, ...legacyOrders.filter(o => !serverOrders.some(db => db.id === o.id))];
    },
    staleTime: 1000 * 60,
    enabled: !!user,
  });
}

export function useCreateConvertedOrder() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async (payload: Partial<ConvertedOrder>) => {
      const basic = Number(payload.basic_salary) || 0;
      const housing = Number(payload.housing_allowance) || 0;
      const transport = Number(payload.transport_allowance) || 0;
      const other = Number(payload.other_allowances) || 0;
      let companyForOrder = activeCompanyId;
      let acceptedOffer: { id: string; company_id: string; candidate_id: string | null; job_id: string | null } | null = null;
      if (payload.offer_id) {
        const { data, error } = await supabase.from("job_offers")
          .select("id,company_id,candidate_id,job_id,status").eq("id", payload.offer_id).single();
        if (error) throw error;
        if (data.status !== "accepted" || !data.candidate_id || data.candidate_id !== payload.candidate_id)
          throw new Error("يجب اعتماد العرض وربطه بنفس المرشح قبل إصدار الأمر");
        acceptedOffer = data as typeof acceptedOffer;
        companyForOrder = data.company_id;
      } else if (payload.candidate_id) {
        const { data, error } = await supabase.from("candidates")
          .select("company_id").eq("id", payload.candidate_id).single();
        if (error) throw error;
        companyForOrder = data.company_id;
      }
      if (!companyForOrder || companyForOrder === "default")
        throw new Error("اختر شركة صالحة قبل إصدار أمر التعيين");
      const { data: company, error: companyError } = await supabase.from("companies")
        .select("name").eq("id", companyForOrder).single();
      if (companyError) throw companyError;
      const newOrder = {
        company_id: companyForOrder,
        offer_id: acceptedOffer?.id || null,
        candidate_id: payload.candidate_id,
        candidate_name: payload.candidate_name || "مرشح جديد",
        candidate_email: payload.candidate_email,
        candidate_phone: payload.candidate_phone,
        candidate_national_id: payload.candidate_national_id,
        candidate_nationality: payload.candidate_nationality || null,
        job_id: acceptedOffer ? acceptedOffer.job_id : payload.job_id || null,
        job_title: payload.job_title || "وظيفة عامة",
        department: payload.department || "عام",
        company_name: company.name,
        source_branch: payload.source_branch || "الفرع الرئيسي",
        target_branch: payload.target_branch || payload.source_branch || "الفرع الرئيسي",
        agency_id: payload.agency_id,
        agency_name: payload.agency_name,
        agency_quota: payload.agency_quota || 1,
        agency_fulfilled_count: payload.agency_fulfilled_count || 0,
        order_type: payload.order_type || "direct_hire",
        status: payload.status || "pending_documents",
        basic_salary: basic,
        housing_allowance: housing,
        transport_allowance: transport,
        other_allowances: other,
        currency: payload.currency || "SAR",
        joining_date: payload.joining_date || new Date().toISOString().split("T")[0],
        contract_period_months: payload.contract_period_months || 12,
        probation_period_months: payload.probation_period_months || 3,
        documents_checklist: payload.documents_checklist || {
          id_copy: true,
          educational_cert: true,
          medical_report: false,
          criminal_record: false,
          signed_contract: false,
          bank_iban: true,
          experience_certs: false,
        },
        transfer_reason: payload.transfer_reason,
        notes: payload.notes,
        created_by: user?.email,
      };
      const { data, error } = await supabase.from("converted_orders" as any)
        .insert(newOrder).select("*").single();
      if (error) throw error;
      return data as unknown as ConvertedOrder;
    },
    onSuccess: (newOrder) => {
      qc.invalidateQueries({ queryKey: ["converted-orders"] });
      toast({
        title: "تم إنشاء أمر التحويل بنجاح ✅",
        description: `رقم الأمر: ${newOrder.order_number} (${newOrder.candidate_name})`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "خطأ في إنشاء أمر التحويل",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateConvertedOrderStatus() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: OrderStatus;
      notes?: string;
    }) => {
      if (isDatabaseOrder(id)) {
        const { data, error } = await supabase.from("converted_orders" as any)
          .update({ status, ...(notes ? { notes } : {}) }).eq("id", id).select("id").single();
        if (error) throw error;
        return { id: (data as any).id, status };
      }
      const existing = getStoredOrders(companyId);
      const updated = existing.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              ...(notes ? { notes } : {}),
              updated_at: new Date().toISOString(),
            }
          : o
      );
      saveStoredOrders(companyId, updated);

      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders"] });
      toast({ title: "تم تحديث حالة الأمر بنجاح ✅" });
    },
    onError: (error: Error) => {
      const description = error.message.includes("Candidate onboarding acknowledgement")
        ? "يجب أن يوقع المرشح إقرار استلام أمر التعيين أولًا."
        : error.message.includes("Required onboarding documents")
          ? "ما زالت بعض المستندات المطلوبة تنتظر الاعتماد."
          : "حاول مرة أخرى أو راجع صلاحيات الشركة.";
      toast({ title: "تعذر تحديث حالة أمر التعيين", description, variant: "destructive" });
    },
  });
}

export function useUpdateConvertedOrderChecklist() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async ({
      id,
      checklist,
      requiredKinds,
    }: {
      id: string;
      checklist: OrderChecklist;
      requiredKinds?: string[];
    }) => {
      if (isDatabaseOrder(id)) {
        const { data, error } = await supabase.from("converted_orders" as any)
          .update({ documents_checklist: checklist,
            ...(requiredKinds ? { required_document_kinds: requiredKinds } : {}) })
          .eq("id", id).select("id").single();
        if (error) throw error;
        return { id: (data as any).id, checklist };
      }
      const existing = getStoredOrders(companyId);
      const updated = existing.map((o) =>
        o.id === id
          ? {
              ...o,
              documents_checklist: checklist,
              ...(requiredKinds ? { required_document_kinds: requiredKinds } : {}),
              updated_at: new Date().toISOString(),
            }
          : o
      );
      saveStoredOrders(companyId, updated);

      return { id, checklist };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders"] });
      toast({ title: "تم تحديث قائمة مسوغات التعيين ✅" });
    },
    onError: () => toast({ title: "تعذر حفظ قائمة المسوغات", variant: "destructive" }),
  });
}

export function useTransferOrderBranch() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async ({
      id,
      targetBranch,
      transferReason,
    }: {
      id: string;
      targetBranch: string;
      transferReason: string;
    }) => {
      if (isDatabaseOrder(id)) {
        const { data, error } = await supabase.from("converted_orders" as any)
          .update({ order_type: "branch_transfer", target_branch: targetBranch,
            transfer_reason: transferReason, status: "contract_issued" })
          .eq("id", id).select("id").single();
        if (error) throw error;
        return { id: (data as any).id, targetBranch };
      }
      const existing = getStoredOrders(companyId);
      const updated = existing.map((o) =>
        o.id === id
          ? {
              ...o,
              order_type: "branch_transfer" as OrderType,
              target_branch: targetBranch,
              transfer_reason: transferReason,
              status: "contract_issued" as OrderStatus,
              updated_at: new Date().toISOString(),
            }
          : o
      );
      saveStoredOrders(companyId, updated);

      return { id, targetBranch };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders"] });
      toast({ title: "تم تحويل الأمر للفرع المحدد بنجاح 🔄" });
    },
  });
}

export function useDeleteConvertedOrder() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDatabaseOrder(id)) {
        const { data, error } = await supabase.from("converted_orders" as any)
          .delete().eq("id", id).select("id").single();
        if (error) throw error;
        return (data as any).id as string;
      }
      const existing = getStoredOrders(companyId);
      const updated = existing.filter((o) => o.id !== id);
      saveStoredOrders(companyId, updated);

      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders"] });
      toast({ title: "تم حذف أمر التحويل بنجاح" });
    },
  });
}
