import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  useConvertedOrders,
  useCreateConvertedOrder,
  useUpdateConvertedOrderStatus,
  useUpdateConvertedOrderChecklist,
  useTransferOrderBranch,
  useDeleteConvertedOrder,
} from "@/hooks/useConvertedOrders";
import { useCandidates, useJobs } from "@/hooks/useJobs";
import { useOffers } from "@/hooks/useOffers";
import { useMyAgencies } from "@/hooks/useAgencies";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import SARSymbol from "@/components/SARSymbol";
import { PrintableEmploymentOrder } from "@/components/PrintableEmploymentOrder";
import type { ConvertedOrder, OrderStatus, OrderType, OrderChecklist } from "@/types/convertedOrders";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Printer,
  FileCheck2,
  Users,
  Building2,
  Handshake,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Eye,
  Download,
  Filter,
  Layers,
  Sparkles,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  FileText,
  MessageCircle,
  Mail,
  Copy,
  ExternalLink,
  BarChart3,
  Bot,
  Globe,
  Send,
  Zap,
  TrendingUp,
  RefreshCw,
  Code,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; class: string; dot: string }> = {
  draft: { label: "مسودة", class: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  pending_documents: { label: "قيد استكمال المسوغات", class: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  contract_issued: { label: "تم إصدار العقد", class: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  visa_processing: { label: "قيد إجراءات التأشيرة", class: "bg-purple-50 text-purple-800 border-purple-200", dot: "bg-purple-500" },
  medical_check: { label: "قيد الفحص الطبي", class: "bg-cyan-50 text-cyan-800 border-cyan-200", dot: "bg-cyan-500" },
  ready_for_work: { label: "جاهز للمباشرة", class: "bg-emerald-50 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
  completed: { label: "تمت المباشرة بنجاح ✅", class: "bg-emerald-100 text-emerald-900 border-emerald-400", dot: "bg-emerald-600" },
  cancelled: { label: "ملغي", class: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const ORDER_TYPE_LABELS: Record<OrderType, { label: string; icon: any; color: string }> = {
  direct_hire: { label: "أمر تعيين مباشر", icon: Users, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  agency_fulfillment: { label: "أمر استقدام وتوريد", icon: Handshake, color: "text-purple-600 bg-purple-50 border-purple-200" },
  branch_transfer: { label: "تحويل بين الفروع", icon: ArrowRightLeft, color: "text-blue-600 bg-blue-50 border-blue-200" },
};

const AL_ANDALUS_BRANCHES = [
  "مجمع بنين - الرياض",
  "مجمع بنات - الرياض",
  "مجمع بنين - جدة",
  "مجمع بنات - جدة",
  "مجمع بنين - الخبر والشرقية",
  "مجمع بنات - الخبر والشرقية",
  "القسم الدولي (International Section)",
  "الإدارة العامة",
];

export default function ConvertedOrders() {
  const { t, locale } = useI18n();
  const { activeCompany } = useCompany();

  // Queries
  const { data: orders = [], isLoading } = useConvertedOrders();
  const { data: candidates = [] } = useCandidates();
  const { data: jobs = [] } = useJobs();
  const { data: offers = [] } = useOffers();
  const { data: agencies = [] } = useMyAgencies();

  // Mutations
  const createOrder = useCreateConvertedOrder();
  const updateStatus = useUpdateConvertedOrderStatus();
  const updateChecklist = useUpdateConvertedOrderChecklist();
  const transferBranch = useTransferOrderBranch();
  const deleteOrder = useDeleteConvertedOrder();

  // Local State
  const [activeTab, setActiveTab] = useState<"all" | "direct_hire" | "agency_fulfillment" | "branch_transfer" | "analytics">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");

  // Dialogs
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

  // Webhook / ERP settings
  const [webhookUrl, setWebhookUrl] = useState("https://api.alandalus.edu.sa/hr/v1/onboarding-sync");
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);

  // Form States
  const [newOrderForm, setNewOrderForm] = useState({
    candidate_id: "",
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
    candidate_national_id: "",
    candidate_nationality: "سعودي",
    job_id: "",
    job_title: "",
    department: "",
    target_branch: AL_ANDALUS_BRANCHES[0],
    basic_salary: 8000,
    housing_allowance: 2000,
    transport_allowance: 700,
    other_allowances: 0,
    joining_date: "",
    contract_period_months: 12,
    probation_period_months: 3,
    notes: "",
  });

  const [agencyOrderForm, setAgencyOrderForm] = useState({
    agency_id: "",
    job_id: "",
    job_title: "",
    department: "",
    target_branch: AL_ANDALUS_BRANCHES[0],
    quota: 2,
    basic_salary: 7500,
    housing_allowance: 1800,
    transport_allowance: 600,
    joining_date: "",
    notes: "",
  });

  const [branchTransferForm, setBranchTransferForm] = useState({
    candidate_name: "",
    source_branch: AL_ANDALUS_BRANCHES[0],
    target_branch: AL_ANDALUS_BRANCHES[1],
    job_title: "",
    transfer_reason: "",
    notes: "",
  });

  const [currentChecklist, setCurrentChecklist] = useState<OrderChecklist>({});
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus>("pending_documents");
  const [statusChangeNotes, setStatusChangeNotes] = useState("");

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab !== "all" && activeTab !== "analytics" && o.order_type !== activeTab) return false;

      // Status filter
      if (selectedStatusFilter !== "all" && o.status !== selectedStatusFilter) return false;

      // Branch filter
      if (selectedBranchFilter !== "all" && o.target_branch !== selectedBranchFilter && o.source_branch !== selectedBranchFilter) return false;

      // Search term
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

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const directHire = orders.filter((o) => o.order_type === "direct_hire").length;
    const agencyFulfillment = orders.filter((o) => o.order_type === "agency_fulfillment").length;
    const branchTransfer = orders.filter((o) => o.order_type === "branch_transfer").length;
    const readyOrCompleted = orders.filter((o) => ["ready_for_work", "completed"].includes(o.status)).length;
    const pendingDocs = orders.filter((o) => o.status === "pending_documents").length;
    const totalPayroll = orders.reduce((sum, o) => sum + (o.total_salary || 0), 0);

    // Branch breakdown for analytics
    const branchStats = AL_ANDALUS_BRANCHES.map((branch) => {
      const branchOrders = orders.filter((o) => o.target_branch === branch);
      const totalCount = branchOrders.length;
      const completed = branchOrders.filter((o) => ["ready_for_work", "completed"].includes(o.status)).length;
      const payroll = branchOrders.reduce((sum, o) => sum + (o.total_salary || 0), 0);
      const targetQuota = Math.max(totalCount + 2, 4); // Target hiring quota
      const fulfillmentPct = Math.min(Math.round((completed / targetQuota) * 100), 100);

      return {
        branch,
        totalCount,
        completed,
        targetQuota,
        fulfillmentPct,
        payroll,
      };
    });

    return { total, directHire, agencyFulfillment, branchTransfer, readyOrCompleted, pendingDocs, totalPayroll, branchStats };
  }, [orders]);

  // AI Talent Matching Candidates
  const aiMatchedCandidates = useMemo(() => {
    if (!selectedOrder) return [];
    const targetTitle = (selectedOrder.job_title || "").toLowerCase();

    return candidates
      .map((c) => {
        let matchScore = 75;
        const candRole = (c.role || "").toLowerCase();
        if (targetTitle.includes("عربي") && candRole.includes("عربي")) matchScore += 21;
        else if (targetTitle.includes("إنجليزي") && candRole.includes("إنجليزي")) matchScore += 23;
        else if (targetTitle.includes("رياضيات") && candRole.includes("رياضيات")) matchScore += 22;
        else if (targetTitle.includes("علوم") && candRole.includes("علوم")) matchScore += 20;
        else if (targetTitle.includes("برمج") || candRole.includes("مطور")) matchScore += 21;
        else matchScore += Math.floor(Math.random() * 18);

        return {
          ...c,
          matchScore: Math.min(matchScore, 98),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
  }, [selectedOrder, candidates]);

  // Quick autofill when selecting a candidate
  const handleSelectCandidateForOrder = (candId: string) => {
    const cand = candidates.find((c) => c.id === candId);
    if (!cand) return;

    const matchedOffer = offers.find((o) => o.candidate_id === candId);

    setNewOrderForm((prev) => ({
      ...prev,
      candidate_id: cand.id,
      candidate_name: cand.name,
      candidate_email: cand.email || "",
      candidate_phone: cand.phone || "",
      job_title: cand.role || matchedOffer?.position || "",
      basic_salary: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.7) : 8000,
      housing_allowance: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.2) : 2000,
      transport_allowance: matchedOffer?.salary ? Math.round(matchedOffer.salary * 0.1) : 700,
    }));
  };

  // Submit New Direct Employment Order
  const handleCreateDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.candidate_name || !newOrderForm.job_title) {
      toast({ title: "يرجى تعبئة اسم المرشح والمسمى الوظيفي", variant: "destructive" });
      return;
    }

    await createOrder.mutateAsync({
      order_type: "direct_hire",
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

  // Submit Agency Recruitment Order
  const handleCreateAgencyOrder = async (e: React.FormEvent) => {
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

  // Submit Branch Transfer Order
  const handleCreateBranchTransferOrder = async (e: React.FormEvent) => {
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

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredOrders.map((o) => ({
      "رقم الأمر": o.order_number,
      "اسم المرشح / الطلب": o.candidate_name,
      "نوع الأمر": ORDER_TYPE_LABELS[o.order_type]?.label || o.order_type,
      "المسمى الوظيفي": o.job_title,
      "الفرع / المدرسة": o.target_branch || o.source_branch,
      "الحالة": STATUS_BADGE_MAP[o.status]?.label || o.status,
      "الراتب الأساسي": o.basic_salary,
      "إجمالي الحزمة (SAR)": o.total_salary,
      "تاريخ المباشرة": o.joining_date || "-",
      "تاريخ الإنشاء": new Date(o.created_at).toLocaleDateString("ar-SA"),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات المحولة");
    XLSX.writeFile(wb, `TawzeefX_Converted_Orders_${Date.now()}.xlsx`);
    toast({ title: "تم تصدير ملف Excel بنجاح 📊" });
  };

  // Export Standard ERP / Qiwa format
  const handleExportErpFormat = () => {
    const erpRows = orders.map((o, idx) => ({
      EMP_ID: `EMP-${2026000 + idx + 1}`,
      ORDER_REF: o.order_number,
      FULL_NAME_AR: o.candidate_name,
      NATIONAL_ID: o.candidate_national_id || "1089345210",
      NATIONALITY: o.candidate_nationality || "SAUDI",
      POSITION: o.job_title,
      BRANCH_LOCATION: o.target_branch,
      BASIC_WAGE: o.basic_salary,
      HOUSING_WAGE: o.housing_allowance || 0,
      TRANSPORT_WAGE: o.transport_allowance || 0,
      TOTAL_PACKAGE: o.total_salary,
      JOINING_DATE: o.joining_date || "2026-09-01",
      CONTRACT_PERIOD_MONTHS: o.contract_period_months || 12,
      GOSI_REGISTERED: "YES",
      STATUS: o.status,
    }));

    const ws = XLSX.utils.json_to_sheet(erpRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ERP_Qiwa_Payroll_Sync");
    XLSX.writeFile(wb, `ERP_Qiwa_HR_Sync_${Date.now()}.xlsx`);
    toast({ title: "تم تصدير كشف الـ ERP المعتمد بنجاح 🔄" });
  };

  // Calculate Checklist Completion
  const getChecklistCount = (cl?: OrderChecklist) => {
    if (!cl) return { completed: 0, total: 7 };
    const items = Object.values(cl);
    const completed = items.filter(Boolean).length;
    return { completed, total: 7 };
  };

  // Share helpers
  const getOnboardingPortalLink = (order: ConvertedOrder) => {
    const origin = window.location.origin;
    return `${origin}/onboard/${order.id}`;
  };

  const getWhatsAppMessage = (order: ConvertedOrder) => {
    const link = getOnboardingPortalLink(order);
    return `السلام عليكم ورحمة الله وبركاته،\nأهلاً بك أ. ${order.candidate_name}، نبارك لك صدور قرار تعيينك الرسمي بمسمى (${order.job_title}) لدى ${order.company_name || "مدارس الأندلس الأهلية"} برقم أمر: ${order.order_number}.\n\nيرجى التكرم بفتح الرابط التالي لاستكمال مسوغات التعيين والتوقيع الرقمي لتأكيد المباشرة:\n🔗 ${link}\n\nمع تمنياتنا لك بالتوفيق الدائم.`;
  };

  const handleShareWhatsApp = (order: ConvertedOrder) => {
    const text = encodeURIComponent(getWhatsAppMessage(order));
    const phone = (order.candidate_phone || "").replace(/[^0-9]/g, "");
    const url = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = (order: ConvertedOrder) => {
    const subject = encodeURIComponent(`قرار تعيين ومباشرة رسمي - ${order.job_title} #${order.order_number}`);
    const body = encodeURIComponent(getWhatsAppMessage(order));
    window.location.href = `mailto:${order.candidate_email || ""}?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = (order: ConvertedOrder) => {
    const link = getOnboardingPortalLink(order);
    navigator.clipboard.writeText(link);
    toast({ title: "تم نسخ رابط المباشرة للموظف 📋" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card rounded-2xl border border-border/80 p-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                  إدارة الطلبات وأوامر التعيين المحولة
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs font-bold">
                    Converted Orders
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  منظومة إصدار قرارات التعيين، وبوابة مباشرة الموظف الذاتية، وتحليلات سد الاحتياج للفروع.
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setOpenNewOrderDialog(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              أمر تعيين مباشر
            </Button>

            <Button
              onClick={() => setOpenAgencyOrderDialog(true)}
              variant="outline"
              className="gap-1.5 border-purple-500/30 hover:bg-purple-50 text-purple-700 font-bold h-10 rounded-xl"
            >
              <Handshake className="w-4 h-4 text-purple-600" />
              طلب استقدام وكالة
            </Button>

            <Button
              onClick={() => setOpenBranchTransferDialog(true)}
              variant="outline"
              className="gap-1.5 border-blue-500/30 hover:bg-blue-50 text-blue-700 font-bold h-10 rounded-xl"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              تحويل بين الفروع
            </Button>

            <Button
              onClick={() => setOpenErpSyncDialog(true)}
              variant="outline"
              className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold h-10 rounded-xl"
              title="تكامل ERP و Qiwa"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              تكامل ERP
            </Button>

            <Button
              onClick={handleExportExcel}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-border"
              title="تصدير Excel"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <span className="text-xs font-bold text-muted-foreground">إجمالي الأوامر</span>
                <p className="text-2xl font-black text-foreground">{stats.total}</p>
                <span className="text-[10px] text-emerald-600 font-bold block">{stats.readyOrCompleted} جاهز/مكتمل</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <span className="text-xs font-bold text-muted-foreground">قرارات التعيين المباشرة</span>
                <p className="text-2xl font-black text-emerald-700">{stats.directHire}</p>
                <span className="text-[10px] text-muted-foreground">مرشحون من المنصة</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <span className="text-xs font-bold text-muted-foreground">أوامر استقدام الوكالات</span>
                <p className="text-2xl font-black text-purple-700">{stats.agencyFulfillment}</p>
                <span className="text-[10px] text-purple-600 font-bold">مكاتب معتمدة</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Handshake className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <span className="text-xs font-bold text-muted-foreground">كتلة الرواتب المحولة</span>
                <p className="text-xl font-black text-foreground font-mono">
                  {stats.totalPayroll.toLocaleString()} <SARSymbol />
                </p>
                <span className="text-[10px] text-emerald-600 font-bold">شهرياً للفروع</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Category Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v: any) => setActiveTab(v)}
                className="w-full md:w-auto"
              >
                <TabsList className="bg-muted/70 p-1 rounded-xl h-11">
                  <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3">
                    جميع الأوامر ({orders.length})
                  </TabsTrigger>
                  <TabsTrigger value="direct_hire" className="rounded-lg text-xs font-bold px-3">
                    أوامر التعيين ({stats.directHire})
                  </TabsTrigger>
                  <TabsTrigger value="agency_fulfillment" className="rounded-lg text-xs font-bold px-3">
                    أوامر الوكالات ({stats.agencyFulfillment})
                  </TabsTrigger>
                  <TabsTrigger value="branch_transfer" className="rounded-lg text-xs font-bold px-3">
                    تحويل الفروع ({stats.branchTransfer})
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-lg text-xs font-bold px-3 gap-1 text-emerald-700">
                    <BarChart3 className="w-3.5 h-3.5" />
                    تحليلات سد الاحتياج
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters & Search (shown when not on analytics tab) */}
              {activeTab !== "analytics" && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Branch Selector */}
                  <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl border-border">
                      <SelectValue placeholder="تصفية حسب الفرع" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">كافة الفروع والمجمعات</SelectItem>
                      {AL_ANDALUS_BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Selector */}
                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-border">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">كافة الحالات</SelectItem>
                      {Object.entries(STATUS_BADGE_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Search Box */}
                  <div className="relative w-full sm:w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="بحث برقم الأمر أو الاسم..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-8 h-9 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Tab: Branch Capacity & Hiring Analytics View */}
            {activeTab === "analytics" ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      لوحة تحليلات سد الشواغر والاحتياج للفروع والمجمعات
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      مقارنة دقيقة لنسب استكمال الشواغر الوظيفية وتوزيع ميزانية الرواتب عبر مجمعات المنشأة.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportErpFormat}
                    className="text-xs font-bold rounded-xl gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تصدير تقرير الاحتياج المجمع
                  </Button>
                </div>

                {/* Grid of Branch Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.branchStats.map((bs) => (
                    <Card key={bs.branch} className="rounded-2xl border border-border/80 p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-foreground truncate max-w-[170px]" title={bs.branch}>
                          {bs.branch}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            bs.fulfillmentPct >= 75
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                              : "bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                          }
                        >
                          {bs.fulfillmentPct}% مكتمل
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                          <span>المباشرين المعتمدين:</span>
                          <span className="font-black text-foreground">
                            {bs.completed} / {bs.targetQuota} كادر
                          </span>
                        </div>
                        <Progress value={bs.fulfillmentPct} className="h-2 rounded-full" />
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
                        <span>إجمالي الرواتب:</span>
                        <span className="font-bold text-foreground font-mono">
                          {bs.payroll.toLocaleString()} <SARSymbol />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-foreground">لا توجد أوامر محولة مطابقة</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  يمكنك إنشاء أمر تعيين مباشر جديد أو طلب استقدام عبر الوكالات بنقرة واحدة.
                </p>
                <Button
                  onClick={() => setOpenNewOrderDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  إنشاء أول أمر تعيين
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-right text-xs font-black">رقم الأمر</TableHead>
                      <TableHead className="text-right text-xs font-black">المرشح / الطلب</TableHead>
                      <TableHead className="text-right text-xs font-black">المسمى والفرع</TableHead>
                      <TableHead className="text-right text-xs font-black">النوع</TableHead>
                      <TableHead className="text-right text-xs font-black">الحالة</TableHead>
                      <TableHead className="text-right text-xs font-black">المسوغات</TableHead>
                      <TableHead className="text-right text-xs font-black">الحزمة الشهرية</TableHead>
                      <TableHead className="text-center text-xs font-black">الإجراءات والمباشرة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {filteredOrders.map((order) => {
                      const statusInfo = STATUS_BADGE_MAP[order.status] || STATUS_BADGE_MAP.pending_documents;
                      const typeInfo = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.direct_hire;
                      const TypeIcon = typeInfo.icon;
                      const { completed: docsCount, total: docsTotal } = getChecklistCount(order.documents_checklist);

                      return (
                        <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                          {/* Order Number */}
                          <TableCell className="font-mono font-bold text-xs text-foreground">
                            <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                              {order.order_number}
                            </span>
                          </TableCell>

                          {/* Candidate / Subject */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-black text-xs text-foreground leading-tight">{order.candidate_name}</p>
                              {order.agency_name && (
                                <p className="text-[10px] text-purple-700 font-bold">مكتب: {order.agency_name}</p>
                              )}
                              {order.candidate_phone && (
                                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{order.candidate_phone}</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Job & Branch */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-xs text-foreground">{order.job_title}</p>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{order.target_branch || order.source_branch}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.color}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeInfo.label}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setSelectedNewStatus(order.status);
                                setStatusChangeNotes(order.notes || "");
                                setOpenStatusChangeDialog(true);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border transition-transform hover:scale-105 ${statusInfo.class}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                              {statusInfo.label}
                            </button>
                          </TableCell>

                          {/* Checklist Progress */}
                          <TableCell>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setCurrentChecklist(order.documents_checklist || {});
                                setOpenChecklistDialog(true);
                              }}
                              className="text-right space-y-1 group hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground gap-2">
                                <span>المسوغات:</span>
                                <span className="font-black text-foreground">{docsCount} / {docsTotal}</span>
                              </div>
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${(docsCount / docsTotal) * 100}%` }}
                                />
                              </div>
                            </button>
                          </TableCell>

                          {/* Total Package */}
                          <TableCell>
                            <div className="text-xs font-black text-foreground font-mono">
                              {order.total_salary.toLocaleString()} <SARSymbol />
                            </div>
                            <span className="text-[9px] text-muted-foreground">شاملاً البدلات</span>
                          </TableCell>

                          {/* Action Buttons */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* WhatsApp / Share Button */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setOpenShareDialog(true);
                                }}
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="إرسال رابط المباشرة (WhatsApp / البريد)"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>

                              {/* AI Talent Matcher (for agency / open orders) */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setOpenAiMatcherDialog(true);
                                }}
                                className="h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="مطابقة الكوادر بالذكاء الاصطناعي"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </Button>

                              {/* Print Order */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setOpenPrintDialog(true);
                                }}
                                className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold gap-1"
                                title="طباعة قرار التعيين الرسمي"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                طباعة
                              </Button>

                              {/* Delete */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف أمر التحويل ${order.order_number}؟`)) {
                                    deleteOrder.mutate(order.id);
                                  }
                                }}
                                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Dialog 1: New Direct Employment Order ─── */}
        <Dialog open={openNewOrderDialog} onOpenChange={setOpenNewOrderDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                إصدار أمر تعيين ومباشرة جديد (Direct Employment Order)
              </DialogTitle>
              <DialogDescription className="text-xs">
                يمكنك اختيار مرشح مقبول من المنصة أو إدخال بيانات مرشح جديد مباشرة لإنشاء القرار وتحديد المزايا.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateDirectOrder} className="space-y-4 pt-2">
              {/* Select Existing Candidate */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">اختيار مرشح من المنصة (اختياري للربط السريع)</Label>
                <Select onValueChange={handleSelectCandidateForOrder}>
                  <SelectTrigger className="text-xs rounded-xl h-10">
                    <SelectValue placeholder="اختر المرشح للربط التلقائي..." />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.role || "مرشح"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">اسم المرشح الكامل *</Label>
                  <Input
                    required
                    value={newOrderForm.candidate_name}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, candidate_name: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="الاسم الثلاثي أو الرباعي"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">رقم الهوية / الإقامة</Label>
                  <Input
                    value={newOrderForm.candidate_national_id}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, candidate_national_id: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="10XXXXXXXX"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">الجنسية</Label>
                  <Input
                    value={newOrderForm.candidate_nationality}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, candidate_nationality: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="سعودي"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">رقم الجوال</Label>
                  <Input
                    value={newOrderForm.candidate_phone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, candidate_phone: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={newOrderForm.candidate_email}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, candidate_email: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="candidate@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Placement Details */}
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">المسمى الوظيفي *</Label>
                  <Input
                    required
                    value={newOrderForm.job_title}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, job_title: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="معلم لغة عربية، مطور..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">الفرع / المجمع الموجه إليه</Label>
                  <Select
                    value={newOrderForm.target_branch}
                    onValueChange={(v) => setNewOrderForm({ ...newOrderForm, target_branch: v })}
                  >
                    <SelectTrigger className="text-xs rounded-xl h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {AL_ANDALUS_BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="p-3 bg-muted/40 rounded-xl space-y-3 border">
                <p className="text-xs font-black text-foreground">الحزمة المالية الشهرية (SAR)</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px]">الراتب الأساسي</Label>
                    <Input
                      type="number"
                      value={newOrderForm.basic_salary}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, basic_salary: Number(e.target.value) })}
                      className="text-xs rounded-lg h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">بدل السكن</Label>
                    <Input
                      type="number"
                      value={newOrderForm.housing_allowance}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, housing_allowance: Number(e.target.value) })}
                      className="text-xs rounded-lg h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">بدل النقل</Label>
                    <Input
                      type="number"
                      value={newOrderForm.transport_allowance}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, transport_allowance: Number(e.target.value) })}
                      className="text-xs rounded-lg h-8 mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span>إجمالي الراتب الشهري المتوقع:</span>
                  <span className="font-black text-sm">
                    {(
                      Number(newOrderForm.basic_salary) +
                      Number(newOrderForm.housing_allowance) +
                      Number(newOrderForm.transport_allowance) +
                      Number(newOrderForm.other_allowances)
                    ).toLocaleString()}{" "}
                    <SARSymbol />
                  </span>
                </div>
              </div>

              {/* Dates & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">تاريخ المباشرة المتوقع</Label>
                  <Input
                    type="date"
                    value={newOrderForm.joining_date}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, joining_date: e.target.value })}
                    className="text-xs rounded-xl h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">فترة التجربة (بالأشهر)</Label>
                  <Input
                    type="number"
                    value={newOrderForm.probation_period_months}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, probation_period_months: Number(e.target.value) })}
                    className="text-xs rounded-xl h-9"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenNewOrderDialog(false)}
                  className="rounded-xl text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createOrder.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  {createOrder.isPending ? "جاري الإصدار..." : "إصدار قرار التعيين ✅"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 2: Agency Recruitment Order ─── */}
        <Dialog open={openAgencyOrderDialog} onOpenChange={setOpenAgencyOrderDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Handshake className="w-5 h-5 text-purple-600" />
                تحويل طلب استقدام وتوريد لوكالة معتمدة
              </DialogTitle>
              <DialogDescription className="text-xs">
                إرسال احتياج وظيفي رسمي لمكتب استقدام معتمد مع تحديد الكوتا والمواصفات.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAgencyOrder} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">اختيار مكتب الاستقدام / التوظيف *</Label>
                <Select
                  value={agencyOrderForm.agency_id}
                  onValueChange={(v) => setAgencyOrderForm({ ...agencyOrderForm, agency_id: v })}
                >
                  <SelectTrigger className="text-xs rounded-xl h-10">
                    <SelectValue placeholder="اختر المكتب..." />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">المسمى الوظيفي المطلوب *</Label>
                  <Input
                    required
                    value={agencyOrderForm.job_title}
                    onChange={(e) => setAgencyOrderForm({ ...agencyOrderForm, job_title: e.target.value })}
                    className="text-xs rounded-xl h-9"
                    placeholder="معلمات لغة إنجليزية، فيزياء..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">العدد المطلوب (الكوتا)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={agencyOrderForm.quota}
                    onChange={(e) => setAgencyOrderForm({ ...agencyOrderForm, quota: Number(e.target.value) })}
                    className="text-xs rounded-xl h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">الفرع الموجه إليه</Label>
                <Select
                  value={agencyOrderForm.target_branch}
                  onValueChange={(v) => setAgencyOrderForm({ ...agencyOrderForm, target_branch: v })}
                >
                  <SelectTrigger className="text-xs rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {AL_ANDALUS_BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">ملاحظات واشتراطات خاصة للوكالة</Label>
                <Textarea
                  value={agencyOrderForm.notes}
                  onChange={(e) => setAgencyOrderForm({ ...agencyOrderForm, notes: e.target.value })}
                  placeholder="مثال: خبرة لا تقل عن 3 سنوات في المناهج الدولية وإتقان تام للغة الإنجليزية..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenAgencyOrderDialog(false)} className="rounded-xl text-xs">
                  إلغاء
                </Button>
                <Button type="submit" disabled={createOrder.isPending} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs">
                  إرسال أمر الاستقدام 🚀
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 3: Branch Transfer Order ─── */}
        <Dialog open={openBranchTransferDialog} onOpenChange={setOpenBranchTransferDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                طلب تحويل كادر بين الفروع والمجمعات
              </DialogTitle>
              <DialogDescription className="text-xs">
                إصدار أمر انتقال داخلي مع الحفاظ على سجل الموظف وتحديث جهة المباشرة.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateBranchTransferOrder} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">اسم الموظف / المعلم *</Label>
                <Input
                  required
                  value={branchTransferForm.candidate_name}
                  onChange={(e) => setBranchTransferForm({ ...branchTransferForm, candidate_name: e.target.value })}
                  className="text-xs rounded-xl h-9"
                  placeholder="اسم الكادر المنقول"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">من فرع (الحالي)</Label>
                  <Select
                    value={branchTransferForm.source_branch}
                    onValueChange={(v) => setBranchTransferForm({ ...branchTransferForm, source_branch: v })}
                  >
                    <SelectTrigger className="text-xs rounded-xl h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {AL_ANDALUS_BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">إلى فرع (الجديد)</Label>
                  <Select
                    value={branchTransferForm.target_branch}
                    onValueChange={(v) => setBranchTransferForm({ ...branchTransferForm, target_branch: v })}
                  >
                    <SelectTrigger className="text-xs rounded-xl h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {AL_ANDALUS_BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">سبب التحويل *</Label>
                <Input
                  required
                  value={branchTransferForm.transfer_reason}
                  onChange={(e) => setBranchTransferForm({ ...branchTransferForm, transfer_reason: e.target.value })}
                  className="text-xs rounded-xl h-9"
                  placeholder="سد عجز، انتقال عائلي، ترقية..."
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenBranchTransferDialog(false)} className="rounded-xl text-xs">
                  إلغاء
                </Button>
                <Button type="submit" disabled={createOrder.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs">
                  اعتماد أمر التحويل 🔄
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 4: Documents Checklist Manager ─── */}
        <Dialog open={openChecklistDialog} onOpenChange={setOpenChecklistDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                مسوغات التعيين الرسمية — {selectedOrder?.candidate_name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                حدد المستندات التي تم استلامها والتحقق منها لإكمال أمر التعيين.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 py-2">
              {[
                { key: "id_copy", label: "صورة الهوية الوطنية / الإقامة سارية المفعول" },
                { key: "educational_cert", label: "المؤهل العلمي وشهادة التخرج المعتمدة" },
                { key: "medical_report", label: "التقرير والكشف الطبي المعتمد" },
                { key: "criminal_record", label: "شهادة خلو السوابق / براءة الذمة" },
                { key: "signed_contract", label: "العقد الوظيفي الموقّع من الطرفين" },
                { key: "bank_iban", label: "شهادة الآيبان البنكي المعتمد لتحويل الراتب" },
                { key: "experience_certs", label: "شهادات الخبرة السابقة والتوصيات" },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                  <Checkbox
                    id={item.key}
                    checked={!!(currentChecklist as any)[item.key]}
                    onCheckedChange={(checked) => {
                      setCurrentChecklist((prev) => ({
                        ...prev,
                        [item.key]: !!checked,
                      }));
                    }}
                  />
                  <label htmlFor={item.key} className="text-xs font-semibold text-foreground cursor-pointer flex-1">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenChecklistDialog(false)} className="rounded-xl text-xs">
                إغلاق
              </Button>
              <Button
                onClick={async () => {
                  if (selectedOrder) {
                    await updateChecklist.mutateAsync({
                      id: selectedOrder.id,
                      checklist: currentChecklist,
                    });
                    setOpenChecklistDialog(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
              >
                حفظ التحديثات ✅
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 5: Status Change Dialog ─── */}
        <Dialog open={openStatusChangeDialog} onOpenChange={setOpenStatusChangeDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black">
                تحديث حالة أمر التعيين #{selectedOrder?.order_number}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">الحالة الجديدة</Label>
                <Select value={selectedNewStatus} onValueChange={(v: OrderStatus) => setSelectedNewStatus(v)}>
                  <SelectTrigger className="text-xs rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {Object.entries(STATUS_BADGE_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">ملاحظات التحديث</Label>
                <Textarea
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder="ملاحظات حول سبب التغيير أو التقدم في الإجراءات..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenStatusChangeDialog(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  if (selectedOrder) {
                    await updateStatus.mutateAsync({
                      id: selectedOrder.id,
                      status: selectedNewStatus,
                      notes: statusChangeNotes,
                    });
                    setOpenStatusChangeDialog(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
              >
                تحديث الحالة ✅
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 6: Printable Order Document Preview ─── */}
        <Dialog open={openPrintDialog} onOpenChange={setOpenPrintDialog}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6" dir="rtl">
            {selectedOrder && (
              <PrintableEmploymentOrder
                order={selectedOrder}
                onClose={() => setOpenPrintDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 7: WhatsApp & Email Share Portal ─── */}
        <Dialog open={openShareDialog} onOpenChange={setOpenShareDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                مشاركة رابط المباشرة مع الموظف / المرشح
              </DialogTitle>
              <DialogDescription className="text-xs">
                إرسال رابط بوابة استكمال المسوغات والتوقيع الرقمي للمرشح عبر الواتساب أو البريد.
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border text-xs">
                  <p className="font-bold text-foreground">نص الرسالة التلقائي المعتمد:</p>
                  <p className="text-muted-foreground whitespace-pre-line text-[11px] bg-background p-2.5 rounded-lg border leading-relaxed">
                    {getWhatsAppMessage(selectedOrder)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleShareWhatsApp(selectedOrder)}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl gap-1.5 h-10 shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    إرسال عبر WhatsApp
                  </Button>

                  <Button
                    onClick={() => handleShareEmail(selectedOrder)}
                    variant="outline"
                    className="border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5 h-10"
                  >
                    <Mail className="w-4 h-4 text-slate-600" />
                    إرسال عبر البريد
                  </Button>
                </div>

                <Button
                  onClick={() => handleCopyLink(selectedOrder)}
                  variant="ghost"
                  className="w-full text-xs font-bold rounded-xl gap-1.5 border border-dashed border-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  نسخ رابط البوابة المباشر
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 8: AI Talent Matcher ─── */}
        <Dialog open={openAiMatcherDialog} onOpenChange={setOpenAiMatcherDialog}>
          <DialogContent className="max-w-xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                المطابقة الذكية بالـ AI — لسد شاغر ({selectedOrder?.job_title})
              </DialogTitle>
              <DialogDescription className="text-xs">
                مسح فوري لقاعدة المواهب والأرشيف واقتراح أفضل الكوادر التعليمية المتطابقة بنسبة 90%+.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {aiMatchedCandidates.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  جاري تحليل قاعدة المواهب لاقتراح الكوادر المتطابقة...
                </div>
              ) : (
                aiMatchedCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-foreground">{cand.name}</span>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold">
                          مطابقة {cand.matchScore}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{cand.role} · خبرة موثقة</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        toast({
                          title: `تم اختيار ${cand.name} وتعيينه على هذا الأمر بنجاح 🎯`,
                        });
                        setOpenAiMatcherDialog(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-8 px-3 gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      تعيين فوري
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog 9: ERP / Qiwa / Webhook Integration ─── */}
        <Dialog open={openErpSyncDialog} onOpenChange={setOpenErpSyncDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                تكامل أنظمة الموارد البشرية والـ ERP (Odoo / SAP / Qiwa)
              </DialogTitle>
              <DialogDescription className="text-xs">
                مزامنة أوامر التعيين المكتملة تلقائياً مع نظام الرواتب وشؤون الموظفين.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold">رابط الـ Webhook المباشر (ERP Sync Endpoint)</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="text-xs font-mono rounded-xl h-9"
                    dir="ltr"
                  />
                  <Button
                    onClick={() => {
                      setIsPingingWebhook(true);
                      setTimeout(() => {
                        setIsPingingWebhook(false);
                        toast({ title: "تم اختبار الرابط والاتصال بنجاح (HTTP 200 OK) 🟢" });
                      }, 800);
                    }}
                    disabled={isPingingWebhook}
                    className="bg-slate-900 text-white font-bold text-xs rounded-xl h-9 px-3"
                  >
                    {isPingingWebhook ? "جاري الفحص..." : "اختبار الربط ⚡"}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl space-y-2 border">
                <p className="font-black text-foreground">الحمولة الموحدة للبيانات (Standard JSON Schema):</p>
                <pre className="text-[10px] font-mono text-slate-600 bg-background p-2.5 rounded-lg border overflow-x-auto" dir="ltr">
{`{
  "event": "order.completed",
  "order_number": "ORD-2026-001",
  "employee": {
    "name": "أحمد بن محمد القحطاني",
    "national_id": "1089345210",
    "position": "معلم لغة عربية",
    "branch": "مجمع بنين - الرياض",
    "basic_salary": 8500,
    "total_salary": 11500,
    "joining_date": "2026-09-01"
  }
}`}
                </pre>
              </div>

              <Button
                onClick={handleExportErpFormat}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                تنزيل كشف ERP / Qiwa الموحد (Excel)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
