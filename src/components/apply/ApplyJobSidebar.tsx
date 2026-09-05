import { useState } from "react";
import {
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Share2,
  Check,
  Copy,
  DollarSign,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Gift,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import SARSymbol from "@/components/SARSymbol";
import type { JobCustomSpecs } from "@/lib/jobSpecsHelper";

interface ApplyJobSidebarProps {
  job: any;
  specs: JobCustomSpecs;
  hasSpecs: boolean;
  schoolDisplayName: string;
}

export default function ApplyJobSidebar({
  job,
  specs,
  hasSpecs,
  schoolDisplayName,
}: ApplyJobSidebarProps) {
  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "تم نسخ رابط التقديم بنجاح ✅" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `فرصة وظيفية مميزة: ${job?.title || "شاغر وظيفي"} لدى ${schoolDisplayName}.\nقدم الآن عبر الرابط: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      "_blank"
    );
  };

  const descriptionText = job?.description || "";
  const isLongDesc = descriptionText.length > 250;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Main Job Overview Card */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/70 p-6 shadow-lg space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-indigo-500" />

        {/* Company / Institution Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs font-bold text-lg">
            {schoolDisplayName.slice(0, 1) || "T"}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground truncate">{schoolDisplayName}</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-primary" />
              <span>{job?.department || "القسم العام"}</span>
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs">
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block">الموقع</span>
              <span className="font-bold text-foreground truncate block">{job?.location || "الرياض"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block">نوع الدوام</span>
              <span className="font-bold text-foreground truncate block">{job?.type || "دوام كامل"}</span>
            </div>
          </div>

          {(job?.salary_min || job?.salary_max) && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2 col-span-2">
              <SARSymbol className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground block">الراتب المتوقع</span>
                <span className="font-bold text-foreground font-mono">
                  {job.salary_min ? job.salary_min.toLocaleString() : ""}
                  {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ""} ريال / شهر
                </span>
              </div>
            </div>
          )}

          {job?.experience_level && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2 col-span-2">
              <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground block">مستوى الخبرة المطلوب</span>
                <span className="font-bold text-foreground truncate block">{job.experience_level}</span>
              </div>
            </div>
          )}
        </div>

        {/* Job Description */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            <span>نبذة عن الشاغر والمسؤوليات:</span>
          </h4>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {isLongDesc && !descExpanded ? `${descriptionText.slice(0, 240)}...` : descriptionText}
          </div>
          {isLongDesc && (
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              {descExpanded ? (
                <>عرض أقل <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>قراءة المزيد <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>

        {/* Requirements Pills */}
        {Array.isArray(job?.requirements) && job.requirements.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>المتطلبات والشروط:</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground pr-2">
              {job.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Adaptive Custom Specs (if present) */}
        {hasSpecs && (
          <div className="space-y-2.5 pt-3 border-t border-border/50 text-xs">
            {specs.school_type && (
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">نوع المنشأة:</span>
                <span className="font-bold text-foreground">{specs.school_type}</span>
              </div>
            )}
            {specs.curriculum && (
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">المنهج / النظام:</span>
                <span className="font-bold text-foreground">{specs.curriculum}</span>
              </div>
            )}
            {specs.grade_level && (
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">المرحلة:</span>
                <span className="font-bold text-foreground">{specs.grade_level}</span>
              </div>
            )}
            {specs.working_hours && (
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">ساعات العمل:</span>
                <span className="font-bold text-foreground">{specs.working_hours}</span>
              </div>
            )}
            {specs.benefits_package && (
              <div className="pt-1">
                <span className="font-bold text-primary flex items-center gap-1 mb-1">
                  <Gift className="w-3 h-3" /> المزايا والبدلات:
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed bg-primary/5 p-2 rounded-xl border border-primary/15">
                  {specs.benefits_package}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Share Section */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <span className="text-[11px] font-bold text-muted-foreground block text-center">
            شارك هذه الفرصة الوظيفية:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="h-8 text-[11px] font-bold gap-1 rounded-xl text-green-600 border-green-500/30 hover:bg-green-500/10"
            >
              واتساب
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLinkedIn}
              className="h-8 text-[11px] font-bold gap-1 rounded-xl text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
            >
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-[11px] font-bold gap-1 rounded-xl text-foreground"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "تم النسخ" : "نسخ"}
            </Button>
          </div>
        </div>
      </div>

      {/* Trust & Verification Badge */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div className="text-xs">
          <p className="font-bold text-emerald-700 dark:text-emerald-300">توظيف موثق وآمن 🇸🇦</p>
          <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
            يتم فحص الطلبات ومطابقتها وفق أعلى معايير الخصوصية والأمان عبر منصة Tawzeef-X.
          </p>
        </div>
      </div>
    </div>
  );
}
