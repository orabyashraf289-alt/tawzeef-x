import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Bot,
  Star,
  FileText,
  Calendar,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  Send
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";

interface CandidateQuickPeekDrawerProps {
  candidate: any | null;
  isOpen: boolean;
  onClose: () => void;
  stages: { id: string; label: string }[];
  onMoveStage?: (candidateId: string, newStage: string) => void;
}

export default function CandidateQuickPeekDrawer({
  candidate,
  isOpen,
  onClose,
  stages,
  onMoveStage,
}: CandidateQuickPeekDrawerProps) {
  const { locale, dir } = useI18n();
  const [selectedNewStage, setSelectedNewStage] = useState<string>("");

  if (!candidate) return null;

  const initials = candidate.name
    ? candidate.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : "?";

  const handleWhatsApp = () => {
    const cleanPhone = (candidate.phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast({
        title: locale === "en" ? "No phone number available" : "لا يوجد رقم هاتف مسجل لهذا المرشح",
        variant: "destructive",
      });
      return;
    }
    const message = encodeURIComponent(
      locale === "en"
        ? `Hello ${candidate.name}, this is regarding your application for the ${candidate.role || "position"} at TawzeefX.`
        : `السلام عليكم أ. ${candidate.name}، نتواصل معك بخصوص طلب تقديمك على وظيفة (${candidate.role || "المعلن عنها"}) عبر منصة توظيف X.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const handleStageChange = (newStage: string) => {
    setSelectedNewStage(newStage);
    if (onMoveStage) {
      onMoveStage(candidate.id, newStage);
      toast({
        title: locale === "en" ? "Candidate stage updated" : `تم نقل ${candidate.name} إلى مرحلة (${newStage})`,
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full sm:max-w-md p-0 overflow-y-auto"
        dir={dir}
      >
        {/* Header Profile Cover */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-primary/30 shadow-md">
                <AvatarFallback className="bg-primary/20 text-primary font-black text-base">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="text-base font-black text-foreground truncate">
                  {candidate.name}
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-muted-foreground truncate">
                  {candidate.role || (locale === "en" ? "Candidate" : "مرشح")}
                </SheetDescription>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className="text-[10px] font-bold border-primary/30 bg-primary/10 text-primary">
                    {candidate.stage || (locale === "en" ? "Applied" : "تقديم الطلب")}
                  </Badge>
                  {candidate.status && (
                    <Badge variant="outline" className="text-[10px]">
                      {candidate.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Direct Actions Toolbar */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>{locale === "en" ? "WhatsApp" : "مراسلة واتساب"}</span>
            </Button>
            {candidate.email ? (
              <a href={`mailto:${candidate.email}`}>
                <Button size="sm" variant="outline" className="h-8 w-full text-xs font-bold gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>{locale === "en" ? "Send Email" : "إرسال بريد"}</span>
                </Button>
              </a>
            ) : (
              <Button size="sm" variant="outline" disabled className="h-8 text-xs">
                {locale === "en" ? "No Email" : "لا يوجد بريد"}
              </Button>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-5 text-xs">
          {/* AI Scorecard Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-foreground flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-primary" />
                {locale === "en" ? "AI Evaluation Match" : "نسبة التطابق الذكي بالـ AI"}
              </span>
              <Badge
                className={
                  (candidate.ai_score ?? 0) >= 70
                    ? "bg-emerald-600 text-white font-mono"
                    : "bg-amber-600 text-white font-mono"
                }
              >
                {candidate.ai_score != null ? `${candidate.ai_score}%` : (locale === "en" ? "Not Scored" : "قيد التقييم")}
              </Badge>
            </div>
            {candidate.ai_score != null && (
              <Progress value={candidate.ai_score} className="h-2 rounded-full" />
            )}
            <p className="text-[10px] text-muted-foreground">
              {candidate.ai_score >= 80
                ? (locale === "en" ? "Excellent match with job specifications and required competencies." : "تطابق ممتاز ومتقدم مع متطلبات الوظيفة والكفاءات المحددة.")
                : (locale === "en" ? "Moderate match, review qualifications in detail." : "تطابق متوسط، يُنصح بمراجعة الخبرات والمهارات المكتسبة.")}
            </p>
          </div>

          {/* Quick Stage Mover */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-muted-foreground flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              {locale === "en" ? "Move to Stage Directly" : "نقل المرشح لمرحلة أخرى مباشرة"}
            </label>
            <Select
              value={selectedNewStage || candidate.stage || ""}
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl bg-card border-border">
                <SelectValue placeholder={locale === "en" ? "Select stage" : "اختر المرحلة"} />
              </SelectTrigger>
              <SelectContent>
                {stages.map((st) => (
                  <SelectItem key={st.id} value={st.id} className="text-xs">
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-2">
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
              {locale === "en" ? "Contact Info" : "بيانات التواصل"}
            </p>
            <div className="space-y-1.5">
              {candidate.email && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/50">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/50">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono">{candidate.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                {locale === "en" ? "Skills" : "المهارات المسجلة"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary / Cover Letter */}
          {(candidate.summary || candidate.cover_letter) && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                {locale === "en" ? "Professional Summary" : "الملخص المهني"}
              </p>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-muted-foreground text-[11px] whitespace-pre-wrap">
                {candidate.summary || candidate.cover_letter}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex flex-col gap-2">
            {candidate.resume_url && (
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {locale === "en" ? "View Full Resume / CV" : "فتح السيرة الذاتية (CV)"}
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </Button>
              </a>
            )}

            <Link to={`/candidates/${candidate.id}`} onClick={onClose}>
              <Button className="w-full h-9 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground">
                <User className="w-4 h-4" />
                {locale === "en" ? "Go to Full Candidate Profile" : "الانتقال لملف المرشح الشامل"}
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
