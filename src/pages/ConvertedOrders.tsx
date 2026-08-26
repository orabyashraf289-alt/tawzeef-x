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
  const [activeTab, setActiveTab] = useState<"all" | "direct_hire" | "agency_fulfillment" | "branch_transfer">("all");
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
  const [selectedOrder, setSelectedOrder] = useState<ConvertedOrder | null>(null);

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
      if (activeTab !== "all" && o.order_type !== activeTab) return false;

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

    return { total, directHire, agencyFulfillment, branchTransfer, readyOrCompleted, pendingDocs };
  }, [orders]);

  // Quick autofill when selecting a candidate
  const handleSelectCandidateForOrder = (candId: string) => {
    const cand = candidates.find((c) => c.id === candId);
    if (!cand) return;

    // Check if there's an offer for this candidate to auto-fill salary
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

  // Calculate Checklist Completion
  const getChecklistCount = (cl?: OrderChecklist) => {
    if (!cl) return { completed: 0, total: 7 };
    const items = Object.values(cl);
    const completed = items.filter(Boolean).length;
    return { completed, total: 7 };
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
                  إصدار قرارات التعيين والمباشرة الرسمية، وأوامر الاستقدام عبر الوكالات، ومتابعة التحويل بين الفروع.
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
                <span className="text-xs font-bold text-muted-foreground">التحويل بين الفروع</span>
                <p className="text-2xl font-black text-blue-700">{stats.branchTransfer}</p>
                <span className="text-[10px] text-blue-600 font-bold">تنقل داخلي</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6" />
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
                </TabsList>
              </Tabs>

              {/* Filters & Search */}
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
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
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
                      <TableHead className="text-center text-xs font-black">الإجراءات</TableHead>
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
                              {/* Print Order */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setOpenPrintDialog(true);
                                }}
                                className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold gap-1"
                                title="طباعة أمر التعيين"
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
      </div>
    </DashboardLayout>
  );
}
