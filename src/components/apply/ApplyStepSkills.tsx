import { useState } from "react";
import {
  GraduationCap,
  Award,
  Sparkles,
  Plus,
  X,
  Check,
  Shield,
  ArrowLeft,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApplyStepSkillsProps {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  form: {
    universityDegree: string;
    major: string;
    universityName: string;
    gradYear: string;
    licenseNumber: string;
    licenseExpiry: string;
    licenseType: string;
  };
  onChange: (field: string, value: string) => void;
  suggestedJobSkills?: string[];
  isEducational?: boolean;
  onNext: () => void;
  onPrev: () => void;
}

const COMMON_DEGREES = [
  "بكالوريوس",
  "ماجستير",
  "دكتوراه",
  "دبلوم عالي",
  "دبلوم مهني",
  "ثانوية عامة أو ما يعادلها",
];

export default function ApplyStepSkills({
  skills,
  onSkillsChange,
  form,
  onChange,
  suggestedJobSkills = [],
  isEducational = false,
  onNext,
  onPrev,
}: ApplyStepSkillsProps) {
  const [skillInput, setSkillInput] = useState("");

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onSkillsChange([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onSkillsChange(skills.filter(s => s !== skillToRemove));
  };

  const handleAddSuggested = (skill: string) => {
    if (!skills.includes(skill)) {
      onSkillsChange([...skills, skill]);
    }
  };

  const inputClass = "h-11 rounded-xl border-border/70 bg-card/90 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all shadow-2xs";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-1.5 text-right">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
            الخطوة 3 من 5
          </Badge>
          <span className="text-xs text-muted-foreground">المهارات والمؤهلات الأكاديمية</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          المهارات، التعليم، والتراخيص المهنية 🎓
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          أبرز خبراتك التقنية والتخصصية لتسريع مطابقة ملفك مع متطلبات الوظيفة.
        </p>
      </div>

      <div className="space-y-6">
        {/* Skills Section */}
        <div className="bg-card/70 backdrop-blur-md rounded-3xl border border-border/70 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>المهارات والكفاءات الرئيسية:</span>
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              ({skills.length} مهارات مسجلة)
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب المهارة واضغط Enter (مثال: تحليل البيانات، إدارة المشاريع، React)..."
              className={inputClass}
            />
            <Button
              type="button"
              onClick={handleAddSkill}
              className="h-11 px-5 rounded-xl font-bold text-xs gap-1 shrink-0 bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </div>

          {/* Active Skills Chips */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-muted/40 border border-border/50">
              {skills.map((skill, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="rounded-xl px-3 py-1 text-xs gap-1.5 bg-card border border-border/60 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors group cursor-pointer shadow-2xs font-bold"
                  onClick={() => handleRemoveSkill(skill)}
                >
                  <span>{skill}</span>
                  <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
                </Badge>
              ))}
            </div>
          )}

          {/* Suggested Skills (from job requirements) */}
          {suggestedJobSkills.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground font-medium block">
                مهارات مقترحة تتطابق مع متطلبات هذا الشاغر (انقر للإضافة السريعة):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedJobSkills.map((s, i) => {
                  const alreadyAdded = skills.includes(s);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddSuggested(s)}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 ${
                        alreadyAdded
                          ? "bg-primary/10 text-primary border-primary/20 opacity-60 cursor-default"
                          : "bg-background hover:bg-primary/5 hover:border-primary text-foreground border-border/60 cursor-pointer shadow-2xs"
                      }`}
                    >
                      {alreadyAdded ? <Check className="w-3 h-3 text-primary" /> : <Plus className="w-3 h-3" />}
                      <span>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Education Details */}
        <div className="bg-card/70 backdrop-blur-md rounded-3xl border border-border/70 p-6 space-y-4 shadow-xs">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            <span>المؤهل الأكاديمي والتعليم:</span>
          </Label>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Degree Select */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">الدرجة العلمية:</Label>
              <Input
                value={form.universityDegree}
                onChange={e => onChange("universityDegree", e.target.value)}
                placeholder="مثال: بكالوريوس"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_DEGREES.slice(0, 4).map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onChange("universityDegree", deg)}
                    className="text-[10px] px-2 py-0.5 rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    {deg}
                  </button>
                ))}
              </div>
            </div>

            {/* Major */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">التخصص الدراسي:</Label>
              <Input
                value={form.major}
                onChange={e => onChange("major", e.target.value)}
                placeholder="مثال: علوم الحاسب / إدارة الأعمال / لغة إنجليزية"
                className={inputClass}
              />
            </div>

            {/* University Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">الجامعة أو المعهد:</Label>
              <Input
                value={form.universityName}
                onChange={e => onChange("universityName", e.target.value)}
                placeholder="مثال: جامعة الملك سعود"
                className={inputClass}
              />
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">سنة التخرج:</Label>
              <Input
                dir="ltr"
                value={form.gradYear}
                onChange={e => onChange("gradYear", e.target.value)}
                placeholder="مثال: 2022"
                className={cn(inputClass, "text-left font-mono")}
              />
            </div>
          </div>
        </div>

        {/* Adaptive Professional License / Certifications Section */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-background border border-primary/20 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>
                {isEducational
                  ? "بيانات الرخصة المهنية للمعلمين بالمملكة (ETEC / هيئة التقويم)"
                  : "التراخيص والشهادات المهنية المعتمدة (اختياري)"}
              </span>
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
              {isEducational ? "معتمد في السعودية 🇸🇦" : "ميزة تنافسية 🏆"}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                {isEducational ? "رقم الرخصة المهنية للمعلمين (ETEC):" : "اسم الشهادة أو الترخيص ورقم الاعتماد:"}
              </Label>
              <Input
                dir="ltr"
                value={form.licenseNumber}
                onChange={e => onChange("licenseNumber", e.target.value)}
                placeholder={isEducational ? "ETEC-9842145-SA" : "مثال: PMP-892147 أو ترخيص الهيئة..."}
                className={cn(inputClass, "font-mono text-left")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">تاريخ الانتهاء / سريان الترخيص:</Label>
              <Input
                type="date"
                value={form.licenseExpiry}
                onChange={e => onChange("licenseExpiry", e.target.value)}
                className={inputClass}
              />
            </div>
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
          onClick={onNext}
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2"
        >
          <span>متابعة: التفضيلات والرسالة</span>
          <ArrowLeft className="w-4 h-4 rotate-180 sm:rotate-0" />
        </Button>
      </div>
    </div>
  );
}
