import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  Briefcase, MapPin, Clock, DollarSign, ChevronRight, CheckCircle2,
  Upload, FileText, Star, User, Mail, Phone, Calendar, Sparkles,
  Share2, ShieldCheck, Building2, Award, Check, Copy, FileCheck, X,
  ArrowRight, Layers, Sparkle, Heart
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import SARSymbol from "@/components/SARSymbol";
import { validateFile } from "@/lib/fileValidation";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── Form Field Wrapper ───────── */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-foreground/90 flex items-center justify-between">
        <span>{label} {required && <span className="text-destructive font-black">*</span>}</span>
      </Label>
      {children}
    </div>
  );
}

/* ───────── Meta Hero Badge ───────── */
function HeroBadge({ icon: Icon, children, variant = "default" }: { icon: any; children: React.ReactNode; variant?: "default" | "accent" | "purple" | "emerald" }) {
  const styles = {
    default: "bg-white/10 text-white border-white/15 hover:bg-white/20",
    accent: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    emerald: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    purple: "bg-purple-500/20 text-purple-200 border-purple-500/30",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all shadow-xs", styles[variant])}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

/* ───────── Success Screen ───────── */
function SuccessScreen({ job, trackingCode }: { job: any; trackingCode: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    toast({ title: "تم نسخ الرقم المرجعي بنجاح ✅" });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-xl w-full text-center space-y-6"
      >
        {/* Animated Celebration Badge */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30 border border-emerald-400/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border/80 shadow-2xl p-8 sm:p-10 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
          
          <div className="flex justify-center mb-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">تم إرسال طلبك بنجاح! 🎉</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              شكراً لاهتمامك بالانضمام إلى فريقنا المتميز لوظيفة <span className="font-bold text-foreground">{job?.title}</span>. تم تسجيل طلبك وسيقوم فريق الموارد البشرية بمراجعته والتواصل معك قريبًا.
            </p>
          </div>

          {trackingCode && (
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 space-y-3 relative group">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider">الرقم المرجعي الخاص بطلبك</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-[6px] font-mono select-all">
                  {trackingCode}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-9 px-3 gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">تستطيع استخدام هذا الرقم لمتابعة حالة طلبك في أي وقت.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/portal" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-7 h-11 font-bold shadow-md gap-2">
                <FileCheck className="w-4 h-4" />
                تتبع حالة طلبك
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto rounded-xl h-11 border-border text-muted-foreground hover:text-foreground">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────── Main Application Page ───────── */
export default function ApplyJob() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    coverLetter: "",
    specialty: ""
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("jobs").select("*").eq("id", id).single().then(({ data, error }) => {
      if (!error) setJob(data);
      setLoading(false);
    });
  }, [id]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    let completed = 0;
    const totalFields = 6; // Name, Email, Phone, Experience, Skills/Resume, CoverLetter
    if (form.name.trim()) completed++;
    if (form.email.trim()) completed++;
    if (form.phone.trim()) completed++;
    if (form.experience.trim()) completed++;
    if (resumeFile || skills.length > 0) completed++;
    if (form.coverLetter.trim() || form.specialty.trim()) completed++;
    return Math.round((completed / totalFields) * 100);
  }, [form, resumeFile, skills]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-muted-foreground">جاري تحميل الوظيفة ونموذج التقديم...</p>
    </div>
  );

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 bg-card rounded-3xl border border-border p-10 shadow-lg max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">الوظيفة المطلوبة غير متاحة حالياً</h1>
          <p className="text-xs text-muted-foreground">ربما تم إغلاق الوظيفة أو انتهاء فترة استقبال الطلبات.</p>
          <Link to="/" className="inline-block mt-2">
            <Button variant="outline" className="rounded-xl text-xs gap-2">
              <ArrowRight className="w-4 h-4" /> العودة للصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) return <SuccessScreen job={job} trackingCode={trackingCode} />;

  const salaryText = job.salary_min && job.salary_max
    ? `${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}`
    : null;

  const handleShareJob = () => {
    if (navigator.share) {
      navigator.share({ title: job.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم نسخ رابط الوظيفة ✅" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة الأساسية", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let resumeUrl: string | null = null;

    if (resumeFile) {
      setUploading(true);
      const ext = (resumeFile.name.split(".").pop() || "").toLowerCase();
      const filePath = `applications/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, resumeFile);
      setUploading(false);
      if (uploadError) {
        toast({ title: "خطأ في رفع السيرة الذاتية", description: uploadError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      resumeUrl = filePath;
    }

    const { error } = await supabase.from("applications").insert({
      job_id: id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      experience: form.experience || null,
      cover_letter: form.coverLetter || null,
      resume_url: resumeUrl,
      skills: skills.length > 0 ? skills : null,
      specialty: form.specialty || null,
    } as any);

    if (error) {
      toast({ title: "خطأ في إرسال الطلب", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    toast({ title: "تم إرسال طلبك بنجاح ✅" });

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-application-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          applicant_email: form.email,
          applicant_name: form.name,
          job_id: id,
          job_title: job.title,
        }),
      });
      const result = await res.json();
      if (result.tracking_code) setTrackingCode(result.tracking_code);
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  };

  const inputClass = "h-11 rounded-xl border-border/80 bg-card focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-xs sm:text-sm font-medium placeholder:text-muted-foreground/50 shadow-2xs";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* ── Navbar ── */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
            <span className="font-extrabold text-base tracking-tight text-foreground">تطبيق توظيف X</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareJob}
              className="h-9 px-3 gap-1.5 text-xs font-bold border-border/80 hover:bg-muted"
            >
              <Share2 className="w-3.5 h-3.5" /> مشاركة الوظيفة
            </Button>
            <Link to="/portal">
              <Button size="sm" variant="ghost" className="h-9 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground">
                <FileCheck className="w-3.5 h-3.5" /> تتبع طلب سابق
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Glassmorphism Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-indigo-950 text-white py-12 sm:py-16">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
        
        {/* Glow orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> استقبال الطلبات مفتوح
                </span>
                {job.created_at && (
                  <span className="text-[11px] text-slate-400">
                    نُشرت بتاريخ {new Date(job.created_at).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {job.title}
              </h1>

              {/* Meta Pill Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {job.department && <HeroBadge icon={Briefcase} variant="default">{job.department}</HeroBadge>}
                {job.location && <HeroBadge icon={MapPin} variant="emerald">{job.location}</HeroBadge>}
                {job.type && <HeroBadge icon={Clock} variant="accent">{job.type}</HeroBadge>}
                {job.experience_level && <HeroBadge icon={Award} variant="purple">{job.experience_level}</HeroBadge>}
                {salaryText && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold backdrop-blur-md">
                    <DollarSign className="w-3.5 h-3.5" /> {salaryText} <SARSymbol className="w-3.5 h-3.5 inline-block ms-0.5" />
                  </span>
                )}
              </div>
            </div>

            {/* Direct Jump to Form Button for Mobile */}
            <div className="md:self-end">
              <a href="#apply-form">
                <Button className="w-full md:w-auto h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-500/25">
                  التقديم الآن على هذه الوظيفة
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Workspace ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Column: Application Form (7 cols) ── */}
          <div id="apply-form" className="lg:col-span-7 space-y-6">
            <div className="bg-card rounded-3xl border border-border/80 shadow-md p-6 sm:p-8 space-y-6 relative">
              
              {/* Form Header with Live Completion Meter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> نموذج تقديم الطلب
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">يرجى تعبئة بياناتك بدقة لزيادة فرصة قبولك للوظيفة</p>
                </div>

                {/* Progress Ring */}
                <div className="flex items-center gap-3 bg-muted/30 p-2 px-3 rounded-2xl border border-border/50 shrink-0">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-9 h-9 transform -rotate-90">
                      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="3" className="text-muted/40" fill="transparent" />
                      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="3" className="text-primary transition-all duration-500" strokeDasharray={88} strokeDashoffset={88 - (88 * completionPercentage) / 100} strokeLinecap="round" fill="transparent" />
                    </svg>
                    <span className="absolute text-[10px] font-black text-foreground">{completionPercentage}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-semibold">مستوى اكتمال الطلب</p>
                    <p className="text-xs font-bold text-primary">{completionPercentage === 100 ? "مكتمل وجاهز 🚀" : "جارِ التعبئة..."}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Name & Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="الاسم الكامل" required>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="أدخل اسمك الثلاثي"
                        className={cn(inputClass, "pr-10")}
                      />
                    </div>
                  </FormField>

                  <FormField label="البريد الإلكتروني" required>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="name@example.com"
                        dir="ltr"
                        className={cn(inputClass, "pl-10 text-left")}
                      />
                    </div>
                  </FormField>
                </div>

                {/* Row 2: Phone & Experience */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="رقم الجوال" required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                        className={cn(inputClass, "pl-10 text-left")}
                      />
                    </div>
                  </FormField>

                  <FormField label="سنوات الخبرة العملية">
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        value={form.experience}
                        onChange={e => setForm({ ...form, experience: e.target.value })}
                        placeholder="مثال: 4 سنوات في التطوير"
                        className={cn(inputClass, "pr-10")}
                      />
                    </div>
                  </FormField>
                </div>

                {/* Specialty */}
                <FormField label="التخصص الدقيق أو المجال">
                  <Input
                    value={form.specialty}
                    onChange={e => setForm({ ...form, specialty: e.target.value })}
                    placeholder="مثال: هندسة الحاسب، التسويق الرقمي، الرياضيات..."
                    className={inputClass}
                  />
                </FormField>

                {/* Interactive Skills */}
                <FormField label="المهارات التقنية والعملية (اضغط Enter للإضافة)">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const s = skillInput.trim();
                            if (s && !skills.includes(s)) {
                              setSkills([...skills, s]);
                              setSkillInput("");
                            }
                          }
                        }}
                        placeholder="اكتب اسم مهارة (مثال: React, Python) واضغط Enter"
                        className={inputClass}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-11 rounded-xl px-4 text-xs font-bold border-border/80"
                        onClick={() => {
                          const s = skillInput.trim();
                          if (s && !skills.includes(s)) {
                            setSkills([...skills, s]);
                            setSkillInput("");
                          }
                        }}
                      >
                        إضافة
                      </Button>
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.map(s => (
                          <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 animate-in fade-in-50">
                            {s}
                            <button
                              type="button"
                              onClick={() => setSkills(skills.filter(x => x !== s))}
                              className="text-primary/70 hover:text-destructive transition-colors font-black"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* Resume Upload Dropzone */}
                <FormField label="السيرة الذاتية (CV)">
                  <label className={cn(
                    "flex flex-col sm:flex-row items-center gap-4 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group",
                    resumeFile
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-border/80 hover:border-primary/50 hover:bg-primary/5"
                  )}>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                      resumeFile
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                    )}>
                      <Upload className="w-5 h-5" />
                    </div>

                    <div className="flex-1 text-center sm:text-right min-w-0">
                      {resumeFile ? (
                        <div>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center justify-center sm:justify-start gap-1">
                            <FileCheck className="w-4 h-4" /> {resumeFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            الحجم: {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            اضغط لرفع السيرة الذاتية أو اسحب الملف هنا
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            الملفات المسموحة: PDF, DOC, DOCX — الحد الأقصى: 5 ميجابايت
                          </p>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file && !validateFile(file, "resume")) {
                          e.target.value = "";
                          return;
                        }
                        setResumeFile(file || null);

                        if (file) {
                          setParsing(true);
                          try {
                            const ext = file.name.split(".").pop();
                            const tmpPath = `tmp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                            const { error: upErr } = await supabase.storage.from("resumes").upload(tmpPath, file);
                            if (!upErr) {
                              const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(tmpPath);
                              const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                                },
                                body: JSON.stringify({ resumeUrl: urlData.publicUrl, applicantName: form.name }),
                              });
                              if (resp.ok) {
                                const parsed = await resp.json();
                                if (parsed.skills?.length) setSkills(prev => [...new Set([...prev, ...parsed.skills])]);
                                if (parsed.specialty && !form.specialty) setForm(f => ({ ...f, specialty: parsed.specialty }));
                                toast({ title: "تم تحليل السيرة الذاتية بالذكاء الاصطناعي ✨", description: `تم استخراج ${parsed.skills?.length || 0} مهارة` });
                              }
                            }
                          } catch (err) {
                            console.error("Resume parse error:", err);
                          }
                          setParsing(false);
                        }
                      }}
                    />
                  </label>

                  {resumeFile && (
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="text-xs text-destructive hover:underline font-bold mt-1.5 inline-flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> إزالة السيرة الذاتية
                    </button>
                  )}
                </FormField>

                {/* Cover Letter */}
                <FormField label="رسالة تعريفية أو نبذة عنك">
                  <Textarea
                    value={form.coverLetter}
                    onChange={e => setForm({ ...form, coverLetter: e.target.value })}
                    placeholder="اكتب نبذة مختصرة عن مؤهلاتك ولماذا تعتبر نفسك المرشح الأنسب للوظيفة..."
                    rows={4}
                    className="rounded-xl border-border/80 bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-xs sm:text-sm resize-none placeholder:text-muted-foreground/50"
                  />
                </FormField>

                {parsing && (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 p-3 rounded-xl border border-primary/20 animate-pulse">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    جاري استخراج البيانات والمهارات من السيرة الذاتية عبر الذكاء الاصطناعي...
                  </div>
                )}

                {/* Submit Action */}
                <Button
                  type="submit"
                  disabled={submitting || uploading || parsing}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all hover:shadow-xl hover:shadow-emerald-600/35 border-0 gap-2 cursor-pointer disabled:opacity-60"
                >
                  {uploading ? (
                    "جاري رفع السيرة الذاتية..."
                  ) : submitting ? (
                    "جاري تقديم الطلب..."
                  ) : (
                    <>
                      إرسال الطلب الآن 🚀
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* ── Right Column: Structured Job Details (5 cols) ── */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. Job Description Card */}
            {job.description && (
              <div className="bg-card rounded-3xl border border-border/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">الوصف الوظيفي</h3>
                    <p className="text-[11px] text-muted-foreground">تفاصيل وحيثيات هذه الفرصة الوظيفية</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </div>
            )}

            {/* 2. Requirements Card */}
            {job.requirements && (
              <div className="bg-card rounded-3xl border border-border/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">المتطلبات والمؤهلات</h3>
                    <p className="text-[11px] text-muted-foreground">الشروط المطلوبة للقبول في الشاغر</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Array.isArray(job.requirements) ? (
                    job.requirements.map((req: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs text-foreground">
                        <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{req}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {job.requirements}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Job Highlights & Safety Badge */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-3xl border border-emerald-500/20 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">توظيف رسمي وموثق</h4>
                  <p className="text-[10px] text-muted-foreground">يتم استقبال ومعالجة كافة الطلبات بأعلى معايير الخصوصية والأمان عبر منصة Tawzeef-X.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-card/60 mt-12 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-5 h-5 object-contain" />
            <span>نظام التوظيف الذكي — Tawzeef-X</span>
          </div>
          <p className="text-[11px]">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
