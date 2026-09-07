import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useMySubscription, useSubscriptionPlans, useCanPostJob } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, ArrowUpRight, Calendar as CalendarIcon } from "lucide-react";
import BillingHistory from "@/components/BillingHistory";
import CheckoutModal from "@/components/CheckoutModal";

export default function SubscriptionSection() {
  const { t, locale } = useI18n();
  const { data: activeSub, isLoading: isSubLoading } = useMySubscription();
  const { data: plans, isLoading: isPlansLoading } = useSubscriptionPlans();
  const { used, limit, remaining } = useCanPostJob();
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    name: string;
    name_ar: string;
    price: number;
    limit: number;
  } | null>(null);

  if (isSubLoading || isPlansLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Resolve active plan detail
  const currentPlan =
    plans?.find(p =>
      p.id === activeSub?.plan_id ||
      p.name?.toLowerCase() === activeSub?.plan_id?.toLowerCase() ||
      p.name_ar === activeSub?.plan_id
    ) || (plans && plans.find(p => p.name === "free")) || null;

  const isFree = currentPlan?.name === "free" || currentPlan?.name_ar === "مجاني";
  const isPro = currentPlan?.name === "pro" || currentPlan?.name_ar === "احترافي";
  const isBasic = currentPlan?.name === "basic" || currentPlan?.name_ar === "أساسي";

  const nextPlans = plans?.filter(p => {
    if (isFree) return p.name !== "free" && p.name_ar !== "مجاني";
    if (isBasic) return p.name === "pro" || p.name_ar === "احترافي";
    return false; // Pro is already highest
  }) || [];




  const usagePercent = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-8">
      {/* Active Subscription Summary */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl border border-slate-800 p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-primary-foreground/60 uppercase tracking-wider">الباقة الحالية للشركة</span>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black">{currentPlan?.name_ar || "مجانية"}</h2>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                {activeSub?.status === "active" ? "نشط" : "منتهي"}
              </span>
            </div>
          </div>
          <Crown className="w-8 h-8 text-primary animate-bounce" />
        </div>

        {/* Usage meters */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs text-slate-300">
            <span>استهلاك منشورات التوظيف</span>
            <span>
              {limit === -1 ? "غير محدود" : `تم استهلاك ${used} من أصل ${limit} وظائف`}
            </span>
          </div>
          {limit !== -1 && (
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            {limit === -1 
              ? "باقة التوظيف الاحترافية تمنحك إمكانية نشر عدد غير محدود من الوظائف وجلب مرشحين بلا قيود."
              : `يتبقى لك إنشاء ${remaining} منشورات توظيف نشطة في الباقة الحالية.`}
          </p>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <span>تاريخ البدء: {new Date(activeSub?.starts_at || new Date()).toLocaleDateString("ar-SA")}</span>
          </div>
          <div>
            <span>الدفع القادم: {activeSub?.expires_at ? new Date(activeSub.expires_at).toLocaleDateString("ar-SA") : "تجديد تلقائي شهري"}</span>
          </div>
        </div>
      </div>

      {/* Available Upgrades */}
      {nextPlans.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">ترقية باقة الاشتراك</h3>
            <p className="text-xs text-muted-foreground mt-0.5">اختر الباقة المناسبة لزيادة منشورات التوظيف والاستفادة من مزايا الذكاء الاصطناعي الكاملة.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {nextPlans.map(plan => (
              <div key={plan.id} className="bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-foreground">{plan.name_ar}</h4>
                    <span className="text-sm font-black text-primary">{plan.price} SAR <span className="text-[10px] text-muted-foreground font-normal">/ شهرياً</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2 mb-5">
                    {plan.features.slice(0, 3).map((feat, fi) => (
                      <li key={fi} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={() => setSelectedPlan({
                    id: plan.id,
                    name: plan.name,
                    name_ar: plan.name_ar,
                    price: plan.price,
                    limit: plan.job_posts_limit
                  })}
                  className="w-full text-xs font-bold gap-1"
                  variant="outline"
                >
                  ترقية الآن
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing history component */}
      <BillingHistory />

      {selectedPlan && (
        <CheckoutModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          planNameAr={selectedPlan.name_ar}
          price={selectedPlan.price}
          limit={selectedPlan.limit}
        />
      )}
    </div>
  );
}
