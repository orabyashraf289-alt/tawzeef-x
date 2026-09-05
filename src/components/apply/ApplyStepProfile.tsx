import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Linkedin,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApplyStepProfileProps {
  form: {
    name: string;
    email: string;
    phone: string;
    location: string;
    currentTitle: string;
    experience: string;
    linkedinUrl: string;
    portfolioUrl: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ApplyStepProfile({
  form,
  onChange,
  onNext,
  onPrev,
}: ApplyStepProfileProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = "الاسم الكامل مطلوب";
    if (!form.email.trim()) newErrors.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "يرجى كتابة بريد إلكتروني صحيح";
    }
    if (!form.phone.trim()) newErrors.phone = "رقم الجوال مطلوب للتواصل";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const inputClass = "h-11 rounded-xl border-border/70 bg-card/90 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all shadow-2xs";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-1.5 text-right">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
            الخطوة 2 من 5
          </Badge>
          <span className="text-xs text-muted-foreground">البيانات الشخصية والمهنية</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          بيانات التواصل والملف المهني 👤
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          تحقق من صحة معلوماتك لنتمكن من التواصل معك وجدولة المقابلات.
        </p>
      </div>

      {/* Inputs Form Grid */}
      <div className="bg-card/70 backdrop-blur-md rounded-3xl border border-border/70 p-6 space-y-5 shadow-xs">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>الاسم الكامل</span>
              <span className="text-destructive font-black">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => onChange("name", e.target.value)}
              placeholder="مثال: محمد عبدالله الشمري"
              className={cn(inputClass, errors.name && "border-destructive focus:border-destructive")}
            />
            {errors.name && <p className="text-[10px] text-destructive font-bold">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>البريد الإلكتروني</span>
              <span className="text-destructive font-black">*</span>
            </Label>
            <Input
              type="email"
              dir="ltr"
              value={form.email}
              onChange={e => onChange("email", e.target.value)}
              placeholder="name@example.com"
              className={cn(inputClass, "text-left", errors.email && "border-destructive focus:border-destructive")}
            />
            {errors.email && <p className="text-[10px] text-destructive font-bold">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>رقم الجوال</span>
              <span className="text-destructive font-black">*</span>
            </Label>
            <Input
              dir="ltr"
              value={form.phone}
              onChange={e => onChange("phone", e.target.value)}
              placeholder="+966 5xxxxxxxx"
              className={cn(inputClass, "text-left font-mono", errors.phone && "border-destructive focus:border-destructive")}
            />
            {errors.phone && <p className="text-[10px] text-destructive font-bold">{errors.phone}</p>}
          </div>

          {/* City / Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>المدينة / مقر الإقامة الحالي</span>
            </Label>
            <Input
              value={form.location}
              onChange={e => onChange("location", e.target.value)}
              placeholder="مثال: الرياض، السعودية"
              className={inputClass}
            />
          </div>

          {/* Current Job Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span>المسمى الوظيفي الحالي / التخصص</span>
            </Label>
            <Input
              value={form.currentTitle}
              onChange={e => onChange("currentTitle", e.target.value)}
              placeholder="مثال: مهندس برمجيات أول / أخصائي موارد بشرية"
              className={inputClass}
            />
          </div>

          {/* Experience in Years */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>إجمالي سنوات الخبرة العملية</span>
            </Label>
            <Input
              value={form.experience}
              onChange={e => onChange("experience", e.target.value)}
              placeholder="مثال: 5 سنوات"
              className={inputClass}
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5 text-blue-500" />
              <span>رابط حساب LinkedIn (اختياري)</span>
            </Label>
            <Input
              dir="ltr"
              value={form.linkedinUrl}
              onChange={e => onChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className={cn(inputClass, "text-left font-mono")}
            />
          </div>

          {/* Portfolio / Website */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>رابط معرض الأعمال / GitHub / الموقع الشخصي</span>
            </Label>
            <Input
              dir="ltr"
              value={form.portfolioUrl}
              onChange={e => onChange("portfolioUrl", e.target.value)}
              placeholder="https://github.com/... أو رابط البورتفوليو"
              className={cn(inputClass, "text-left font-mono")}
            />
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between gap-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-11 px-6 rounded-2xl text-xs font-bold gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180 sm:rotate-0" />
          <span>السابق</span>
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2"
        >
          <span>متابعة: المهارات والمؤهلات</span>
          <ArrowLeft className="w-4 h-4 rotate-180 sm:rotate-0" />
        </Button>
      </div>
    </div>
  );
}
