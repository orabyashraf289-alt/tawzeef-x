import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { QrCode, CheckCircle2, Upload, Briefcase, User, Mail, Phone, Sparkles, Building2, ArrowRight, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";

export default function EventCheckinPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const eventName = searchParams.get("event") || "معرض التوظيف السريع";

  const [job, setJob] = useState<{ id: string; title: string; company_id?: string | null; department?: string } | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [experience, setExperience] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string>("");

  useEffect(() => {
    async function loadJob() {
      if (!id || id === "general") {
        setJob({ id: "general", title: "تقديم عام لكافة التخصصات", department: "عام" });
        setLoadingJob(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, title, company_id, department")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          setJob({ id: "general", title: "تقديم عام لكافة التخصصات", department: "عام" });
        } else {
          setJob(data);
        }
      } catch {
        setJob({ id: "general", title: "تقديم عام لكافة التخصصات", department: "عام" });
      } finally {
        setLoadingJob(false);
      }
    }

    loadJob();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      toast({ title: "يرجى تعبئة الاسم ورقم الجوال والبريد", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let resumeUrl: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
        const path = `applications/event-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file);
        if (!uploadError) {
          resumeUrl = path;
        }
      }

      const generatedCode = `TX-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Insert into applications
      const applicationPayload: any = {
        job_id: job?.id === "general" ? null : job?.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        specialty: title.trim() || job?.title || "تقديم بالمعرض",
        experience: experience.trim() || null,
        resume_url: resumeUrl,
        tracking_code: generatedCode,
        cover_letter: `تسجيل سريع عبر مسح QR في فعالية: ${eventName}${linkedin ? ` | رابط لينكد إن: ${linkedin}` : ""}`,
      };

      if (job?.company_id) {
        applicationPayload.company_id = job.company_id;
      }

      // Also directly insert into candidates table for immediate pipeline visibility
      const candidatePayload: any = {
        job_id: job?.id === "general" ? null : job?.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: title.trim() || job?.title || "مرشح فعالية",
        stage: "تقديم الطلب",
        status: "جديد",
        experience: experience.trim() || null,
        resume_url: resumeUrl,
        source: `معرض توظيف / QR Event: ${eventName}`,
        summary: `تسجيل فوري عبر رمز QR بالمعرض (${eventName})`,
        tracking_code: generatedCode,
      };

      if (job?.company_id) {
        candidatePayload.company_id = job.company_id;
      }

      await Promise.allSettled([
        supabase.from("applications").insert(applicationPayload),
        supabase.from("candidates").insert(candidatePayload),
      ]);

      setTrackingCode(generatedCode);
      setSubmitted(true);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({ title: "تم تسجيل حضورك وطلبك بنجاح! 🚀" });
    } catch (err: any) {
      toast({ title: "حدث خطأ أثناء الإرسال", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setExperience("");
    setLinkedin("");
    setFile(null);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-background to-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            <span className="font-black text-sm tracking-tight text-foreground">Tawzeef-X</span>
          </Link>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border-indigo-200 text-xs">
            🎯 {eventName}
          </Badge>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <Card className="border border-border/80 shadow-md">
                <CardHeader className="text-center pb-3">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-black">
                    التسجيل السريع بالفعالية (15 ثانية)
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-primary mt-1">
                    {loadingJob ? "جاري التحميل..." : job?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        الاسم ثلاثي <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="مثال: أحمد عبد الله السالم"
                          className="text-xs h-10 pr-9"
                        />
                        <User className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-foreground block mb-1">
                          رقم الجوال <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            required
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="05XXXXXXXX"
                            className="text-xs h-10 pr-9 font-mono"
                            dir="ltr"
                          />
                          <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-foreground block mb-1">
                          البريد الإلكتروني <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="text-xs h-10 pr-9 font-mono"
                            dir="ltr"
                          />
                          <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-foreground block mb-1">
                          التخصص أو المسمى الحالي
                        </label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="مثال: هندسة برمجيات / تسويق"
                          className="text-xs h-10"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground block mb-1">
                          سنوات الخبرة
                        </label>
                        <Input
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          placeholder="مثال: سنتان / حديث تخرج"
                          className="text-xs h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        رابط لينكد إن أو معرض الأعمال (اختياري)
                      </label>
                      <Input
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="text-xs h-10 font-mono"
                        dir="ltr"
                      />
                    </div>

                    {/* CV Upload */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        السيرة الذاتية (PDF / Word) — اختياري
                      </label>
                      <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border/80 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground font-semibold truncate">
                          {file ? file.name : "اضغط هنا لاختيار السيرة الذاتية"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 text-sm font-black gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl mt-2"
                    >
                      {submitting ? (
                        <span>جاري الإرسال...</span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>إرسال الطلب والتسجيل فوراً ⚡</span>
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <Card className="border-2 border-emerald-500/40 bg-card shadow-lg text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground">تم استلام طلبك بنجاح! 🎉</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    شكراً لزيارة جناحنا في {eventName}. تم إدراج ملفك مباشرة لدى فريق التوظيف.
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-xl border border-border/60 inline-block mx-auto">
                  <div className="text-[11px] text-muted-foreground font-semibold">رقم التتبع المرجعي</div>
                  <div className="text-sm font-black text-primary font-mono tracking-wider mt-0.5">
                    {trackingCode}
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={handleResetForNext}
                    className="w-full gap-2 text-xs font-bold h-10 rounded-xl"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تسجيل متقدم آخر في الجناح (Kiosk Mode)</span>
                  </Button>
                  <Link to="/careers">
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground h-9">
                      تصفح الشواغر الأخرى
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-3 text-center text-[11px] text-muted-foreground border-t border-border/40">
        TawzeefX Smart Event Hiring Platform • مدعوم بالذكاء الاصطناعي
      </footer>
    </div>
  );
}