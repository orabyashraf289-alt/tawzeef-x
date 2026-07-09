import { useState } from "react";
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Package, Edit2, Save, X, Users, CreditCard, Building2, Crown, Infinity,
  CheckCircle2, AlertTriangle, Search, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      const companyIds = cos.map((c) => c.id);

      // Get all company owners
      const { data: members } = await supabase
        .from("company_members" as any)
        .select("company_id, user_id, member_role")
        .in("company_id", companyIds)
        .eq("member_role", "owner");

      const ownerUserIds = (members || []).map((m: any) => m.user_id);

      // Get owner profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", ownerUserIds);

      // Get subscriptions
      const { data: subs } = await supabase
        .from("company_subscriptions" as any)
        .select("*")
        .in("company_id", companyIds);

      // Get plans
      const { data: plans } = await supabase
        .from("subscription_plans" as any)
        .select("*");

      return cos.map((c) => {
        const member = (members || []).find((m: any) => m.company_id === c.id);
        const profile = member ? (profiles || []).find((p) => p.user_id === member.user_id) : null;
        const sub = (subs as any[] || []).find((s: any) => s.company_id === c.id);
        const plan = sub ? (plans as any[] || []).find((p: any) => p.id === sub.plan_id) : null;
        return {
          companyId: c.id,
          companyName: c.name || "شركة بدون اسم",
          ownerName: profile?.full_name || "بدون اسم مالك",
          joinedAt: c.created_at,
          subscription: sub,
          plan,
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

function useAssignSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, planId, jobPostsLimit }: { companyId: string; planId: string; jobPostsLimit: number }) => {
      // Check if company has a subscription row
      const { data: existing } = await supabase
        .from("company_subscriptions" as any)
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_subscriptions" as any)
          .update({ plan_id: planId, job_posts_limit: jobPostsLimit, job_posts_used: 0, status: "active", updated_at: new Date().toISOString() } as any)
          .eq("company_id", companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_subscriptions" as any)
          .insert({ company_id: companyId, plan_id: planId, job_posts_limit: jobPostsLimit, job_posts_used: 0, status: "active" } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      toast({ title: "تم تعيين الباقة بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

function useUpdateCompanyLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, jobPostsLimit }: { companyId: string; jobPostsLimit: number }) => {
      const { error } = await supabase
        .from("company_subscriptions" as any)
        .update({ job_posts_limit: jobPostsLimit, updated_at: new Date().toISOString() } as any)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      toast({ title: "تم تحديث الحد بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export default function AdminSubscriptionManager() {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: companies, isLoading: companiesLoading } = useCompaniesList();
  const updatePlan = useUpdatePlan();
  const assignSub = useAssignSubscription();
  const updateLimit = useUpdateCompanyLimit();

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, job_posts_limit: 0, name_ar: "" });
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState<{ companyId: string; name: string } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [editLimitDialog, setEditLimitDialog] = useState<{ companyId: string; name: string; current: number } | null>(null);
  const [newLimit, setNewLimit] = useState(0);

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditForm({ price: plan.price, job_posts_limit: plan.job_posts_limit, name_ar: plan.name_ar });
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    updatePlan.mutate({ planId: editingPlan.id, updates: editForm });
    setEditingPlan(null);
  };

  const filteredCompanies = (companies || []).filter(
    (c) => !search || c.companyName.includes(search) || c.ownerName.includes(search)
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

  return (
    <Tabs defaultValue="plans" dir="rtl">
      <TabsList className="mb-4">
        <TabsTrigger value="plans" className="gap-1.5"><Package className="w-3.5 h-3.5" />الباقات</TabsTrigger>
        <TabsTrigger value="companies" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />الشركات والاشتراكات</TabsTrigger>
      </TabsList>

      {/* ─── Plans Tab ─── */}
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

      {/* ─── Companies Tab ─── */}
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
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => {
                        setAssignDialog({ companyId: company.companyId, name: company.companyName });
                        setSelectedPlanId(company.plan?.id || "");
                      }}
                    >
                      <Package className="w-3.5 h-3.5" />تغيير الباقة
                    </Button>
                    {company.subscription && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => {
                          setEditLimitDialog({ companyId: company.companyId, name: company.companyName, current: company.subscription.job_posts_limit });
                          setNewLimit(company.subscription.job_posts_limit);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />تعديل الحد
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assign Plan Dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>تغيير باقة {assignDialog?.name}</DialogTitle>
              <DialogDescription>اختر الباقة الجديدة للشركة المحددة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="اختر باقة" /></SelectTrigger>
                <SelectContent>
                  {(plans || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name_ar} — {p.job_posts_limit === -1 ? "غير محدود" : `${p.job_posts_limit} منشور`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full gap-2 bg-primary text-primary-foreground font-bold"
                disabled={!selectedPlanId || assignSub.isPending}
                onClick={() => {
                  const plan = (plans || []).find((p) => p.id === selectedPlanId);
                  if (assignDialog && plan) {
                    assignSub.mutate({
                      companyId: assignDialog.companyId,
                      planId: plan.id,
                      jobPostsLimit: plan.job_posts_limit,
                    });
                    setAssignDialog(null);
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4" />تأكيد التغيير
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Limit Dialog */}
        <Dialog open={!!editLimitDialog} onOpenChange={() => setEditLimitDialog(null)}>
          <DialogContent className="sm:max-w-sm" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>تعديل حد منشورات شركة {editLimitDialog?.name}</DialogTitle>
              <DialogDescription>أدخل -1 لعدد غير محدود من منشورات التوظيف</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(Number(e.target.value))}
                min={-1}
              />
              <Button
                className="w-full gap-2 bg-primary text-primary-foreground font-bold"
                disabled={updateLimit.isPending}
                onClick={() => {
                  if (editLimitDialog) {
                    updateLimit.mutate({ companyId: editLimitDialog.companyId, jobPostsLimit: newLimit });
                    setEditLimitDialog(null);
                  }
                }}
              >
                <Save className="w-4 h-4" />حفظ التعديل
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
