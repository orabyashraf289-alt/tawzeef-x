import { Link } from "react-router-dom";
import { BookOpen, ChevronLeft, Building2, GraduationCap, CheckCircle2 } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-right p-6 md:p-12 space-y-8 max-w-4xl mx-auto" dir="rtl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="w-4 h-4 rotate-180" />
        العودة للرئيسية
      </Link>

      <div className="space-y-4 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
          <BookOpen className="w-4 h-4" />
          اتفاقية وشروط الخدمة والتوظيف التعليمي
        </div>
        <h1 className="text-3xl font-black text-foreground">شروط الاستخدام والخدمة لمنصة Tawzeef-X</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          تنظم هذه الشروط العلاقة بين المنصة، المدارس الأهلية والعالمية، والمعلمين والكوادر التعليمية المتقدمة للشواغر بالسعودية ودول الخليج.
        </p>
      </div>

      <div className="space-y-6 text-xs text-foreground leading-relaxed">
        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> 1. التزامات المعلم المتقدم
          </h3>
          <p className="text-muted-foreground">
            يتعهد المعلم بصحة كافة البيانات والمؤهلات الأكاديمية والرخص المهنية المدخلة بالمنصة، والالتزام بحضور الحصص التجريبية والمقابلات المحددة مع المدارس في مواعيدها.
          </p>
        </section>

        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 2. التزامات المدارس والجهات التعليمية
          </h3>
          <p className="text-muted-foreground">
            تتعهد المدرسة بالوضوح التام في الشاغر المعلن عنه من حيث المنهج، نصاب الحصص، الراتب، البدلات (سكن، نقل، تأمين طبي)، والتأشيرة، والوفاء بالعقود التعليمية المبرمة عبر المنصة.
          </p>
        </section>

        <section className="p-5 rounded-2xl bg-card border border-border/60 space-y-2 shadow-xs">
          <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> 3. العروض الوظيفية والعقود الرقمية
          </h3>
          <p className="text-muted-foreground">
            تُعد العروض الوظيفية التعليمية الملزمة والصادرة عبر المنصة وثائق رسمية فور توقيعها إلكترونياً بين طرفي التوظيف المعتمدين.
          </p>
        </section>
      </div>
    </div>
  );
}
