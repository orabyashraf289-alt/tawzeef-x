import { useState } from "react";
import {
  useSubscriptionPlans,
  useUpgradeRequests,
  useAdminCustomUpgradeSubscription,
  useCompanyInvoices,
  useRejectUpgradeRequest,
  type SubscriptionPlan,
} from "@/hooks/useSubscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Package, Edit2, Save, X, Users, CreditCard, Building2, Crown, Infinity,
  CheckCircle2, AlertTriangle, Search, Filter, Send, Clock, FileText, Download,
  Calendar, DollarSign, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import SARSymbol, { formatSAR } from "@/components/SARSymbol";

// Hook: all companies with their subscriptions and owners
function useCompaniesList() {
  return useQuery({
    queryKey: ["admin-companies-list"],
    queryFn: async () => {
      // Get all companies
      const { data: cos, error: cosError } = await supabase
        .from("companies")
        .select("*");
      if (cosError) throw cosError;

      if (!cos || cos.length === 0) return [];

      // Filter main companies vs branches
      const mainCompanies = cos.filter((c) => !c.parent_company_id);
      const branches = cos.filter((c) => !!c.parent_company_id);

      const mainCompanyIds = mainCompanies.map((c) => c.id);

      // Get company members for main companies
      const { data: members } = await supabase
        .from("company_members" as any)
        .select("company_id, user_id, member_role")
        .in("company_id", mainCompanyIds);

      const possibleUserIds = Array.from(new Set([
        ...mainCompanies.map((c) => c.owner_user_id).filter(Boolean),
        ...(members || []).map((m: any) => m.user_id).filter(Boolean),
      ]));

      // Get owner profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", possibleUserIds);

      // Get subscriptions for main companies
      const { data: subs } = await supabase
        .from("company_subscriptions" as any)
        .select("*")
        .in("company_id", mainCompanyIds);

      // Get plans
      const { data: plans } = await supabase
        .from("subscription_plans" as any)
        .select("*");

      return mainCompanies.map((c) => {
        const companyMembers = (members || []).filter((m: any) => m.company_id === c.id);
        const ownerMember = companyMembers.find((m: any) => m.member_role === "owner") || companyMembers[0];
        const effectiveUserId = c.owner_user_id || ownerMember?.user_id || null;
        const profile = effectiveUserId ? (profiles || []).find((p) => p.user_id === effectiveUserId || p.id === effectiveUserId) : null;
        const sub = (subs as any[] || []).find((s: any) => s.company_id === c.id);
        const plan = sub ? (plans as any[] || []).find((p: any) => p.id === sub.plan_id) : null;
        
        // Resolve branches list
        const companyBranches = branches
          .filter((b) => b.parent_company_id === c.id)
          .map((b) => b.name || "فرع بدون اسم");

        return {
          companyId: c.id,
          companyName: c.name || "شركة بدون اسم",
          ownerName: profile?.full_name || "بدون اسم مالك",
          ownerUserId: effectiveUserId,
          joinedAt: c.created_at,
          subscription: sub,
          plan,
          branches: companyBranches,
        };
      });
    },
  });
}

function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("subscription_plans" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({ title: "تم تحديث الباقة بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export default function AdminSubscriptionManager() {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: companies, isLoading: companiesLoading } = useCompaniesList();
  const { data: upgradeRequests, isLoading: requestsLoading } = useUpgradeRequests();
  const { data: invoices } = useCompanyInvoices();
  const updatePlan = useUpdatePlan();
  const customUpgrade = useAdminCustomUpgradeSubscription();
  const rejectUpgrade = useRejectUpgradeRequest();

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, job_posts_limit: 0, name_ar: "" });
  const [search, setSearch] = useState("");
  
  // Custom Upgrade Dialog State
  const [upgradeDialog, setUpgradeDialog] = useState<{
    companyId: string;
    name: string;
    ownerUserId: string | null;
    currentPlanId?: string;
    requestId?: string;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customLimit, setCustomLimit] = useState<number>(-1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [startsAtDate, setStartsAtDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expiresAtDate, setExpiresAtDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [shouldIssueInvoice, setShouldIssueInvoice] = useState<boolean>(true);
  const [rejectDialog, setRejectDialog] = useState<{
    requestId: string;
    companyName: string;
    ownerUserId: string | null;
  } | null>(null);

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditForm({ price: plan.price, job_posts_limit: plan.job_posts_limit, name_ar: plan.name_ar });
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    updatePlan.mutate({ planId: editingPlan.id, updates: editForm });
    setEditingPlan(null);
  };

  const openUpgradeModal = (
    company: { companyId: string; companyName: string; ownerUserId: string | null; plan?: any },
    requestId?: string,
    targetPlanId?: string
  ) => {
    setUpgradeDialog({
      companyId: company.companyId,
      name: company.companyName,
      ownerUserId: company.ownerUserId,
      currentPlanId: company.plan?.id,
      requestId,
    });
    const targetPlan = targetPlanId
      ? (plans || []).find((p) => p.id === targetPlanId || p.name?.toLowerCase() === targetPlanId.toLowerCase() || p.name_ar === targetPlanId)
      : null;
    const defaultPlan = targetPlan || company.plan || (plans && plans[0]);
    if (defaultPlan) {
      setSelectedPlanId(defaultPlan.id);
      setCustomLimit(defaultPlan.job_posts_limit);
      setCustomPrice(defaultPlan.price);
    }
  };

  const handleSelectPlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const p = (plans || []).find((x) => x.id === planId);
    if (p) {
      setCustomLimit(p.job_posts_limit);
      setCustomPrice(p.price);
    }
  };

  const handleExecuteUpgrade = async () => {
    if (!upgradeDialog || !selectedPlanId) return;
    const targetPlan = (plans || []).find((p) => p.id === selectedPlanId);
    if (!targetPlan) return;

    try {
      await customUpgrade.mutateAsync({
        companyId: upgradeDialog.companyId,
        ownerUserId: upgradeDialog.ownerUserId,
        planId: targetPlan.id,
        planNameAr: targetPlan.name_ar,
        jobPostsLimit: customLimit,
        price: customPrice,
        startsAt: new Date(startsAtDate).toISOString(),
        expiresAt: expiresAtDate ? new Date(expiresAtDate).toISOString() : null,
        issueInvoice: shouldIssueInvoice,
        requestId: upgradeDialog.requestId,
      });

      toast({
        title: "تمت ترقية باقة الشركة وإصدار الفاتورة بنجاح! 🚀✅",
        description: `تم تعيين باقة ${targetPlan.name_ar} للشركة وتحديث حدود التوظيف وإشعار الشركة.`,
      });
      setUpgradeDialog(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: "فشل الترقية", description: err.message, variant: "destructive" });
    }
  };

  const filteredCompanies = (companies || []).filter(
    (c) => !search || c.companyName.includes(search) || c.ownerName.includes(search) || (c.branches && c.branches.some((b: string) => b.includes(search)))
  );

  const planColors: Record<string, string> = {
    free: "border-muted bg-muted/30",
    basic: "border-primary/30 bg-primary/5",
    professional: "border-warning/30 bg-warning/5",
  };

  const planIcons: Record<string, any> = {
    free: Package,
    basic: CreditCard,
    professional: Crown,
  };

  const pendingRequests = (upgradeRequests || []).filter((r) => r.status === "pending");

  return (
    <Tabs defaultValue="companies" dir="rtl">
      <TabsList className="mb-4">
        <TabsTrigger value="companies" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />إدارة الاشتراكات والشركات</TabsTrigger>
        <TabsTrigger value="requests" className="gap-1.5 relative">
          <Clock className="w-3.5 h-3.5" />
          طلبات الترقية
          {pendingRequests.length > 0 && (
            <Badge className="mr-1 bg-amber-500 text-white text-[10px] px-1.5 py-0 rounded-full animate-pulse">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="plans" className="gap-1.5"><Package className="w-3.5 h-3.5" />إعدادات الباقات</TabsTrigger>
      </TabsList>

      {/* ─── Companies & Custom Subscriptions Tab ─── */}
      <TabsContent value="companies" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث باسم الشركة أو المالك..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
        </div>

        {companiesLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-14 space-y-3">
            <Building2 className="w-12 h-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">لا يوجد شركات مسجلة بعد</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-muted-foreground">الشركات والاشتراكات ({filteredCompanies.length})</span>
            </div>
            <div className="divide-y divide-border">
              {filteredCompanies.map((company) => (
                <div key={company.companyId} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {company.companyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-foreground">{company.companyName}</p>
                    <p className="text-xs text-muted-foreground">المالك: {company.ownerName}</p>
                    {company.branches && company.branches.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-muted-foreground font-semibold">الفروع:</span>
                        {company.branches.map((bName: string, bi: number) => (
                          <Badge key={bi} variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-none">
                            {bName}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      انضمت {new Date(company.joinedAt).toLocaleDateString("ar-SA")}
                      {company.subscription && (
                        <> · استخدمت {company.subscription.job_posts_used} من {company.subscription.job_posts_limit === -1 ? "∞" : company.subscription.job_posts_limit} منشور</>
                      )}
                    </p>
                  </div>

                  {/* Current plan badge */}
                  {company.plan ? (
                    <Badge className={`${planColors[company.plan.name] || ""} text-xs border shrink-0`}>
                      {company.plan.name_ar}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-destructive border-destructive/30 shrink-0">
                      <AlertTriangle className="w-3 h-3 ml-1" />بدون باقة
                    </Badge>
                  )}

                  {/* Usage progress */}
                  {company.subscription && company.subscription.job_posts_limit !== -1 && (
                    <div className="w-20 hidden md:block shrink-0">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, (company.subscription.job_posts_used / company.subscription.job_posts_limit) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                        {company.subscription.job_posts_used}/{company.subscription.job_posts_limit}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs gap-1 font-bold bg-primary text-primary-foreground"
                      onClick={() => openUpgradeModal(company)}
                    >
                      <Sparkles className="w-3.5 h-3.5" />ترقية وتخصيص الباقة
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ─── Pending Upgrade Requests Tab ─── */}
      <TabsContent value="requests" className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-base mb-1">طلبات الترقية الواردة من العملاء</h3>
          <p className="text-xs text-muted-foreground mb-4">يمكنك الموافقة وتفعيل الباقة وتحديد التواريخ بنقرة واحدة</p>

          {requestsLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">جاري التحميل...</div>
          ) : !upgradeRequests || upgradeRequests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p>لا يوجد طلبات ترقية معلقة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upgradeRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{req.company_name}</span>
                      <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                        طلب: {req.target_plan_name}
                      </Badge>
                      <Badge variant={req.status === "pending" ? "secondary" : "default"} className="text-[10px]">
                        {req.status === "pending" ? "⏳ قيد الانتظار" : req.status === "approved" ? "✅ مفعّل" : "❌ مرفوض"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      مقدم الطلب: {req.requester_name} · التاريخ: {new Date(req.created_at).toLocaleDateString("ar-SA")}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-foreground/80 bg-card p-2 rounded border border-border/40 mt-1">
                        ملاحظات: {req.notes}
                      </p>
                    )}
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={() => {
                          const co = (companies || []).find((c) => c.companyId === req.company_id);
                          setRejectDialog({
                            requestId: req.id,
                            companyName: req.company_name || "الشركة",
                            ownerUserId: co?.ownerUserId || req.requested_by_user_id || null,
                          });
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          const co = (companies || []).find((c) => c.companyId === req.company_id);
                          if (co) {
                            openUpgradeModal(co, req.id, req.target_plan_id);
                          } else {
                            openUpgradeModal({
                              companyId: req.company_id,
                              companyName: req.company_name || "الشركة",
                              ownerUserId: req.requested_by_user_id || null,
                            }, req.id, req.target_plan_id);
                          }
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        تفعيل الباقة وإصدار الفاتورة
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ─── Plans Management Tab ─── */}
      <TabsContent value="plans" className="space-y-4">
        <p className="text-sm text-muted-foreground">تعديل أسعار الباقات وعدد المنشورات المسموح بها</p>
        {plansLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {(plans || []).map((plan) => {
              const PlanIcon = planIcons[plan.name] || Package;
              const isEditing = editingPlan?.id === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border-2 p-5 ${planColors[plan.name] || "border-border"} relative`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                        <PlanIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        {isEditing ? (
                          <Input
                            value={editForm.name_ar}
                            onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })}
                            className="h-7 text-sm font-bold w-32"
                          />
                        ) : (
                          <p className="font-bold text-sm">{plan.name_ar}</p>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{plan.name}</p>
                      </div>
                    </div>
                    {!isEditing ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(plan)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={saveEdit}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEditingPlan(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">السعر</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                          className="h-8 text-sm mt-1"
                        />
                      ) : (
                        <p className="text-lg font-bold flex items-center gap-1">
                          {plan.price === 0 ? "مجاني" : (
                            <><span>{formatSAR(plan.price)}</span> <SARSymbol className="w-4 h-4 inline-block" /> <span className="text-xs text-muted-foreground font-normal">/ شهرياً</span></>
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">عدد المنشورات</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editForm.job_posts_limit}
                          onChange={(e) => setEditForm({ ...editForm, job_posts_limit: Number(e.target.value) })}
                          className="h-8 text-sm mt-1"
                          min={-1}
                        />
                      ) : (
                        <p className="text-lg font-bold flex items-center gap-1">
                          {plan.job_posts_limit === -1 ? (
                            <><Infinity className="w-5 h-5 text-primary" /> <span className="text-xs text-muted-foreground font-normal">غير محدود</span></>
                          ) : (
                            <>{plan.job_posts_limit} <span className="text-xs text-muted-foreground font-normal">منشور</span></>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <p className="text-[10px] text-muted-foreground mt-3">أدخل -1 لعدد غير محدود من المنشورات</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ─── Super Admin Custom Upgrade & Invoice Dialog ─── */}
      <Dialog open={!!upgradeDialog} onOpenChange={() => setUpgradeDialog(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              ترقية وتخصيص باقة {upgradeDialog?.name}
            </DialogTitle>
            <DialogDescription>
              حدد نوع الباقة، حدود منشورات التوظيف، المواعيد والسعر مع خيار إصدار فاتورة رسمية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Select Plan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الباقة المستهدفة</Label>
              <Select value={selectedPlanId} onValueChange={handleSelectPlanChange}>
                <SelectTrigger><SelectValue placeholder="اختر باقة" /></SelectTrigger>
                <SelectContent>
                  {(plans || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name_ar} — ({p.price} ر.س) — {p.job_posts_limit === -1 ? "غير محدود" : `${p.job_posts_limit} منشور`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Job Limit & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">حد منشورات التوظيف (-1 لغير محدود)</Label>
                <Input
                  type="number"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(Number(e.target.value))}
                  min={-1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">مبلغ الاشتراك (ر.س)</Label>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            {/* Dates: starts_at and expires_at */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ بداية الاشتراك</Label>
                <Input
                  type="date"
                  value={startsAtDate}
                  onChange={(e) => setStartsAtDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ انتهاء الاشتراك</Label>
                <Input
                  type="date"
                  value={expiresAtDate}
                  onChange={(e) => setExpiresAtDate(e.target.value)}
                />
              </div>
            </div>

            {/* Issue Invoice Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
              <div>
                <Label className="text-sm font-bold">إصدار فاتورة تلقائية للشركة</Label>
                <p className="text-xs text-muted-foreground">سيتم حفظ الفاتورة برقم تسلسلي رسمياً لدى الشركة للتحميل والطباعة</p>
              </div>
              <Switch checked={shouldIssueInvoice} onCheckedChange={setShouldIssueInvoice} />
            </div>

            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11"
              disabled={!selectedPlanId || customUpgrade.isPending}
              onClick={handleExecuteUpgrade}
            >
              <CheckCircle2 className="w-5 h-5" />
              تأكيد التحديث وإصدار الفاتورة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Upgrade Confirmation Modal (Centered & Modern) ─── */}
      <AlertDialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <AlertDialogContent className="sm:max-w-[460px] p-6 text-right rounded-2xl border border-border/80 shadow-2xl bg-card" dir="rtl">
          <AlertDialogHeader className="space-y-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <X className="w-6 h-6 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
              تأكيد رفض طلب ترقية الباقة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
              هل أنت متأكد من رغبتك في رفض طلب ترقية الباقة المقدم من شركة <strong className="text-foreground">"{rejectDialog?.companyName}"</strong>؟
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium block mt-3 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                ⚠️ سيتم تحديث حالة الطلب إلى "مرفوض" وإشعار مسؤولي الشركة عبر الإشعارات الفورية في النظام.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-row gap-2 justify-end sm:space-x-0" dir="rtl">
            <AlertDialogCancel className="font-bold text-xs rounded-xl px-5 h-10 border-border hover:bg-muted">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectDialog) {
                  rejectUpgrade.mutate({
                    requestId: rejectDialog.requestId,
                    ownerUserId: rejectDialog.ownerUserId,
                  });
                  toast({ title: "تم رفض طلب الترقية وإشعار العميل" });
                  setRejectDialog(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold text-xs rounded-xl px-5 h-10 gap-1.5 shadow-md shadow-destructive/20"
            >
              <X className="w-3.5 h-3.5" />
              تأكيد الرفض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
