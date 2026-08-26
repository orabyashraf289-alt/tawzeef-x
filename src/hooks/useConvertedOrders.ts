import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import type { ConvertedOrder, OrderStatus, OrderChecklist, OrderType } from "@/types/convertedOrders";

const STORAGE_KEY_PREFIX = "tawzeef_converted_orders_";

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
  const companyId = activeCompanyId || "default";

  return useQuery({
    queryKey: ["converted-orders", companyId],
    queryFn: async () => {
      // 1. First fetch local cached/stored orders
      const localOrders = getStoredOrders(companyId);

      // 2. Try syncing with Supabase if table exists
      try {
        const { data: dbOrders, error } = await supabase
          .from("converted_orders" as any)
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (!error && dbOrders && dbOrders.length > 0) {
          return dbOrders as ConvertedOrder[];
        }
      } catch (dbErr) {
        // Fallback to local storage gracefully
      }

      return localOrders;
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateConvertedOrder() {
  const qc = useQueryClient();
  const { activeCompanyId, activeCompany } = useCompany();
  const { user } = useAuth();
  const companyId = activeCompanyId || "default";

  return useMutation({
    mutationFn: async (payload: Partial<ConvertedOrder>) => {
      const existing = getStoredOrders(companyId);
      const nextSeq = existing.length + 1;
      const orderNumber = `ORD-2026-${String(nextSeq).padStart(3, "0")}`;

      const basic = Number(payload.basic_salary) || 0;
      const housing = Number(payload.housing_allowance) || 0;
      const transport = Number(payload.transport_allowance) || 0;
      const other = Number(payload.other_allowances) || 0;
      const total = basic + housing + transport + other;

      const newOrder: ConvertedOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order_number: payload.order_number || orderNumber,
        candidate_id: payload.candidate_id,
        candidate_name: payload.candidate_name || "مرشح جديد",
        candidate_email: payload.candidate_email,
        candidate_phone: payload.candidate_phone,
        candidate_national_id: payload.candidate_national_id,
        candidate_nationality: payload.candidate_nationality || "سعودي",
        job_id: payload.job_id,
        job_title: payload.job_title || "وظيفة عامة",
        department: payload.department || "عام",
        company_id: companyId,
        company_name: activeCompany?.name || payload.company_name || "الشركة",
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
        total_salary: total,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [newOrder, ...existing];
      saveStoredOrders(companyId, updated);

      // Attempt Supabase insert in background
      try {
        await supabase.from("converted_orders" as any).insert(newOrder);
      } catch {}

      return newOrder;
    },
    onSuccess: (newOrder) => {
      qc.invalidateQueries({ queryKey: ["converted-orders", companyId] });
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

      try {
        await supabase
          .from("converted_orders" as any)
          .update({ status, ...(notes ? { notes } : {}), updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch {}

      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders", companyId] });
      toast({ title: "تم تحديث حالة الأمر بنجاح ✅" });
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
    }: {
      id: string;
      checklist: OrderChecklist;
    }) => {
      const existing = getStoredOrders(companyId);
      const updated = existing.map((o) =>
        o.id === id
          ? {
              ...o,
              documents_checklist: checklist,
              updated_at: new Date().toISOString(),
            }
          : o
      );
      saveStoredOrders(companyId, updated);

      try {
        await supabase
          .from("converted_orders" as any)
          .update({ documents_checklist: checklist, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch {}

      return { id, checklist };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders", companyId] });
      toast({ title: "تم تحديث قائمة مسوغات التعيين ✅" });
    },
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

      try {
        await supabase
          .from("converted_orders" as any)
          .update({
            order_type: "branch_transfer",
            target_branch: targetBranch,
            transfer_reason: transferReason,
            status: "contract_issued",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch {}

      return { id, targetBranch };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders", companyId] });
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
      const existing = getStoredOrders(companyId);
      const updated = existing.filter((o) => o.id !== id);
      saveStoredOrders(companyId, updated);

      try {
        await supabase.from("converted_orders" as any).delete().eq("id", id);
      } catch {}

      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["converted-orders", companyId] });
      toast({ title: "تم حذف أمر التحويل بنجاح" });
    },
  });
}
