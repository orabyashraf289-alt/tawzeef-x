import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Clock, Circle, Briefcase, MapPin, ArrowLeft, Shield, Star, Brain  } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import CandidateChatbot from "@/components/candidate-portal/CandidateChatbot";
import { supabase } from "@/integrations/supabase/client";

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
  const [candidates, setCandidates] = useState<CandidateResult[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Auto load tracking code from URL query parameter (?code=XYZ)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setSearchType("tracking");
      setInput(code.trim());
      // Trigger search using a timeout to allow component to render
      setTimeout(() => {
        const btn = document.querySelector("button.gap-2") as HTMLButtonElement;
        if (btn) btn.click();
      }, 300);
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!input.trim()) {
      toast({ title: "يرجى إدخال رمز التتبع أو البريد الإلكتروني", variant: "destructive" });
      return;
    }

    const cleanInput = input.trim();
    setIsLoading(true);
    setSearched(true);
    setEmailSent(false);
    setCandidates(null);

    let foundCandidates: CandidateResult[] = [];

    // 1. Try remote Edge Function first
    try {
      const body = searchType === "tracking"
        ? { trackingCode: cleanInput }
        : { email: cleanInput };

      const resp = await fetch(PORTAL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (searchType === "email") {
          setEmailSent(true);
          toast({ title: "تم الإرسال 📧", description: data.message });
          setIsLoading(false);
          return;
        } else if (data.candidates && data.candidates.length > 0) {
          foundCandidates = data.candidates;
        }
      }
    } catch (e) {
      console.warn("Candidate portal edge function warning, falling back to direct database query:", e);
    }

    // 2. Direct Database Fallback Search if Edge Function returns no results
    if (foundCandidates.length === 0) {
      try {
        let candQuery = supabase.from("candidates").select("*, jobs(title)");
        let appQuery = supabase.from("applications").select("*, jobs(title)");

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);

        if (searchType === "tracking") {
          if (isUuid) {
            candQuery = candQuery.or(`tracking_code.ilike.${cleanInput},id.eq.${cleanInput}`);
            appQuery = appQuery.or(`tracking_code.ilike.${cleanInput},id.eq.${cleanInput}`);
          } else {
            candQuery = candQuery.ilike("tracking_code", cleanInput);
            appQuery = appQuery.ilike("tracking_code", cleanInput);
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
          aiScore: c.ai_score || null,
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            تسجيل الدخول
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">بوابة المرشح</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            تابع حالة طلبك ومراحل التوظيف باستخدام رمز التتبع أو بريدك الإلكتروني
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          {/* Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50 mb-4 w-fit mx-auto">
            {[
              { key: "tracking" as const, label: "رمز التتبع" },
              { key: "email" as const, label: "البريد الإلكتروني" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setSearchType(t.key); setInput(""); }}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  searchType === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Input
              placeholder={searchType === "tracking" ? "أدخل رمز التتبع (مثال: A1B2C3D4)" : "أدخل بريدك الإلكتروني"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="text-center text-lg tracking-wider"
              dir="ltr"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2 px-6">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              بحث
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {emailSent && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-card border border-border/50 rounded-2xl text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-2xl">📧</div>
              <h3 className="font-bold text-lg text-foreground">تم إرسال بريد إلكتروني بنجاح</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                إذا كان بريدك الإلكتروني مسجلاً في النظام، فقد أرسلنا إليك رسالة تحتوي على رموز التتبع الخاصة بك مع روابط الدخول المباشر. يرجى التحقق من صندوق الوارد والبريد المهمل (Spam).
              </p>
            </motion.div>
          )}

          {searched && !isLoading && !candidates && !emailSent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 bg-card rounded-2xl border border-border/50">
              <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-foreground font-semibold">لم يتم العثور على نتائج</p>
              <p className="text-sm text-muted-foreground mt-1">تأكد من رمز التتبع وحاول مرة أخرى</p>
            </motion.div>
          )}

          {candidates && candidates.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {candidates.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-l from-primary/5 to-primary/10 p-5 border-b border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{c.name}</h2>
                        {c.role && <p className="text-sm text-muted-foreground mt-0.5">{c.role}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.aiScore != null && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <Brain className="w-3.5 h-3.5" />
                            {c.aiScore}%
                          </span>
                        )}
                        <span className={cn("px-3 py-1 rounded-lg text-xs font-bold", statusStyles[c.status] || "bg-muted text-muted-foreground")}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      {c.jobTitle && (
                        <span className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg">
                          <Briefcase className="w-3 h-3" />{c.jobTitle}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />تقدم في {new Date(c.appliedAt).toLocaleDateString("ar-SA")}
                      </span>
                      <span className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg font-mono text-[11px]" dir="ltr">
                        🔑 {c.trackingCode}
                      </span>
                    </div>
                  </div>

                  {/* Pipeline Progress */}
                  <div className="p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4">مراحل التوظيف</h3>
                    <PipelineProgress currentStage={c.stage} stages={DEFAULT_STAGES} />
                  </div>

                  {(() => {
                    const skillsArray = Array.isArray(c.skills)
                      ? c.skills
                      : typeof c.skills === "string"
                        ? (c.skills as string).split(",").map(s => s.trim()).filter(Boolean)
                        : [];
                    if (skillsArray.length === 0) return null;
                    return (
                      <div className="px-5 pb-5">
                        <div className="flex flex-wrap gap-1.5">
                          {skillsArray.map(skill => (
                            <span key={skill} className="px-2.5 py-1 rounded-lg bg-primary/5 text-primary text-xs font-medium border border-primary/10">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center text-xs text-muted-foreground space-y-1 pb-8">
          <p>رمز التتبع يتم إرساله عند تقديم طلبك</p>
          <p>للاستفسارات تواصل مع قسم الموارد البشرية</p>
        </motion.div>
      </main>
      <CandidateChatbot
        candidateData={candidates && candidates.length > 0 ? {
          name: candidates[0].name,
          stage: candidates[0].stage,
          status: candidates[0].status,
          role: candidates[0].role,
          jobTitle: candidates[0].jobTitle,
          appliedAt: candidates[0].appliedAt,
          trackingCode: candidates[0].trackingCode,
        } : null}
      />
    </div>
  );
}
