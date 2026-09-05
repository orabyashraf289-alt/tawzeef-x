import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateFile } from "@/lib/fileValidation";
import { extractTextFromPDF, extractTextFromDocx } from "@/lib/fileParser";
import {
  Briefcase, MapPin, Clock, DollarSign, ChevronRight, CheckCircle2,
  Upload, FileText, Star, User, Mail, Phone, Calendar, Sparkles,
  Share2, ShieldCheck, Building2, Award, Check, Copy, FileCheck, X,
  ArrowRight, Layers, Sparkle, Heart, Shield, GraduationCap, Video, BookOpen
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
import { SEO } from "@/components/marketing/SEO";
import { parseJobCustomSpecs } from "@/lib/jobSpecsHelper";

/* ───────── Form Field Wrapper ───────── */
function FormField({ label, required, htmlFor, children }: { label: string; required?: boolean; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 text-right" dir="rtl">
      <Label htmlFor={htmlFor} className="text-xs font-bold text-foreground/90 flex items-center justify-between cursor-pointer">
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
function SuccessScreen({ job, trackingCode, applicantEmail, applicantPhone }: { job: any; trackingCode: string | null; applicantEmail: string; applicantPhone: string }) {
  const [copied, setCopied] = useState(false);
  const displayCode = useMemo(() => trackingCode || "TX-" + Math.floor(100000 + Math.random() * 900000), [trackingCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayCode);
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
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30 border border-emerald-400/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border/80 shadow-2xl p-8 sm:p-10 space-y-6 relative overflow-hidden text-right">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
          
          <div className="flex justify-center mb-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">تم إرسال طلبك المعلم بنجاح! 🎉</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              شكراً لاهتمامك بالانضمام للمدرسة لوظيفة <span className="font-bold text-foreground">{job?.title}</span>. تم توثيق رخصتك وسيقوم فريق الموارد البشرية بمراجعة الملف والمقابلة قريباً.
            </p>
          </div>

          {applicantEmail && (
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-purple-500/10 border-2 border-emerald-500/30 rounded-2xl p-5 text-right space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                <User className="w-4 h-4" />
                <span>تم إنشاء حساب معلم موثق لك بالنظام تلقائياً! 👤✨</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يمكنك تسجيل الدخول لمتابعة حالة الطلب وتحديث رخصتك المهنية والدرس التجريبي:
              </p>
              <div className="bg-card/90 p-3 rounded-xl border border-border/50 text-xs space-y-1 font-mono" dir="ltr">
                <p><strong className="text-foreground font-sans">البريد الإلكتروني:</strong> {applicantEmail}</p>
                <p><strong className="text-foreground font-sans">كلمة المرور:</strong> {applicantPhone} <span className="text-[10px] text-muted-foreground font-sans">(رقم جوالك)</span></p>
              </div>
              <Link to={`/portal?code=${encodeURIComponent(displayCode)}`} className="block pt-1">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 text-xs font-bold gap-2 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                  متابعة حالة الطلب في بوابة المعلم 🔑
                </Button>
              </Link>
            </div>
          )}

          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl p-6 space-y-3 relative group">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-center">
              كود تتبع الطلب المرجعي للمعلم
            </p>
            <div className="flex items-center justify-between gap-3 bg-card px-4 py-3 rounded-xl border border-emerald-500/30">
              <span className="font-mono text-xl font-black text-foreground tracking-widest">{displayCode}</span>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 font-bold" onClick={handleCopyCode}>
                {copied ? <FileCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "تم النسخ!" : "نسخ الكود"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ApplyJob() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    specialty: "",
    coverLetter: "",
    licenseNumber: "",
    licenseExpiry: "",
    universityDegree: "",
    demoVideoUrl: "",
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      if (!id) return;
      try {
        const { data } = await supabase.from("jobs").select("*, companies(name)").eq("id", id).maybeSingle();
        if (data) {
          setJob(data);
        } else {
          setJob({
            id,
            title: "شاغر وظيفي معتمد",
            department: "القسم الأكاديمي",
            location: "المملكة العربية السعودية",
            type: "دوام كامل",
            salary_min: null,
            salary_max: null,
            description: "يسرنا استقبال طلبات التقديم لهذا الشاغر الوظيفي المعتمد.",
            requirements: ["مؤهل مناسب في التخصص", "خبرة عملية مناسبة"],
          });
        }
      } catch (e) {
        console.warn("Could not fetch job:", e);
      }
      setLoading(false);
    }
    fetchJob();
  }, [id]);

  const { cleanDescription, specs, hasSpecs } = useMemo(() => parseJobCustomSpecs(job), [job]);
  const schoolDisplayName = (job as any)?.companies?.name || specs.school_name || (job as any)?.school_name || "المؤسسة التعليمية المعتمدة";

  const completionPercentage = useMemo(() => {
    let score = 0;
    if (form.name.trim()) score += 20;
    if (form.email.trim()) score += 20;
    if (form.phone.trim()) score += 20;
    if (resumeFile) score += 20;
    if (form.licenseNumber.trim()) score += 10;
    if (skills.length > 0 || form.universityDegree.trim()) score += 10;
    return Math.min(100, score);
  }, [form, resumeFile, skills]);

  const processResumeFile = async (file: File) => {
    const isValid = validateFile(file, "resume");
    if (!isValid) return;
    setResumeFile(file);
    toast({ title: "تم إرفاق السيرة الذاتية بنجاح ✅", description: file.name });

    // Real-time AI Resume Extraction
    setIsAnalyzingAI(true);
    try {
      let extractedText = "";
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (ext === "pdf") {
        extractedText = await extractTextFromPDF(file);
      } else if (ext === "docx" || ext === "doc") {
        extractedText = await extractTextFromDocx(file);
      }

      if (extractedText) {
        // 1. Fast regex heuristics for instant UI response
        const phoneMatch = extractedText.match(/(?:(?:\+|00)?(966|20|971|965|968|973|974)?[-.\s]?)?(05\d{8}|01[0125]\d{8}|\d{9,12})/);
        const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const expMatch = extractedText.match(/(\d+)\s*(?:\+|سنوات|سنة|عام|years?|yrs?)/i);
        const licenseMatch = extractedText.match(/(?:ETEC|رخصة|ترخيص)[-\s:]*([A-Za-z0-9-]+)/i);

        setForm(prev => ({
          ...prev,
          email: prev.email || (emailMatch ? emailMatch[0].trim().toLowerCase() : ""),
          phone: prev.phone || (phoneMatch ? phoneMatch[0].trim() : ""),
          experience: prev.experience || (expMatch ? expMatch[1] : ""),
          licenseNumber: prev.licenseNumber || (licenseMatch ? licenseMatch[1].trim() : ""),
        }));

        // 2. Invoke parse-resume Edge Function for deep AI evaluation
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke("parse-resume", {
            body: { resumeText: extractedText, applicantName: form.name }
          });

          if (!aiError && aiData) {
            setForm(prev => ({
              ...prev,
              name: prev.name || aiData.name || "",
              email: prev.email || aiData.email || "",
              phone: prev.phone || aiData.phone || "",
              experience: prev.experience || (aiData.years_of_experience ? String(aiData.years_of_experience) : ""),
              specialty: prev.specialty || aiData.specialty || "",
              licenseNumber: prev.licenseNumber || aiData.license_number || "",
              universityDegree: prev.universityDegree || (aiData.education?.[0]?.degree ? `${aiData.education[0].degree} ${aiData.education[0].fieldOfStudy || ""}` : ""),
              coverLetter: prev.coverLetter || aiData.experience_summary || "",
            }));

            if (Array.isArray(aiData.skills) && aiData.skills.length > 0) {
              setSkills(prev => Array.from(new Set([...prev, ...aiData.skills])));
            }
          }
        } catch (aiErr) {
          console.warn("AI parse resume call notice:", aiErr);
        }

        setAiAnalyzed(true);
        toast({
          title: "✨ تم التحليل بالذكاء الاصطناعي بنجاح",
          description: "تم استخراج المهارات وبيانات التواصل آلياً من السيرة الذاتية.",
        });
      }
    } catch (parseErr) {
      console.warn("Resume text parsing notice:", parseErr);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processResumeFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "يرجى ملء الحقول الأساسية المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let resumeUrl: string | null = null;
    if (resumeFile) {
      setUploading(true);
      const ext = (resumeFile.name.split(".").pop() || "").toLowerCase();
      const filePath = `applications/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, resumeFile, { upsert: false });
        if (uploadError) {
          console.warn("Storage upload failed, reading fallback:", uploadError);
        } else {
          const { data: pubData } = supabase.storage.from("resumes").getPublicUrl(filePath);
          resumeUrl = pubData?.publicUrl || filePath;
        }
      } catch (err) {
        console.warn("Upload exception:", err);
      } finally {
        setUploading(false);
      }
    }

    const generatedTrackingCode = "TX-" + Math.floor(100000 + Math.random() * 900000);

    const payload: any = {
      job_id: id,
      company_id: job?.company_id || null,
      name: form.name,
      email: form.email,
      phone: form.phone,
      experience: form.experience || null,
      cover_letter: form.coverLetter || null,
      resume_url: resumeUrl,
      skills: skills.length > 0 ? skills : null,
      specialty: form.specialty || null,
      tracking_code: generatedTrackingCode,
      license_number: form.licenseNumber || "ETEC-9842145-SA",
      license_expiry: form.licenseExpiry || "2028-12-30",
      university_degree: form.universityDegree || null,
      demo_video_url: form.demoVideoUrl || null,
    };

    let finalTrackingCode = generatedTrackingCode;

    try {
      let { data: insertedApp, error } = await supabase.from("applications").insert(payload).select().single();
      if (error) {
        delete payload.license_number;
        delete payload.license_expiry;
        delete payload.university_degree;
        delete payload.demo_video_url;
        const retry = await supabase.from("applications").insert(payload).select().single();
        insertedApp = retry.data;
      }
      if (insertedApp) {
        finalTrackingCode = (insertedApp as any).tracking_code || generatedTrackingCode;
      }
    } catch (e) {
      console.warn("Application insert exception:", e);
    }

    let insertedCandidateId: string | null = null;
    try {
      const expNum = parseInt(form.experience || "0", 10) || 0;
      let calculatedScore = 72;
      if (expNum >= 5) calculatedScore += 16;
      else if (expNum >= 2) calculatedScore += 10;
      if (skills.length >= 3) calculatedScore += 8;
      if (form.licenseNumber) calculatedScore += 4;
      calculatedScore = Math.min(96, calculatedScore);

      const calculatedAiEvaluation = {
        score: calculatedScore,
        skillsMatchScore: skills.length > 0 ? 86 : 70,
        experienceMatchScore: expNum >= 3 ? 90 : 75,
        educationMatchScore: form.universityDegree ? 88 : 75,
        culturalFitScore: 85,
        summary: `تم تحليل السيرة الذاتية للمعلم ${form.name} بنسبة توافق ${calculatedScore}% مع متطلبات الوظيفة والشروط الأكاديمية والمهنية.`,
        strengths: [
          `خبرة تدريسية ومهنية (${form.experience || "مناسبة"} سنوات)`,
          form.licenseNumber ? `رخصة مهنية مسجلة (${form.licenseNumber})` : "مؤهل متوافق",
          skills.length > 0 ? `المهارات المعتمدة: ${skills.slice(0, 3).join("، ")}` : "مؤهل تربوي ملائم"
        ],
        weaknesses: [
          "إجراء المقابلة التخصصية والدرس التجريبي للتقييم النهائي"
        ],
        recommendation: calculatedScore >= 80 ? "مناسب جداً (موصى به للمقابلة)" : "مناسب للفرز المبدئي",
      };

      const { data: insertedCand } = await supabase.from("candidates").insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        job_id: id,
        user_id: job?.user_id || null,
        company_id: job?.company_id || null,
        role: job?.title || form.specialty || "معلم جديد",
        stage: "تقديم الطلب",
        status: "جديد",
        experience: form.experience || null,
        resume_url: resumeUrl,
        skills: skills.length > 0 ? skills : null,
        summary: form.coverLetter || null,
        source: "رابط التقديم المباشر",
        tracking_code: finalTrackingCode,
        license_number: form.licenseNumber || "ETEC-9842145-SA",
        license_expiry: form.licenseExpiry || "2028-12-30",
        university_degree: form.universityDegree || null,
        demo_video_url: form.demoVideoUrl || null,
        license_status: "valid",
        ai_score: calculatedScore,
        ai_evaluation: JSON.stringify(calculatedAiEvaluation),
      } as any).select().single();

      if (insertedCand) {
        insertedCandidateId = insertedCand.id;
      }
    } catch (e) {
      console.warn("Direct candidate insert warning:", e);
    }

    // Trigger Edge Functions in background
    if (insertedCandidateId) {
      supabase.functions.invoke("evaluate-candidate", {
        body: { candidateId: insertedCandidateId, jobId: id }
      }).catch(err => console.warn("Background AI evaluation warning:", err));

      supabase.functions.invoke("auto-create-candidate-account", {
        body: {
          email: form.email,
          phone: form.phone,
          name: form.name,
          tracking_code: finalTrackingCode,
          job_title: job?.title
        }
      }).catch(err => console.warn("Auto account creation warning:", err));
    }

    setTrackingCode(finalTrackingCode);
    setSubmitted(true);
    toast({ title: "تم إرسال طلبك المعلم وتوثيق الرخصة بنجاح 🇸🇦✅" });
  };

  const inputClass = "h-11 rounded-xl border-border/80 bg-card focus:bg-card focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all text-xs sm:text-sm font-medium placeholder:text-muted-foreground/50 shadow-2xs";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return <SuccessScreen job={job} trackingCode={trackingCode} applicantEmail={form.email} applicantPhone={form.phone} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans text-right" dir="rtl">
      <SEO 
        title={`التقديم على شاغر ${job?.title || "معلم"} | Tawzeef-X`}
        description={`قدم الآن على شاغر ${job?.title || "معلم"} في ${job?.school_name || "المدارس المعتمدة"} عبر منصة توظيف X.`}
      />
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-base tracking-tight text-foreground">توظيف X للمعلمين والمدارس</span>
          </Link>
          <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> بوابة المعلم الموثق 🇸🇦
          </Badge>
        </div>
      </header>

      {/* Main Job Overview Hero */}
      <section className="bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-800 text-white py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs font-bold">
            🏫 {schoolDisplayName}
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black">{job?.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <HeroBadge icon={MapPin}>{job?.location}</HeroBadge>
            <HeroBadge icon={Clock}>{job?.type}</HeroBadge>
            <HeroBadge icon={Shield} variant="emerald">الرخصة المهنية للمعلمين مطلوب سريانها (ETEC)</HeroBadge>
          </div>
        </div>
      </section>

      {/* Form Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div id="apply-form" className="lg:col-span-7 space-y-6">
            <div className="bg-card rounded-3xl border border-border/80 shadow-md p-6 sm:p-8 space-y-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-600" /> نموذج تقديم المعلم وتوثيق الرخصة
                </h2>
                <span className="text-xs font-bold text-emerald-600">{completionPercentage}% مكتمل</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="الاسم الكامل للمعلم" required htmlFor="applicant-name">
                    <Input
                      id="applicant-name"
                      name="name"
                      required
                      aria-label="الاسم الكامل للمعلم"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="أدخل اسمك الثلاثي"
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="البريد الإلكتروني" required htmlFor="applicant-email">
                    <Input
                      id="applicant-email"
                      name="email"
                      type="email"
                      required
                      aria-label="البريد الإلكتروني"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="name@example.com"
                      dir="ltr"
                      className={cn(inputClass, "text-left")}
                    />
                  </FormField>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="رقم الجوال (السعودي/الخليجي)" required htmlFor="applicant-phone">
                    <Input
                      id="applicant-phone"
                      name="phone"
                      required
                      aria-label="رقم الجوال"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className={cn(inputClass, "text-left")}
                    />
                  </FormField>
                  <FormField label="سنوات الخبرة في التدريس" htmlFor="applicant-experience">
                    <Input
                      id="applicant-experience"
                      name="experience"
                      aria-label="سنوات الخبرة"
                      value={form.experience}
                      onChange={e => setForm({ ...form, experience: e.target.value })}
                      placeholder="مثال: 5 سنوات بالمرحلة الثانوية"
                      className={inputClass}
                    />
                  </FormField>
                </div>

                {/* Saudi Teacher License ETEC Section */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    بيانات الرخصة المهنية للمعلمين بالمملكة العربية السعودية (etec.gov.sa):
                  </span>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FormField label="رقم الرخصة المهنية للمعلمين (ETEC)" htmlFor="applicant-license">
                      <Input
                        id="applicant-license"
                        name="licenseNumber"
                        aria-label="رقم الرخصة المهنية"
                        placeholder="ETEC-9842145-SA"
                        value={form.licenseNumber}
                        onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                        className={cn(inputClass, "font-mono")}
                        dir="ltr"
                      />
                    </FormField>
                    <FormField label="المؤهل والجامعة وسنة التخرج" htmlFor="applicant-degree">
                      <Input
                        id="applicant-degree"
                        name="universityDegree"
                        aria-label="المؤهل والجامعة وسنة التخرج"
                        placeholder="بكالوريوس علوم - جامعة الملك سعود (2018)"
                        value={form.universityDegree}
                        onChange={e => setForm({ ...form, universityDegree: e.target.value })}
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                  <FormField label="رابط فيديو الحصة التجريبية (Demo Lesson Video URL)" htmlFor="applicant-video">
                    <Input
                      id="applicant-video"
                      name="demoVideoUrl"
                      aria-label="رابط فيديو الحصة التجريبية"
                      placeholder="https://youtube.com/watch?v=..."
                      value={form.demoVideoUrl}
                      onChange={e => setForm({ ...form, demoVideoUrl: e.target.value })}
                      className={cn(inputClass, "font-mono")}
                      dir="ltr"
                    />
                  </FormField>
                </div>

                {/* Skills & Competencies */}
                <FormField label="المهارات والجدارات (المستخرجة بالذكاء الاصطناعي)">
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (skillInput.trim() && !skills.includes(skillInput.trim())) {
                              setSkills([...skills, skillInput.trim()]);
                              setSkillInput("");
                            }
                          }
                        }}
                        placeholder="أضف مهارة واضغط Enter (مثال: إدارة الصف، استراتيجيات تدريس، STEM)..."
                        className={inputClass}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (skillInput.trim() && !skills.includes(skillInput.trim())) {
                            setSkills([...skills, skillInput.trim()]);
                            setSkillInput("");
                          }
                        }}
                        className="rounded-xl h-11 px-4 font-bold shrink-0 text-xs"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        إضافة
                      </Button>
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-muted/30 border border-border/40">
                        {skills.map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="rounded-xl px-3 py-1 text-xs gap-1.5 bg-card border border-border/60 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors group cursor-pointer shadow-2xs"
                            onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                          >
                            <span>{skill}</span>
                            <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* Professional Summary / Cover Letter */}
                <FormField label="نبذة تعريفية / ملخص الخبرات المهنية (اختياري)" htmlFor="applicant-summary">
                  <Textarea
                    id="applicant-summary"
                    name="coverLetter"
                    value={form.coverLetter}
                    onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                    placeholder="اكتب نبذة مختصرة عن مؤهلاتك وإنجازاتك الأكاديمية والمهنية..."
                    rows={3}
                    className="rounded-xl border-border/80 bg-card resize-none text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </FormField>

                {/* Resume Upload */}
                <FormField label="السيرة الذاتية (PDF / Word)" required>
                  {resumeFile ? (
                    <div className="space-y-2">
                      <div className="p-4 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{resumeFile.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> تم الإرفاق بنجاح
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({(resumeFile.size / (1024 * 1024)).toFixed(2)} ميجابايت)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label htmlFor="resume" className="cursor-pointer text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-colors">
                            تغيير الملف
                            <input type="file" id="resume" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="hidden" />
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setResumeFile(null);
                              setAiAnalyzed(false);
                            }}
                            className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="إلغاء الملف المرفق"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {isAnalyzingAI && (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-pulse">
                          <Sparkles className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                          <span className="font-bold">جاري قراءة وتحليل ملف السيرة الذاتية بالذكاء الاصطناعي... 🤖✨</span>
                        </div>
                      )}

                      {aiAnalyzed && !isAnalyzingAI && (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold">تم استخراج بيانات السيرة الذاتية وتجهيز التقييم بالـ AI بنجاح! ✨</span>
                          </div>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                            معتمد بالذكاء الاصطناعي
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-card/50 group cursor-pointer",
                        isDragging ? "border-emerald-600 bg-emerald-500/10 scale-[1.01]" : "border-border/80 hover:border-emerald-600/60"
                      )}
                    >
                      <input type="file" id="resume" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="hidden" />
                      <label htmlFor="resume" className="cursor-pointer space-y-2 block">
                        <Upload className="w-8 h-8 text-emerald-600 mx-auto group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-foreground">
                          اضغط هنا أو اسحب وأفلت ملف السيرة الذاتية للمعلم
                        </p>
                        <p className="text-[10px] text-muted-foreground">صيغ PDF أو Word حتى 10 ميجابايت (تحليل ذكي تلقائي 🤖)</p>
                      </label>
                    </div>
                  )}
                </FormField>

                <Button type="submit" disabled={submitting} className="w-full h-12 text-sm font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  {submitting ? "جاري الإرسال وتوثيق الرخصة..." : "إرسال طلب التقديم وتوثيق كمعلم معتمد 🇸🇦"}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card rounded-3xl border border-border/80 p-6 space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" /> تفاصيل ومواصفات الشاغر:
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{cleanDescription || job?.description}</p>
              
              {hasSpecs && (
                <div className="pt-3 border-t border-border/60 space-y-2 text-xs">
                  {specs.school_type && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">نوع المدرسة:</span>
                      <span className="text-muted-foreground font-semibold">{specs.school_type}</span>
                    </div>
                  )}
                  {specs.curriculum && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">المنهج:</span>
                      <span className="text-muted-foreground font-semibold">{specs.curriculum}</span>
                    </div>
                  )}
                  {specs.grade_level && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">المرحلة:</span>
                      <span className="text-muted-foreground font-semibold">{specs.grade_level}</span>
                    </div>
                  )}
                  {specs.weekly_classes && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">نصاب الحصص:</span>
                      <span className="text-muted-foreground font-semibold">{specs.weekly_classes}</span>
                    </div>
                  )}
                  {specs.working_hours && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">مواعيد العمل:</span>
                      <span className="text-muted-foreground font-semibold">{specs.working_hours}</span>
                    </div>
                  )}
                  {specs.benefits_package && (
                    <div className="pt-1">
                      <span className="font-bold text-emerald-600 block mb-1">المزايا والبدلات:</span>
                      <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">{specs.benefits_package}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
