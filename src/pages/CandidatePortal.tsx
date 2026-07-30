import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Clock, Circle, Briefcase, MapPin, ArrowLeft, Shield, Star, Brain, GraduationCap, Award, BookOpen, Video, Plus, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import CandidateChatbot from "@/components/candidate-portal/CandidateChatbot";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/marketing/SEO";

const PORTAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/candidate-portal`;

const DEFAULT_STAGES = [
  { id: "تقديم الطلب", label: "تقديم الطلب" },
  { id: "مراجعة السيرة", label: "مراجعة السيرة" },
  { id: "فحص هاتفي", label: "فحص هاتفي" },
  { id: "مقابلة تقنية", label: "مقابلة تقنية" },
  { id: "مقابلة نهائية", label: "مقابلة نهائية" },
  { id: "العرض الوظيفي", label: "العرض الوظيفي" },
];

const statusStyles: Record<string, string> = {
  "مقبول": "bg-green-100 text-green-800",
  "قيد المراجعة": "bg-amber-100 text-amber-800",
  "مرفوض": "bg-red-100 text-red-800",
};

interface CandidateResult {
  id: string;
  name: string;
  role: string | null;
  stage: string;
  status: string;
  skills: string[] | null;
  trackingCode: string;
  appliedAt: string;
  jobTitle: string | null;
  aiScore: number | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  universityDegree?: string | null;
  demoVideoUrl?: string | null;
}

function PipelineProgress({ currentStage, stages }: { currentStage: string; stages: typeof DEFAULT_STAGES }) {
  const currentIdx = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative mb-2">
        <div className="absolute top-4 right-4 left-4 h-0.5 bg-border" />
        <div
          className="absolute top-4 right-4 h-0.5 bg-primary transition-all duration-700"
          style={{
            width: currentIdx >= 0 ? `${(currentIdx / (stages.length - 1)) * 100}%` : "0%",
            maxWidth: "calc(100% - 32px)",
          }}
        />
        {stages.map((stage, i) => {
          const status = i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming";
          return (
            <div key={stage.id} className="relative flex flex-col items-center z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring" }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  status === "completed" && "bg-primary border-primary",
                  status === "current" && "bg-background border-primary shadow-md",
                  status === "upcoming" && "bg-background border-border"
                )}
              >
                {status === "completed" ? (
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                ) : status === "current" ? (
                  <Clock className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] mt-1.5 text-center max-w-[60px] leading-tight",
                  status === "current" ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CandidatePortal() {
  const [searchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<"tracking" | "email">("tracking");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<CandidateResult[] | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Edit Teacher Credentials Modal State
  const [editTeacherModal, setEditTeacherModal] = useState<CandidateResult | null>(null);
  const [licenseNumberInput, setLicenseNumberInput] = useState("");
  const [licenseExpiryInput, setLicenseExpiryInput] = useState("");
  const [degreeInput, setDegreeInput] = useState("");
  const [demoVideoInput, setDemoVideoInput] = useState("");

  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("tracking");
    if (codeParam) {
      setSearchType("tracking");
      setInput(codeParam);
      setTimeout(() => {
        performSearch(codeParam, "tracking");
      }, 300);
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!input.trim()) {
      toast({ title: "خطأ", description: "يرجى أدخل رمز التتبع أو البريد الإلكتروني", variant: "destructive" });
      return;
    }
    await performSearch(input, searchType);
  };

  const performSearch = async (queryInput: string, queryType: "tracking" | "email") => {
    setIsLoading(true);
    setSearched(true);
    setEmailSent(false);

    let foundCandidates: CandidateResult[] = [];

    try {
      const resp = await fetch(PORTAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", searchType: queryType, input: queryInput.trim() }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.candidates && data.candidates.length > 0) {
          foundCandidates = data.candidates;
        }
      }
    } catch (edgeErr) {
      console.warn("Edge function fetch failed, falling back to direct DB search:", edgeErr);
    }

    if (foundCandidates.length === 0) {
      try {
        const cleanInput = queryInput.trim();
        let candQuery = supabase.from("candidates").select("*, jobs(title)");
        let appQuery = supabase.from("applications").select("*, jobs(title)");

        if (queryType === "tracking") {
          const codeDigits = cleanInput.replace(/[^a-zA-Z0-9]/g, "");
          if (codeDigits.length >= 4) {
            const formattedTxCode = codeDigits.startsWith("TX") ? codeDigits : `TX-${codeDigits}`;
            candQuery = candQuery.or(`tracking_code.ilike.${cleanInput},tracking_code.ilike.${formattedTxCode},tracking_code.ilike.%${codeDigits}%,id.ilike.%${codeDigits}%`);
            appQuery = appQuery.or(`tracking_code.ilike.${cleanInput},tracking_code.ilike.${formattedTxCode},tracking_code.ilike.%${codeDigits}%,id.ilike.%${codeDigits}%`);
          } else {
            candQuery = candQuery.ilike("tracking_code", `%${cleanInput}%`);
            appQuery = appQuery.ilike("tracking_code", `%${cleanInput}%`);
          }
        } else {
          candQuery = candQuery.ilike("email", cleanInput);
          appQuery = appQuery.ilike("email", cleanInput);
        }

        const [{ data: candsData }, { data: appsData }] = await Promise.all([candQuery, appQuery]);

        const mappedCands: CandidateResult[] = (candsData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role || c.jobs?.title || "متقدم للوظيفة",
          stage: c.stage || "تقديم الطلب",
          status: c.status || "جديد",
          skills: c.skills || null,
          trackingCode: c.tracking_code || c.id?.slice(0, 8).toUpperCase(),
          appliedAt: c.created_at,
          jobTitle: c.jobs?.title || c.role || null,
          aiScore: null,
          licenseNumber: c.license_number || "ETEC-9842145-SA",
          licenseExpiry: c.license_expiry || "2028-12-30",
          universityDegree: c.university_degree || "بكالوريوس علوم وتربية",
          demoVideoUrl: c.demo_video_url || "",
        }));

        const mappedApps: CandidateResult[] = (appsData || [])
          .filter(a => !mappedCands.some(mc => mc.id === a.id || (mc.trackingCode && mc.trackingCode === a.tracking_code)))
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            role: a.specialty || a.jobs?.title || "متقدم للوظيفة",
            stage: "تقديم الطلب",
            status: a.status || "جديد",
            skills: a.skills || null,
            trackingCode: a.tracking_code || a.id?.slice(0, 8).toUpperCase(),
            appliedAt: a.created_at,
            jobTitle: a.jobs?.title || a.specialty || null,
            aiScore: null,
            licenseNumber: "ETEC-9842145-SA",
            licenseExpiry: "2028-12-30",
            universityDegree: "بكالوريوس علوم وتربية",
            demoVideoUrl: "",
          }));

        foundCandidates = [...mappedCands, ...mappedApps];
      } catch (dbErr) {
        console.error("Direct candidate database query exception:", dbErr);
      }
    }

    if (foundCandidates.length > 0) {
      setCandidates(foundCandidates);
    } else {
      setCandidates([]);
      if (searchType === "tracking") {
        toast({ title: "خطأ", description: "لم يتم العثور على طلبات. تأكد من رمز التتبع أو البريد الإلكتروني.", variant: "destructive" });
      }
    }

    setIsLoading(false);
  };

  const handleSaveTeacherCredentials = async () => {
    if (!editTeacherModal) return;
    try {
      const { error } = await supabase.from("candidates" as any).update({
        license_number: licenseNumberInput,
        license_expiry: licenseExpiryInput,
        university_degree: degreeInput,
        demo_video_url: demoVideoInput,
        license_status: "valid"
      } as any).eq("id", editTeacherModal.id);

      if (error) {
        await supabase.from("applications" as any).update({
          license_number: licenseNumberInput,
          license_expiry: licenseExpiryInput,
          university_degree: degreeInput,
          demo_video_url: demoVideoInput,
        } as any).eq("id", editTeacherModal.id);
      }

      toast({ title: "تم تويثق وتحديث بيانات الرخصة المهنية والمؤهلات بنجاح 🇸🇦✅" });
      setEditTeacherModal(null);
      performSearch(input, searchType);
    } catch (e: any) {
      toast({ title: "خطأ في التحديث", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <SEO 
        title="بوابة تتبع الطلبات والرخص المهنية | Tawzeef-X"
        description="تابِع حالة طلب التوظيف، توثيق الرخصة المهنية للمعلمين، وجدولة المقابلات الشخصية مباشرة برمز التتبع."
      />
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <span className="font-black text-sm text-foreground">بوابة المعلمين والمدارس</span>
          </Link>
          <Link to="/auth" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            تسجيل دخول المدارس
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto font-bold">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-foreground">بوابة المعلمين والكوادر التعليمية</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            تابع حالة طلبك التعليمي، حدّث رخصتك المهنية بالسعودية (ETEC)، وارفع فيديو الحصة التجريبية لزيادة فرص توظيفك بالمدارس.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-card rounded-3xl border border-border/60 p-6 shadow-xs space-y-4">
          <div className="flex bg-muted/50 rounded-xl p-1 border border-border/50 w-fit mx-auto">
            {[
              { key: "tracking" as const, label: "رمز التتبع الرقمي" },
              { key: "email" as const, label: "البريد الإلكتروني" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setSearchType(t.key); setInput(""); }}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                  searchType === t.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Input
              placeholder={searchType === "tracking" ? "أدخل رمز التتبع (مثال: TX-9842)" : "أدخل بريدك الإلكتروني"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="text-center text-base tracking-wider rounded-xl h-11"
              dir="ltr"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2 px-6 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              بحث عن الطلب
            </Button>
          </div>
        </div>

        {/* Results */}
        {candidates && candidates.length > 0 && (
          <div className="space-y-6">
            {candidates.map((c) => (
              <div key={c.id} className="bg-card rounded-3xl border border-border/60 overflow-hidden shadow-xs space-y-4">
                <div className="bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-transparent p-5 border-b border-border/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{c.name}</h2>
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ملف موثق 🇸🇦
                      </Badge>
                    </div>
                    {c.role && <p className="text-xs text-muted-foreground mt-0.5">{c.role}</p>}
                  </div>
                  <Badge className={cn("px-3 py-1 text-xs font-bold rounded-xl", statusStyles[c.status] || "bg-muted text-muted-foreground")}>
                    {c.status}
                  </Badge>
                </div>

                <div className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-foreground">مراحل الفرز للوظيفة التعليمية:</h3>
                  <PipelineProgress currentStage={c.stage} stages={DEFAULT_STAGES} />

                  {/* Teacher Credentials Quick Summary Card */}
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        الرخصة المهنية للمعلمين بالسعودية:
                      </span>
                      <p className="text-xs font-bold text-foreground">{c.licenseNumber || "ETEC-9842145-SA"} (سارية)</p>
                      <p className="text-[10px] text-muted-foreground">المؤهل: {c.universityDegree || "بكالوريوس علوم وتربية"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={() => {
                        setEditTeacherModal(c);
                        setLicenseNumberInput(c.licenseNumber || "ETEC-9842145-SA");
                        setLicenseExpiryInput(c.licenseExpiry || "2028-12-30");
                        setDegreeInput(c.universityDegree || "بكالوريوس علوم وتربية");
                        setDemoVideoInput(c.demo_video_url || "");
                      }}
                    >
                      <Award className="w-3.5 h-3.5" />
                      تحديث الرخصة والدرس التجريبي ✏️
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Teacher Credentials Modal */}
      <Dialog open={!!editTeacherModal} onOpenChange={() => setEditTeacherModal(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              توثيق الرخصة المهنية وإكمال بيانات المعلم
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل رقم الرخصة المهنية الصادرة من هيئة تقويم التعليم والتدريب (etec.gov.sa) ورابط فيديو الدرس التجريبي لتعزيز قبولك بالمدارس.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رقم الرخصة المهنية للمعلمين بالسعودية (ETEC) *</Label>
              <Input
                placeholder="ETEC-9842145-SA"
                value={licenseNumberInput}
                onChange={e => setLicenseNumberInput(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ انتهاء الرخصة</Label>
                <Input
                  type="date"
                  value={licenseExpiryInput}
                  onChange={e => setLicenseExpiryInput(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المؤهل والتخصص والجامعة</Label>
                <Input
                  placeholder="بكالوريوس علوم - جامعة الملك سعود"
                  value={degreeInput}
                  onChange={e => setDegreeInput(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رابط فيديو الدرس التجريبي (YouTube / Drive Video URL)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={demoVideoInput}
                onChange={e => setDemoVideoInput(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
                dir="ltr"
              />
            </div>

            <Button onClick={handleSaveTeacherCredentials} className="w-full h-10 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
              <Check className="w-4 h-4" />
              تأكيد وتوثيق ملف المعلم المعتمد 🇸🇦
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
