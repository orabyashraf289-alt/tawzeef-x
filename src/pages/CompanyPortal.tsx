import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Briefcase,
  Users,
  FileText,
  Mail,
  Loader2,
  GitFork,
  Plus,
  MapPin,
  Phone,
  Pencil,
  Camera,
  Trash2,
  AlertTriangle,
  Search,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Building,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  useMyCompanies,
  useCompanyStats,
  useMyCompanyRole,
  useCompanyBranches,
  useCreateCompanyBranch,
  useUpdateCompany,
  useDeleteCompany,
  type Company,
} from "@/hooks/useCompanies";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useMyPendingInvitations, useAcceptInvitation, useDeclineInvitation } from "@/hooks/useCompanyInvitations";
import CompanyInvitationsPanel from "@/components/CompanyInvitationsPanel";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CompanyPortal() {
  const { data: companies = [], isLoading } = useMyCompanies();
  const { data: pendingInvites = [] } = useMyPendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const { activeCompanyId } = useCompanyContext();

  const primaryCompanies = useMemo(
    () => companies.filter((c) => !c.parent_company_id),
    [companies]
  );

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) || primaryCompanies[0],
    [companies, activeCompanyId, primaryCompanies]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات المنظمة والفروع...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
        {/* Top Header & Executive Summary Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">بوابة إدارة الشركات والفروع</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إدارة الكيان المؤسسي، الفروع التشغيلية، وصلاحيات فريق الموارد البشرية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeCompany && (
              <Badge className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                البيئة النشطة: {activeCompany.name}
              </Badge>
            )}
            <Link to="/settings?tab=company">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Pencil className="w-3.5 h-3.5" />
                إعدادات الهوية المؤسسية
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Overview KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">الشركات المعتمدة</p>
                <p className="text-xl font-black text-foreground mt-0.5">{primaryCompanies.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Building className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">الفروع الإجمالية</p>
                <p className="text-xl font-black text-foreground mt-0.5">
                  {companies.filter((c) => c.parent_company_id).length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <GitFork className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">الدعوات المعلقة</p>
                <p className="text-xl font-black text-foreground mt-0.5">{pendingInvites.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">الامتثال والنطاقات</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  نطاق أخضر / متوافق 🌟
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Invitations Banner */}
        {pendingInvites.length > 0 && (
          <Card className="p-5 border-amber-500/40 bg-amber-500/5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-foreground">
                دعوات الانضمام بانتظار موافقتك ({pendingInvites.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate text-foreground">{inv.company?.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        الدور المحدد:{" "}
                        {inv.member_role === "owner" ? "مالك" : inv.member_role === "hr" ? "مسؤول HR" : "مشاهد"}{" "}
                        • تنتهي الصلاحية: {new Date(inv.expires_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      className="text-xs h-8"
                      disabled={accept.isPending}
                      onClick={() => accept.mutate(inv.token)}
                    >
                      {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "قبول الدعوة"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      disabled={decline.isPending}
                      onClick={() => decline.mutate(inv.token)}
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Primary Companies List */}
        {primaryCompanies.length === 0 && pendingInvites.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-1 text-foreground">لست عضواً في أي شركة حتى الآن</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              تواصل مع مسؤول المنظمة أو مدير النظام لإرسال دعوة انضمام، أو أنشئ شركتك من صفحة الإعدادات.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {primaryCompanies.map((c) => (
              <CompanyBlock
                key={c.id}
                company={c}
                companyId={c.id}
                name={c.name}
                role={c.member_role || "viewer"}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CompanyBlock({
  company,
  companyId,
  name,
  role,
}: {
  company: Company;
  companyId: string;
  name: string;
  role: string;
}) {
  const { activeCompanyId, setActiveCompanyId } = useCompanyContext();
  const isActive = activeCompanyId === companyId;
  const { data: stats } = useCompanyStats(companyId);
  const { data: myRole } = useMyCompanyRole(companyId);
  const { user } = useAuth();

  // Branches query & state
  const { data: branches = [], isLoading: branchesLoading } = useCompanyBranches(companyId);
  const createBranch = useCreateCompanyBranch();

  // Branch creation form state
  const [openAddBranch, setOpenAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchType, setBranchType] = useState("فرع إداري");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchNotes, setBranchNotes] = useState("");

  // Branch search and city filter
  const [branchSearch, setBranchSearch] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");

  // Edit & Delete Branch state
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const deleteBranchMutation = useDeleteCompany();
  const [deletingBranchTarget, setDeletingBranchTarget] = useState<any | null>(null);
  const [checkingBranchData, setCheckingBranchData] = useState(false);
  const [branchLinkedInfo, setBranchLinkedInfo] = useState<{
    hasData: boolean;
    jobsCount: number;
    candidatesCount: number;
    offersCount: number;
    interviewsCount: number;
  } | null>(null);

  // Extract unique cities from branches for quick filtering
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    branches.forEach((b) => {
      if (b.city && b.city.trim()) {
        cities.add(b.city.trim());
      }
    });
    return Array.from(cities);
  }, [branches]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchesSearch =
        !branchSearch.trim() ||
        b.name?.toLowerCase().includes(branchSearch.toLowerCase()) ||
        b.city?.toLowerCase().includes(branchSearch.toLowerCase()) ||
        b.contact_phone?.includes(branchSearch) ||
        b.contact_email?.toLowerCase().includes(branchSearch.toLowerCase()) ||
        b.notes?.toLowerCase().includes(branchSearch.toLowerCase());

      const matchesCity = selectedCityFilter === "all" || b.city === selectedCityFilter;

      return matchesSearch && matchesCity;
    });
  }, [branches, branchSearch, selectedCityFilter]);

  const handleStartDeleteBranch = async (branch: any) => {
    setDeletingBranchTarget(branch);
    setCheckingBranchData(true);
    setBranchLinkedInfo(null);

    try {
      // 1. Check jobs count
      const { data: compJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", branch.id);
      if (jobsError) throw jobsError;
      const jobsCount = compJobs?.length || 0;
      const jobIds = (compJobs || []).map((j) => j.id);

      // 2. Check candidates
      let candidatesQuery = supabase.from("candidates").select("id");
      candidatesQuery =
        jobIds.length > 0
          ? candidatesQuery.or(`company_id.eq.${branch.id},job_id.in.(${jobIds.join(",")})`)
          : candidatesQuery.eq("company_id", branch.id);
      const { data: branchCandidates, error: candidatesError } = await candidatesQuery;
      if (candidatesError) throw candidatesError;
      const candidateIds = (branchCandidates || []).map((c) => c.id);
      const candidatesCount = candidateIds.length;

      // 3. Check offers count
      let offersCount = 0;
      if (jobIds.length > 0) {
        const { count, error: offersError } = await supabase
          .from("job_offers")
          .select("id", { count: "exact" })
          .in("job_id", jobIds);
        if (offersError) throw offersError;
        offersCount = count || 0;
      }

      // 4. Check interviews count
      let interviewsQuery = supabase.from("interviews").select("id", { count: "exact", head: true });
      interviewsQuery =
        candidateIds.length > 0
          ? interviewsQuery.or(`company_id.eq.${branch.id},candidate_id.in.(${candidateIds.join(",")})`)
          : interviewsQuery.eq("company_id", branch.id);
      const { count: interviewCount, error: interviewsError } = await interviewsQuery;
      if (interviewsError) throw interviewsError;
      const interviewsCount = interviewCount || 0;

      const hasData = jobsCount > 0 || candidatesCount > 0 || offersCount > 0 || interviewsCount > 0;
      setBranchLinkedInfo({
        hasData,
        jobsCount,
        candidatesCount,
        offersCount,
        interviewsCount,
      });
    } catch {
      setDeletingBranchTarget(null);
      toast({
        title: "تعذر التحقق من بيانات الفرع",
        description: "أعد المحاولة قبل متابعة الحذف.",
        variant: "destructive",
      });
    } finally {
      setCheckingBranchData(false);
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!deletingBranchTarget) return;
    try {
      await deleteBranchMutation.mutateAsync(deletingBranchTarget.id);
      setDeletingBranchTarget(null);
      setBranchLinkedInfo(null);
    } catch {
      // Error toast handled inside mutation
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    try {
      const formattedNotes = branchNotes.trim()
        ? `${branchType ? `[${branchType}] ` : ""}${branchNotes.trim()}`
        : branchType || "";

      await createBranch.mutateAsync({
        name: branchName.trim(),
        city: branchCity.trim() || null,
        contact_email: branchEmail.trim() || null,
        contact_phone: branchPhone.trim() || null,
        notes: formattedNotes || null,
        parent_company_id: companyId,
      });

      setOpenAddBranch(false);
      setBranchName("");
      setBranchCity("");
      setBranchType("فرع إداري");
      setBranchEmail("");
      setBranchPhone("");
      setBranchNotes("");
      toast({ title: "تمت إضافة الفرع بنجاح 🏢", description: `أصبح فرع (${branchName}) جاهزاً الآن للربط بالوظائف.` });
    } catch {
      // Handled in mutation
    }
  };

  const statsCards = useMemo(
    () => [
      {
        label: "الوظائف المتاحة",
        value: stats?.jobsTotal ?? 0,
        icon: Briefcase,
        color: "bg-blue-500/10 text-blue-600",
        to: "/jobs",
      },
      {
        label: "المرشحون المتقدمون",
        value: stats?.candidatesTotal ?? 0,
        icon: Users,
        color: "bg-violet-500/10 text-violet-600",
        to: "/candidates",
      },
      {
        label: "العروض الوظيفية",
        value: stats?.offersTotal ?? 0,
        icon: FileText,
        color: "bg-emerald-500/10 text-emerald-600",
        to: "/offers",
      },
    ],
    [stats]
  );

  return (
    <Card className="p-6 space-y-6 border-border/60 shadow-xs relative overflow-hidden">
      {/* Primary Company Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {company.logo_url ? (
              <img src={company.logo_url} alt={name} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-7 h-7 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-xl text-foreground">{name}</h2>
              {isActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-[11px] px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  بيئة العمل النشطة
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => {
                    setActiveCompanyId(companyId);
                    toast({ title: `تم التبديل إلى ${name} كبيئة العمل النشطة 🏢` });
                  }}
                >
                  التبديل إلى هذه المنظمة
                </Button>
              )}
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold">
                {role === "owner" ? "مالك المؤسسة" : role === "hr" ? "مسؤول HR" : "مشاهد"}
              </Badge>
            </div>

            {/* Saudi Business Regulatory Badges & Meta */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-2">
              {company.city && (
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary/70" />
                  {company.city}، {company.country || "المملكة العربية السعودية"}
                </span>
              )}
              {company.contact_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary/70" />
                  {company.contact_phone}
                </span>
              )}
              {company.contact_email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary/70" />
                  {company.contact_email}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  الموقع الإلكتروني
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls for Company */}
        <div className="flex items-center gap-2 flex-wrap">
          {(myRole === "owner" || myRole === "hr") && (
            <Link to="/settings?tab=company">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                <Pencil className="w-3.5 h-3.5" />
                تعديل البيانات الأساسية
              </Button>
            </Link>
          )}

          {myRole === "owner" && (
            <Dialog open={openAddBranch} onOpenChange={setOpenAddBranch}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs h-9 font-bold">
                  <Plus className="w-4 h-4" />
                  إضافة فرع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-right flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    إضافة فرع جديد للمؤسسة
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddBranch} className="space-y-3.5 py-2">
                  <div className="space-y-1 text-right">
                    <Label htmlFor="branchName" className="text-xs font-bold">
                      اسم الفرع / المركز *
                    </Label>
                    <Input
                      id="branchName"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="مثال: فرع العليا، فرع الواجهة البحرية، مركز التوزيع"
                      required
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div className="space-y-1">
                      <Label htmlFor="branchCity" className="text-xs font-bold">
                        المدينة
                      </Label>
                      <Input
                        id="branchCity"
                        value={branchCity}
                        onChange={(e) => setBranchCity(e.target.value)}
                        placeholder="الرياض، جدة، الخبر..."
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="branchType" className="text-xs font-bold">
                        تصنيف الفرع
                      </Label>
                      <select
                        id="branchType"
                        value={branchType}
                        onChange={(e) => setBranchType(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="فرع إداري">فرع إداري</option>
                        <option value="مقر رئيسي">مقر رئيسي</option>
                        <option value="مركز تشغيلي">مركز تشغيلي</option>
                        <option value="مكتب مبيعات">مكتب مبيعات</option>
                        <option value="مستودع / لوجستي">مستودع / لوجستي</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div className="space-y-1">
                      <Label htmlFor="branchEmail" className="text-xs font-bold">
                        البريد الإلكتروني للفرع
                      </Label>
                      <Input
                        id="branchEmail"
                        type="email"
                        value={branchEmail}
                        onChange={(e) => setBranchEmail(e.target.value)}
                        placeholder="branch@company.sa"
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="branchPhone" className="text-xs font-bold">
                        رقم هاتف الفرع
                      </Label>
                      <Input
                        id="branchPhone"
                        value={branchPhone}
                        onChange={(e) => setBranchPhone(e.target.value)}
                        placeholder="011XXXXXXX"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <Label htmlFor="branchNotes" className="text-xs font-bold">
                      العنوان التفصيلي وملاحظات التشغيل
                    </Label>
                    <Textarea
                      id="branchNotes"
                      value={branchNotes}
                      onChange={(e) => setBranchNotes(e.target.value)}
                      placeholder="العنوان الوطني، الحي، ساعات العمل، أو أي اشتراطات خاصة بالفرع..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  <DialogFooter className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpenAddBranch(false)}>
                      إلغاء
                    </Button>
                    <Button type="submit" size="sm" disabled={createBranch.isPending}>
                      {createBranch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الفرع"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statsCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={c.to}>
                <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-border/50 bg-card/70 hover:border-primary/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      عرض التفاصيل ↗
                    </Badge>
                  </div>
                  <div className="text-2xl font-black text-foreground">{c.value}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">{c.label}</div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Branches Management Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/40">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground">
              فروع ومراكز الشركة المعتمدة ({branches.length})
            </h3>
            {filteredBranches.length !== branches.length && (
              <Badge variant="secondary" className="text-[10px]">
                تصفية: {filteredBranches.length}
              </Badge>
            )}
          </div>

          {/* Search & City Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                placeholder="بحث باسم الفرع أو المدينة..."
                className="h-8 text-xs pr-8 pl-3 bg-background"
              />
            </div>

            {availableCities.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto">
                <Button
                  variant={selectedCityFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                  onClick={() => setSelectedCityFilter("all")}
                >
                  الكل
                </Button>
                {availableCities.map((city) => (
                  <Button
                    key={city}
                    variant={selectedCityFilter === city ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] px-2.5 rounded-lg"
                    onClick={() => setSelectedCityFilter(city)}
                  >
                    {city}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {branchesLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            جاري تحميل فروع المنظمة...
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8 px-4 bg-muted/10 rounded-xl border border-dashed border-border/60">
            <GitFork className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">لا توجد فروع مسجلة لهذه المنظمة حتى الآن</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              يمكنك إضافة فروع الشركة وتحديد مدنها لتمكين توجيه الوظائف والمرشحين بدقة.
            </p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="text-center py-6 px-4 bg-muted/10 rounded-xl border border-border/40">
            <Filter className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">لا توجد فروع مطابقة لمعايير البحث الحالية.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredBranches.map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="p-4 bg-background border border-border/60 rounded-xl flex flex-col justify-between shadow-xs relative group hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain" />
                        ) : (
                          <Building className="w-5 h-5 text-primary/70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold truncate text-foreground">{b.name}</p>
                          {b.city && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                              {b.city}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1">
                          {b.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-primary/70" />
                              {b.contact_phone}
                            </span>
                          )}
                          {b.contact_email && (
                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                              <Mail className="w-3 h-3 text-primary/70" />
                              {b.contact_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {formatNotesText(b.notes) && (
                      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/20 line-clamp-2">
                        {formatNotesText(b.notes)}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar on card */}
                  {myRole === "owner" && (
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-muted"
                        onClick={() => setEditingBranch(b)}
                        title="تعديل الفرع"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-destructive/10 text-destructive/80 hover:text-destructive"
                        onClick={() => handleStartDeleteBranch(b)}
                        title="حذف الفرع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Branch Confirmation & Safety Dependency Check Dialog */}
      <AlertDialog
        open={!!deletingBranchTarget}
        onOpenChange={(op) => {
          if (!op) {
            setDeletingBranchTarget(null);
            setBranchLinkedInfo(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right flex items-center gap-2">
              {checkingBranchData ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  جاري التحقق من سجلات الفرع...
                </>
              ) : branchLinkedInfo?.hasData ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  لا يمكن حذف الفرع!
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-destructive shrink-0" />
                  تأكيد حذف الفرع
                </>
              )}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="py-2 text-sm text-muted-foreground space-y-3 text-right">
            {checkingBranchData ? (
              <p className="text-xs">
                يرجى الانتظار بينما نقوم بالتحقق مما إذا كان الفرع مرتبط بأي وظائف، مرشحين، أو عروض...
              </p>
            ) : branchLinkedInfo?.hasData ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  الفرع <span className="font-bold text-primary">"{deletingBranchTarget?.name}"</span> مرتبط ببيانات
                  تشغيلية نشطة ولا يمكن حذفه حتى يتم نقل أو حذف هذه السجلات أولاً:
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                  {branchLinkedInfo.jobsCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>💼 الوظائف المرتبطة:</span>
                      <span className="font-bold">{branchLinkedInfo.jobsCount}</span>
                    </div>
                  )}
                  {branchLinkedInfo.candidatesCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>👥 المرشحون المتقدمون:</span>
                      <span className="font-bold">{branchLinkedInfo.candidatesCount}</span>
                    </div>
                  )}
                  {branchLinkedInfo.offersCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>📄 العروض الوظيفية:</span>
                      <span className="font-bold">{branchLinkedInfo.offersCount}</span>
                    </div>
                  )}
                  {branchLinkedInfo.interviewsCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>📅 المقابلات:</span>
                      <span className="font-bold">{branchLinkedInfo.interviewsCount}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  إجراء لحماية البيانات: لا يُسمح بحذف الفروع المرتبطة بسجلات توظيف تجنباً لأي فقدان بيانات غير مقصود.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  هل أنت متأكد من رغبتك في حذف فرع{" "}
                  <span className="font-bold text-foreground">"{deletingBranchTarget?.name}"</span> نهائياً؟
                </p>
                <p className="text-xs bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-lg border border-emerald-500/20">
                  ✅ تم التأكد من عدم وجود أية وظائف، مرشحين، أو عروض وظيفية مرتبطة بهذا الفرع.
                </p>
                <p className="text-[11px] text-destructive">
                  ⚠️ هذا الإجراء سيقوم بحذف الفرع نهائياً ولا يمكن التراجع عنه.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setDeletingBranchTarget(null);
                setBranchLinkedInfo(null);
              }}
            >
              {branchLinkedInfo?.hasData ? "إغلاق" : "إلغاء"}
            </AlertDialogCancel>
            {!checkingBranchData && !branchLinkedInfo?.hasData && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                disabled={deleteBranchMutation.isPending}
                onClick={handleConfirmDeleteBranch}
              >
                {deleteBranchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                تأكيد الحذف النهائي
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Branch Dialog */}
      {editingBranch && (
        <EditBranchDialog branch={editingBranch} onClose={() => setEditingBranch(null)} />
      )}

      {/* Company Invitations Panel for owners */}
      {myRole === "owner" && <CompanyInvitationsPanel companyId={companyId} />}
    </Card>
  );
}

function formatNotesText(notesStr?: string | null): string {
  if (!notesStr) return "";
  if (notesStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(notesStr);
      return parsed.description || parsed.address || "";
    } catch {
      return notesStr;
    }
  }
  return notesStr;
}

const EditBranchDialog = ({
  branch,
  open = true,
  onClose,
  updateBranch: updateBranchProp,
}: {
  branch: any;
  open?: boolean;
  onClose: () => void;
  updateBranch?: ReturnType<typeof useUpdateCompany>;
}) => {
  const { user } = useAuth();
  const defaultUpdateBranch = useUpdateCompany();
  const updateBranch = updateBranchProp || defaultUpdateBranch;

  const [name, setName] = useState(branch.name || "");
  const [city, setCity] = useState(branch.city || "");
  const [email, setEmail] = useState(branch.contact_email || "");
  const [phone, setPhone] = useState(branch.contact_phone || "");
  const [notes, setNotes] = useState(formatNotesText(branch.notes));

  const [logoUrl, setLogoUrl] = useState(branch.logo_url || "");
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/branch_logo_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setLogoUrl(data.publicUrl);
      toast({ title: "تم رفع الشعار بنجاح ✅" });
    } catch (err: any) {
      console.error("Error uploading logo:", err.message);
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateBranch.mutateAsync({
      id: branch.id,
      name: name.trim(),
      city: city.trim() || null,
      contact_email: email.trim() || null,
      contact_phone: phone.trim() || null,
      notes: notes.trim() || null,
      logo_url: logoUrl || null,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            تعديل بيانات الفرع
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 py-2">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center gap-3 border-b border-border/40 pb-4">
            <div className="relative w-20 h-20 rounded-xl bg-muted border border-border/50 flex items-center justify-center overflow-hidden group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="relative gap-1.5 text-xs"
                disabled={uploading}
              >
                <Camera className="w-3.5 h-3.5" />
                {logoUrl ? "تغيير الشعار" : "رفع شعار"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive text-xs"
                  onClick={() => setLogoUrl("")}
                >
                  حذف
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <Label htmlFor="editName" className="text-xs font-bold">
              اسم الفرع *
            </Label>
            <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} required className="text-xs h-9" />
          </div>
          <div className="space-y-1.5 text-right">
            <Label htmlFor="editCity" className="text-xs font-bold">
              المدينة
            </Label>
            <Input id="editCity" value={city} onChange={(e) => setCity(e.target.value)} className="text-xs h-9" />
          </div>
          <div className="space-y-1.5 text-right">
            <Label htmlFor="editEmail" className="text-xs font-bold">
              البريد الإلكتروني للتواصل
            </Label>
            <Input
              id="editEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-1.5 text-right">
            <Label htmlFor="editPhone" className="text-xs font-bold">
              رقم هاتف الفرع
            </Label>
            <Input id="editPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-xs h-9" />
          </div>
          <div className="space-y-1.5 text-right">
            <Label htmlFor="editNotes" className="text-xs font-bold">
              العنوان التفصيلي وملاحظات التشغيل
            </Label>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="العنوان التفصيلي، أوقات العمل، إلخ..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={updateBranch.isPending || uploading}>
              {updateBranch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
