import { Link } from "react-router-dom";
import { Shield, ChevronLeft, Building2, GraduationCap, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-right p-6 md:p-12 space-y-8 max-w-4xl mx-auto" dir="rtl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="w-4 h-4 rotate-180" />
        العودة للرئيسية
      </Link>

      <div className="space-y-4 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
          <Shield className="w-4 h-4" />
          وثيقة حماية البيانات والسرية الرسمية
        </div>
        <h1 className="text-3xl font-black text-foreground">سياسة الخصوصية وحماية بيانات المعلمين والمدارس</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          تلتزم منصة Tawzeef-X بحماية خصوصية كافة المعلمين والمدارس الأهلية والعالمية المسجلة بالمنصة وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية ودول الخليج العربي.
        </p>
      </div>

      <div className="space-y-6 text-xs text-foreground leading-relaxed">
        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <Lock className="w-4 h-4" /> 1. سرية بيانات المعلمين والشهادات الأكاديمية
          </h3>
          <p className="text-muted-foreground">
            تخضع السير الذاتية والشهادات الأكاديمية والبيانات الشخصية للمعلمين المعروضة بالمنصة لأعلى درجات السرية. ولا يتم مشاركتها إلا مع المدارس والجهات التعليمية المعتمدة والمسجلة رسمياً بالمنصة التي يقدم المعلم على شواغرها.
          </p>
        </section>

        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 2. بيانات المدارس الأهلية والعالمية
          </h3>
          <p className="text-muted-foreground">
            تلتزم المنصة بعدم إفشاء أي معلومات خاصة بالسلم الراتبي أو الخطط التوسعية أو التفاصيل التشغيلية للمدارس الشريكة، وتقتصر البيانات المعلنة على المزايا وشروط الشاغر التعليمي المعلن عنه فقط.
          </p>
        </section>

        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <Shield className="w-4 h-4" /> 3. التشفير والأمان التقني (E2E)
          </h3>
          <p className="text-muted-foreground">
            نستخدم تقنيات التشفير بين الأطراف (Row-Level Security) وتأمين قواعد البيانات عبر خوادم آمنة تضمن منع الوصول غير المصرح به، وحماية رخص المعلمين المهنية والمستندات الرسمية.
          </p>
        </section>
      </div>
    </div>
  );
}
