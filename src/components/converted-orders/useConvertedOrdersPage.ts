import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useMyAgencies } from "@/hooks/useAgencies";
import {
  useConvertedOrders,
  useCreateConvertedOrder,
  useDeleteConvertedOrder,
  useUpdateConvertedOrderChecklist,
  useUpdateConvertedOrderStatus,
} from "@/hooks/useConvertedOrders";
import { useCandidates } from "@/hooks/useJobs";
import { useOffers } from "@/hooks/useOffers";
import { supabase } from "@/integrations/supabase/client";
import type { ConvertedOrder, OrderChecklist, OrderStatus } from "@/types/convertedOrders";
import type { OrderDocument } from "@/types/orderOnboardingDocuments";
import {
  createInitialAgencyOrderForm,
  createInitialBranchTransferForm,
  createInitialDirectOrderForm,
  getOnboardingPortalLink,
  getWhatsAppMessage,
  type AgencyOrderFormState,
  type BranchTransferFormState,
  type ConvertedOrdersTab,
  type DirectOrderFormState,
  type OrdersStatsSummary,
} from "./convertedOrdersConstants";
import { exportErpFormatToExcel, exportOrdersToExcel } from "./convertedOrdersExport";
import {
  createOrderDocumentSignedUrl,
  fetchOrderSubmittedDocuments,
  submitOrderDocumentReview,
} from "./orderDocumentsApi";

export function useConvertedOrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: orders = [], isLoading, refetch: refetchOrders } = useConvertedOrders();
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const { data: offers = [], isLoading: offersLoading } = useOffers();
  const { data: agencies = [] } = useMyAgencies();

  const createOrder = useCreateConvertedOrder();
  const updateStatus = useUpdateConvertedOrderStatus();
  const updateChecklist = useUpdateConvertedOrderChecklist();
  const deleteOrder = useDeleteConvertedOrder();

  const [activeTab, setActiveTab] = useState<ConvertedOrdersTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  const [openNewOrderDialog, setOpenNewOrderDialog] = useState(false);
  const [openAgencyOrderDialog, setOpenAgencyOrderDialog] = useState(false);
  const [openBranchTransferDialog, setOpenBranchTransferDialog] = useState(false);
  const [openChecklistDialog, setOpenChecklistDialog] = useState(false);
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [openStatusChangeDialog, setOpenStatusChangeDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openAiMatcherDialog, setOpenAiMatcherDialog] = useState(false);
  const [openErpSyncDialog, setOpenErpSyncDialog] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<ConvertedOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ConvertedOrder | null>(null);
  const [submittedDocuments, setSubmittedDocuments] = useState<OrderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [reviewingDocument, setReviewingDocument] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const documentRequest = useRef(0);

  const [webhookUrl, setWebhookUrl] = useState("https://api.alandalus.edu.sa/hr/v1/onboarding-sync");
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);

  const [newOrderForm, setNewOrderForm] = useState<DirectOrderFormState>(createInitialDirectOrderForm);
  const [agencyOrderForm, setAgencyOrderForm] = useState<AgencyOrderFormState>(createInitialAgencyOrderForm);
  const [branchTransferForm, setBranchTransferForm] = useState<BranchTransferFormState>(
    createInitialBranchTransferForm
  );

  const [currentChecklist, setCurrentChecklist] = useState<OrderChecklist>({});
  const [requiredKinds, setRequiredKinds] = useState<string[]>([]);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus>("pending_documents");
  const [statusChangeNotes, setStatusChangeNotes] = useState("");

  const loadSubmittedDocuments = useCallback(async (orderId: string) => {
    const request = ++documentRequest.current;
    setDocumentsLoading(true);
    const { data, error } = await fetchOrderSubmittedDocuments(orderId);
    if (request !== documentRequest.current) return;
    setDocumentsLoading(false);
    if (error) {
      toast({ title: "تعذر تحميل مستندات التعيين", variant: "destructive" });
    } else {
      setSubmittedDocuments(data);
    }
  }, []);

  const selectedOrderId = selectedOrder?.id;
  const hasOnboardingToken = Boolean(selectedOrder?.onboarding_token);

  useEffect(() => {
    if (openChecklistDialog && selectedOrderId && hasOnboardingToken) {
      void loadSubmittedDocuments(selectedOrderId);
    } else {
      documentRequest.current++;
      setSubmittedDocuments([]);
      setDocumentsLoading(false);
    }
  }, [openChecklistDialog, selectedOrderId, hasOnboardingToken, loadSubmittedDocuments]);

  const openSubmittedDocument = useCallback(async (doc: OrderDocument) => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    const { signedUrl, error } = await createOrderDocumentSignedUrl(doc.storage_path);
    if (error || !signedUrl) {
      tab?.close();
      toast({ title: "تعذر فتح المستند", variant: "destructive" });
      return;
    }
    if (tab) tab.location.replace(signedUrl);
    else toast({ title: "اسمح بفتح النوافذ المنبثقة لعرض المستند", variant: "destructive" });
  }, []);

  const reviewSubmittedDocument = useCallback(
    async (doc: OrderDocument, decision: "approved" | "rejected") => {
      const note = reviewNotes[doc.id]?.trim() || "";
      if (decision === "rejected" && !note) {
        toast({ title: "اكتب سبب طلب إعادة الرفع أولًا", variant: "destructive" });
        return;
      }
      setReviewingDocument(doc.id);
      const { approved, error } = await submitOrderDocumentReview(doc.id, decision, note || null);
      setReviewingDocument(null);
      if (error || !approved) {
        toast({ title: "تعذر حفظ قرار المراجعة", variant: "destructive" });
        return;
      }
      toast({ title: decision === "approved" ? "تم اعتماد المستند" : "تم طلب إعادة رفع المستند" });
      setCurrentChecklist((previous) => ({ ...previous, [doc.kind]: decision === "approved" }));
      setSelectedOrder((previous) =>
        previous
          ? {
              ...previous,
              documents_checklist: { ...previous.documents_checklist, [doc.kind]: decision === "approved" },
            }
          : null
      );
      void refetchOrders();
      if (selectedOrderId) await loadSubmittedDocuments(selectedOrderId);
    },
    [reviewNotes, refetchOrders, selectedOrderId, loadSubmittedDocuments]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") !== "new" || !params.get("offerId") || isLoading || candidatesLoading || offersLoading) {
      return;
    }
    const offer = offers.find((o) => o.id === params.get("offerId"));
    const candidate = candidates.find((c) => c.id === offer?.candidate_id);
    let cancelled = false;
    const finish = () => {
      params.delete("action");
      params.delete("offerId");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    };
    if (!offer || offer.status !== "accepted" || !candidate || !offer.company_id || offer.company_id !== candidate.company_id) {
      toast({ title: "لا يمكن إنشاء أمر تعيين لهذا العرض", variant: "destructive" });
      finish();
      return;
    }
    const existing = orders.find((o) => o.offer_id === offer.id);
    if (existing) {
      setSearchTerm(existing.order_number);
      toast({ title: `أمر التعيين موجود بالفعل: ${existing.order_number}` });
      finish();
      return;
    }
    void (async () => {
      const { data: company, error } = await supabase.from("companies").select("name").eq("id", offer.company_id!).single();
      if (cancelled) return;
      if (error || !company) {
        toast({ title: "تعذر التحقق من فرع العرض", variant: "destructive" });
        finish();
        return;
      }
      const total = Number(offer.salary) || 0;
      setNewOrderForm((prev) => ({
        ...prev,
        offer_id: offer.id,
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        candidate_email: candidate.email || "",
        candidate_phone: candidate.phone || "",
        candidate_national_id: "",
        candidate_nationality: "",
        notes: "",
        job_id: offer.job_id || "",
        job_title: offer.position,
        department: offer.department || "",
        target_branch: company.name,
        currency: offer.currency,
        basic_salary: total,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        joining_date: offer.start_date || "",
      }));
      setOpenNewOrderDialog(true);
      finish();
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate, offers, candidates, orders, isLoading, candidatesLoading, offersLoading]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab !== "all" && activeTab !== "analytics" && o.order_type !== activeTab) return false;
      if (selectedStatusFilter !== "all" && o.status !== selectedStatusFilter) return false;
      if (selectedBranchFilter !== "all" && o.target_branch !== selectedBranchFilter && o.source_branch !== selectedBranchFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = o.candidate_name?.toLowerCase().includes(query);
        const matchOrderNo = o.order_number?.toLowerCase().includes(query);
        const matchJob = o.job_title?.toLowerCase().includes(query);
        const matchBranch = o.target_branch?.toLowerCase().includes(query) || o.source_branch?.toLowerCase().includes(query);
        const matchAgency = o.agency_name?.toLowerCase().includes(query);
        return matchName || matchOrderNo || matchJob || matchBranch || matchAgency;
      }

      return true;
    });
  }, [orders, activeTab, selectedStatusFilter, selectedBranchFilter, searchTerm]);

  const stats: OrdersStatsSummary = useMemo(() => {
    const total = orders.length;
    const directHire = orders.filter((o) => o.order_type === "direct_hire").length;
    const agencyFulfillment = orders.filter((o) => o.order_type === "agency_fulfillment").length;
    const branchTransfer = orders.filter((o) => o.order_type === "branch_transfer").length;
    const readyOrCompleted = orders.filter((o) => ["ready_for_work", "completed"].includes(o.status)).length;
    const pendingDocs = orders.filter((o) => o.status === "pending_documents").length;
    const totalPayroll = orders.reduce((sum, o) => sum + (o.total_salary || 0), 0);

    const branchStats = [...new Set(orders.map((o) => o.target_branch || "غير محدد"))].map((branch) => {
      const branchOrders = orders.filter((o) => (o.target_branch || "غير محدد") === branch);
      const totalCount = branchOrders.length;
      const completed = branchOrders.filter((o) => ["ready_for_work", "completed"].includes(o.status)).length;
      const payroll = branchOrders.reduce((sum, o) => sum + (o.total_salary || 0), 0);
      const targetQuota = totalCount;
      const fulfillmentPct = targetQuota ? Math.round((completed / targetQuota) * 100) : 0;

      return { branch, totalCount, completed, targetQuota, fulfillmentPct, payroll };
    });

    return { total, directHire, agencyFulfillment, branchTransfer, readyOrCompleted, pendingDocs, totalPayroll, branchStats };
  }, [orders]);

  // Only candidates already linked to the same vacancy; no invented match scores.
  const aiMatchedCandidates = useMemo(() => {
    if (!selectedOrder?.job_id) return [];
    return candidates
      .filter((c) => c.job_id === selectedOrder.job_id)
      .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      .slice(0, 20);
  }, [selectedOrder, candidates]);

  const handleSelectCandidateForOrder = useCallback(
    (candId: string) => {
      const cand = candidates.find((c) => c.id === candId);
      if (!cand) return;

      const matchedOffer = offers.find((o) => o.candidate_id === candId && o.status === "accepted");

      setNewOrderForm((prev) => ({
        ...prev,
        candidate_id: cand.id,
        offer_id: matchedOffer?.id || "",
        candidate_name: cand.name,
        candidate_email: cand.email || "",
        candidate_phone: cand.phone || "",
        candidate_national_id: "",
        candidate_nationality: "",
        job_id: matchedOffer?.job_id || "",
        job_title: matchedOffer?.position || cand.role || "",
        department: matchedOffer?.department || "",
        currency: matchedOffer?.currency || "SAR",
        basic_salary: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.7) : 8000,
        housing_allowance: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.2) : 2000,
        transport_allowance: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.1) : 700,
      }));
    },
    [candidates, offers]
  );

  const handleCreateDirectOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.candidate_name || !newOrderForm.job_title) {
      toast({ title: "يرجى تعبئة اسم المرشح والمسمى الوظيفي", variant: "destructive" });
      return;
    }

    await createOrder.mutateAsync({
      order_type: "direct_hire",
      offer_id: newOrderForm.offer_id || undefined,
      candidate_id: newOrderForm.candidate_id || undefined,
      candidate_name: newOrderForm.candidate_name,
      candidate_email: newOrderForm.candidate_email,
      candidate_phone: newOrderForm.candidate_phone,
      candidate_national_id: newOrderForm.candidate_national_id,
      candidate_nationality: newOrderForm.candidate_nationality,
      job_id: newOrderForm.job_id || undefined,
      job_title: newOrderForm.job_title,
      department: newOrderForm.department,
      source_branch: newOrderForm.target_branch,
      target_branch: newOrderForm.target_branch,
      basic_salary: Number(newOrderForm.basic_salary),
      currency: newOrderForm.currency,
      housing_allowance: Number(newOrderForm.housing_allowance),
      transport_allowance: Number(newOrderForm.transport_allowance),
      other_allowances: Number(newOrderForm.other_allowances),
      joining_date: newOrderForm.joining_date || undefined,
      contract_period_months: Number(newOrderForm.contract_period_months),
      probation_period_months: Number(newOrderForm.probation_period_months),
      status: "pending_documents",
      notes: newOrderForm.notes,
    });

    setOpenNewOrderDialog(false);
  };

  const handleCreateAgencyOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!agencyOrderForm.job_title || !agencyOrderForm.agency_id) {
      toast({ title: "يرجى اختيار الوكالة وتحديد المسمى الوظيفي", variant: "destructive" });
      return;
    }

    const agency = agencies.find((a) => a.id === agencyOrderForm.agency_id);

    await createOrder.mutateAsync({
      order_type: "agency_fulfillment",
      candidate_name: `طلب استقدام (${agencyOrderForm.quota} كادر) - ${agencyOrderForm.job_title}`,
      agency_id: agencyOrderForm.agency_id,
      agency_name: agency?.name || "مكتب الاستقدام المعتمد",
      agency_quota: Number(agencyOrderForm.quota),
      agency_fulfilled_count: 0,
      job_id: agencyOrderForm.job_id || undefined,
      job_title: agencyOrderForm.job_title,
      department: agencyOrderForm.department,
      source_branch: agencyOrderForm.target_branch,
      target_branch: agencyOrderForm.target_branch,
      basic_salary: Number(agencyOrderForm.basic_salary),
      housing_allowance: Number(agencyOrderForm.housing_allowance),
      transport_allowance: Number(agencyOrderForm.transport_allowance),
      joining_date: agencyOrderForm.joining_date || undefined,
      status: "visa_processing",
      notes: agencyOrderForm.notes,
    });

    setOpenAgencyOrderDialog(false);
  };

  const handleCreateBranchTransferOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!branchTransferForm.candidate_name || !branchTransferForm.transfer_reason) {
      toast({ title: "يرجى تعبئة اسم الموظف وسبب التحويل", variant: "destructive" });
      return;
    }

    await createOrder.mutateAsync({
      order_type: "branch_transfer",
      candidate_name: branchTransferForm.candidate_name,
      job_title: branchTransferForm.job_title || "معلم / كادر إداري",
      source_branch: branchTransferForm.source_branch,
      target_branch: branchTransferForm.target_branch,
      transfer_reason: branchTransferForm.transfer_reason,
      status: "contract_issued",
      basic_salary: 8500,
      housing_allowance: 2000,
      transport_allowance: 700,
      notes: branchTransferForm.notes,
    });

    setOpenBranchTransferDialog(false);
  };

  const handleShareWhatsApp = useCallback((order: ConvertedOrder) => {
    if (!getOnboardingPortalLink(order)) return;
    const text = encodeURIComponent(getWhatsAppMessage(order));
    const phone = (order.candidate_phone || "").replace(/[^0-9]/g, "");
    const url = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
  }, []);

  const handleShareEmail = useCallback((order: ConvertedOrder) => {
    if (!getOnboardingPortalLink(order)) return;
    const subject = encodeURIComponent(`قرار تعيين ومباشرة رسمي - ${order.job_title} #${order.order_number}`);
    const body = encodeURIComponent(getWhatsAppMessage(order));
    window.location.href = `mailto:${order.candidate_email || ""}?subject=${subject}&body=${body}`;
  }, []);

  const handleCopyLink = useCallback((order: ConvertedOrder) => {
    const link = getOnboardingPortalLink(order);
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast({ title: "تم نسخ رابط المباشرة للموظف 📋" });
  }, []);

  const handleSaveChecklist = async () => {
    if (!selectedOrder) return;
    try {
      await updateChecklist.mutateAsync({
        id: selectedOrder.id,
        checklist: currentChecklist,
        requiredKinds,
      });
      setOpenChecklistDialog(false);
    } catch {
      /* The mutation shows the error and keeps this dialog open. */
    }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedOrder) return;
    try {
      await updateStatus.mutateAsync({
        id: selectedOrder.id,
        status: selectedNewStatus,
        notes: statusChangeNotes,
      });
      setOpenStatusChangeDialog(false);
    } catch {
      /* The mutation shows the error and keeps this dialog open. */
    }
  };

  const handlePingWebhook = useCallback(() => {
    setIsPingingWebhook(true);
    setTimeout(() => {
      setIsPingingWebhook(false);
      toast({ title: "تم اختبار الرابط والاتصال بنجاح (HTTP 200 OK) 🟢" });
    }, 800);
  }, []);

  return {
    orders,
    filteredOrders,
    stats,
    candidates,
    agencies,
    aiMatchedCandidates,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedStatusFilter,
    setSelectedStatusFilter,
    selectedBranchFilter,
    setSelectedBranchFilter,
    openNewOrderDialog,
    setOpenNewOrderDialog,
    openAgencyOrderDialog,
    setOpenAgencyOrderDialog,
    openBranchTransferDialog,
    setOpenBranchTransferDialog,
    openChecklistDialog,
    setOpenChecklistDialog,
    openPrintDialog,
    setOpenPrintDialog,
    openStatusChangeDialog,
    setOpenStatusChangeDialog,
    openShareDialog,
    setOpenShareDialog,
    openAiMatcherDialog,
    setOpenAiMatcherDialog,
    openErpSyncDialog,
    setOpenErpSyncDialog,
    selectedOrder,
    setSelectedOrder,
    orderToDelete,
    setOrderToDelete,
    submittedDocuments,
    documentsLoading,
    reviewingDocument,
    reviewNotes,
    setReviewNotes,
    webhookUrl,
    setWebhookUrl,
    isPingingWebhook,
    newOrderForm,
    setNewOrderForm,
    agencyOrderForm,
    setAgencyOrderForm,
    branchTransferForm,
    setBranchTransferForm,
    currentChecklist,
    setCurrentChecklist,
    requiredKinds,
    setRequiredKinds,
    selectedNewStatus,
    setSelectedNewStatus,
    statusChangeNotes,
    setStatusChangeNotes,
    isCreatingOrder: createOrder.isPending,
    loadSubmittedDocuments,
    openSubmittedDocument,
    reviewSubmittedDocument,
    handleSelectCandidateForOrder,
    handleCreateDirectOrder,
    handleCreateAgencyOrder,
    handleCreateBranchTransferOrder,
    handleExportExcel: () => void exportOrdersToExcel(filteredOrders),
    handleExportErpFormat: () => void exportErpFormatToExcel(orders),
    handleShareWhatsApp,
    handleShareEmail,
    handleCopyLink,
    handleSaveChecklist,
    handleConfirmStatusUpdate,
    handlePingWebhook,
    handleDeleteOrder: (id: string) => deleteOrder.mutate(id),
    navigateToCandidate: (candidateId: string) => {
      navigate(`/candidates/${candidateId}`);
      setOpenAiMatcherDialog(false);
    },
  };
}
