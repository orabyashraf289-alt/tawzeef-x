import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Briefcase, MapPin, Clock, DollarSign, ChevronRight, CheckCircle, Upload, FileText, Star, ArrowLeft, User, Mail, Phone, Calendar, Sparkles  } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import SARSymbol from "@/components/SARSymbol";
import { validateFile } from "@/lib/fileValidation";

/* ───────── sub-components ───────── */

function JobInfoCard({ icon: Icon, iconBg, iconColor, title, children }: {
  icon: any; iconBg: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <h3 className="font-bold text-foreground text-[15px]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function MetaBadge({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 px-3.5 py-2 rounded-full border border-white/10 text-sm font-medium">
      <Icon className="w-4 h-4 text-accent-foreground opacity-80" />
      {children}
    </span>
  );
}

/* ───────── success screen ───────── */

function SuccessScreen({ job, trackingCode }: { job: any; trackingCode: string | null }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated success icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border shadow-lg p-8 space-y-5">
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          <h2 className="text-2xl font-extrabold text-foreground">تم إرسال طلبك بنجاح!</h2>
          <p className="text-muted-foreground leading-relaxed">
            شكراً لتقدمك لوظيفة <span className="font-semibold text-foreground">{job.title}</span>. سنتواصل معك قريباً.
          </p>

          {trackingCode && (
            <div className="bg-accent/10 border-2 border-accent/20 rounded-2xl p-6 space-y-3">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">الرقم المرجعي لطلبك</p>
              <p className="text-4xl font-black text-foreground tracking-[6px] font-mono">{trackingCode}</p>
              <p className="text-[11px] text-muted-foreground">تم إرسال هذا الرقم إلى بريدك الإلكتروني</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(trackingCode);
                  toast({ title: "تم نسخ الرقم المرجعي ✅" });
                }}
                className="text-xs text-accent hover:underline font-semibold mt-1 transition-colors"
              >
                📋 نسخ الرقم المرجعي
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-center pt-3">
            <Link to="/portal">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 h-11 font-bold shadow-md">
                تتبع طلبك
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-xl h-11 border-border text-muted-foreground hover:text-foreground">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── main page ───────── */

export default function ApplyJob() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", coverLetter: "", specialty: "" });
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 bg-card rounded-3xl border border-border p-10 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">الوظيفة غير موجودة</h1>
          <Link to="/" className="text-primary hover:underline text-sm font-medium">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  if (submitted) return <SuccessScreen job={job} trackingCode={trackingCode} />;

  const salaryText = job.salary_min && job.salary_max
    ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let resumeUrl: string | null = null;

    if (resumeFile) {
      setUploading(true);
      const ext = (resumeFile.name.split(".").pop() || "").toLowerCase();
      // Bucket policy: anonymous uploads must live under applications/ and be .pdf/.doc/.docx
      const filePath = `applications/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, resumeFile);
      setUploading(false);
      if (uploadError) {
        toast({ title: "خطأ في رفع السيرة الذاتية", description: uploadError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      // Bucket is private: store the object path; viewers will request a signed URL
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

  const inputClass = "h-11 rounded-xl border-border bg-secondary/50 focus:bg-card focus:border-primary focus:ring-primary/20 transition-all text-[15px] placeholder:text-muted-foreground/50";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Hero ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-accent/80" />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
        {/* Decorative orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent/20 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-8 transition-colors group">
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            العودة للرئيسية
          </Link>

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 p-2 shadow-lg">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-2.5">
                <MetaBadge icon={Briefcase}>{job.department}</MetaBadge>
                <MetaBadge icon={MapPin}>{job.location}</MetaBadge>
                <MetaBadge icon={Clock}>{job.type}</MetaBadge>
                {salaryText && (
                  <span className="flex items-center gap-1.5 bg-accent/20 backdrop-blur-sm text-white px-3.5 py-2 rounded-full border border-accent/30 text-sm font-bold">
                    <DollarSign className="w-4 h-4" />{salaryText} <SARSymbol className="w-4 h-4 inline-block" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 relative z-10 pb-12">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">

          {/* ── Form (Main) ── */}
          <div className="lg:col-span-3 order-1 lg:order-1">
            <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
              {/* Form header */}
              <div className="px-7 py-6 border-b border-border bg-gradient-to-l from-accent/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">نموذج التقديم</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">الحقول المميزة بـ <span className="text-destructive">*</span> مطلوبة</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-7 space-y-6">
                {/* Row 1 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="الاسم الكامل" required>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="أدخل اسمك الكامل" className={cn(inputClass, "pr-10")} />
                    </div>
                  </FormField>
                  <FormField label="البريد الإلكتروني" required>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="example@email.com" dir="ltr" className={cn(inputClass, "pl-10 text-left")} />
                    </div>
                  </FormField>
                </div>

                {/* Row 2 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="رقم الجوال" required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="05xxxxxxxx" dir="ltr" className={cn(inputClass, "pl-10 text-left")} />
                    </div>
                  </FormField>
                  <FormField label="سنوات الخبرة">
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}
                        placeholder="مثال: 3 سنوات" className={cn(inputClass, "pr-10")} />
                    </div>
                  </FormField>
                </div>

                {/* Specialty */}
                <FormField label="التخصص">
                  <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                    placeholder="مثال: تطوير البرمجيات، التسويق الرقمي..." className={inputClass} />
                </FormField>

                {/* Skills */}
                <FormField label="المهارات">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        value={skillInput} 
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const s = skillInput.trim();
                            if (s && !skills.includes(s)) { setSkills([...skills, s]); setSkillInput(""); }
                          }
                        }}
                        placeholder="اكتب مهارة واضغط Enter" className={inputClass} />
                      <Button type="button" variant="outline" size="sm" className="shrink-0 h-11 rounded-xl"
                        onClick={() => { const s = skillInput.trim(); if (s && !skills.includes(s)) { setSkills([...skills, s]); setSkillInput(""); } }}>
                        إضافة
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/15">
                            {s}
                            <button type="button" onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-destructive">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* Cover letter */}
                <FormField label="رسالة تعريفية">
                  <Textarea value={form.coverLetter} onChange={e => setForm({ ...form, coverLetter: e.target.value })}
                    placeholder="أخبرنا لماذا تعتبر نفسك مناسباً لهذا المنصب..."
                    rows={4}
                    className="rounded-xl border-border bg-secondary/50 focus:bg-card focus:border-primary focus:ring-primary/20 transition-all text-[15px] resize-none placeholder:text-muted-foreground/50" />
                </FormField>

                {/* Resume upload */}
                <FormField label="السيرة الذاتية">
                  <label className={cn(
                    "flex items-center gap-4 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group",
                    resumeFile
                      ? "border-accent/40 bg-accent/5"
                      : "border-border hover:border-primary/30 hover:bg-primary/5"
                  )}>
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                      resumeFile
                        ? "bg-accent/15 rotate-0"
                        : "bg-secondary group-hover:bg-primary/10 group-hover:scale-105"
                    )}>
                      <Upload className={cn("w-5 h-5 transition-colors", resumeFile ? "text-accent" : "text-muted-foreground group-hover:text-primary")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {resumeFile ? (
                        <p className="text-sm font-bold text-accent truncate">{resumeFile.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">اضغط لرفع السيرة الذاتية</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">PDF, DOC, DOCX — حد أقصى 5 ميجابايت</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file && !validateFile(file, "resume")) {
                        e.target.value = "";
                        return;
                      }
                      setResumeFile(file || null);
                      // Auto-parse resume with AI
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
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                              body: JSON.stringify({ resumeUrl: urlData.publicUrl, applicantName: form.name }),
                            });
                            if (resp.ok) {
                              const parsed = await resp.json();
                              if (parsed.skills?.length) setSkills(prev => [...new Set([...prev, ...parsed.skills])]);
                              if (parsed.specialty && !form.specialty) setForm(f => ({ ...f, specialty: parsed.specialty }));
                              toast({ title: "تم تحليل السيرة الذاتية ✅", description: `تم استخراج ${parsed.skills?.length || 0} مهارات` });
                            }
                          }
                        } catch (err) { console.error("Resume parse failed:", err); }
                        setParsing(false);
                      }
                    }} />
                  </label>
                  {resumeFile && (
                    <button type="button" onClick={() => setResumeFile(null)} className="text-xs text-destructive hover:underline mt-1.5 font-medium">إزالة الملف</button>
                  )}
                </FormField>

                {/* Submit */}
                {parsing && (
                  <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    جاري تحليل السيرة الذاتية بالذكاء الاصطناعي...
                  </div>
                )}

                <Button type="submit" disabled={submitting || uploading || parsing}
                  className="w-full h-13 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 border-0 disabled:opacity-60">
                  {uploading ? "جاري رفع السيرة الذاتية..." : submitting ? "جاري الإرسال..." : "إرسال الطلب"}
                </Button>
              </form>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-2 space-y-5 order-2 lg:order-2">
            {job.description && (
              <JobInfoCard icon={FileText} iconBg="bg-primary/10" iconColor="text-primary" title="الوصف الوظيفي">
                <p className="text-sm text-muted-foreground leading-7">{job.description}</p>
              </JobInfoCard>
            )}

            {job.requirements && job.requirements.length > 0 && (
              <JobInfoCard icon={Star} iconBg="bg-warning/10" iconColor="text-warning" title="المتطلبات">
                <ul className="space-y-3">
                  {job.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-accent">{i + 1}</span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </JobInfoCard>
            )}

            {job.experience_level && (
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/15 p-6">
                <p className="text-xs text-accent font-bold mb-1.5 uppercase tracking-wider">مستوى الخبرة المطلوب</p>
                <p className="text-lg font-extrabold text-foreground">{job.experience_level}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center gap-2.5">
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} — نظام التوظيف الذكي</p>
        </div>
      </footer>
    </div>
  );
}
