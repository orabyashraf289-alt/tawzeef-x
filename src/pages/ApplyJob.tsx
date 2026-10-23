import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { validateFile } from "@/lib/fileValidation";
import { extractTextFromPDF, extractTextFromDocx } from "@/lib/fileParser";
import { parseJobCustomSpecs } from "@/lib/jobSpecsHelper";
import { getPublicJobEmployerName } from "@/lib/publicJobIdentity";
import { getJobAvailability } from "@/lib/jobSeoHelper";
import { analyzeApplicationEvidence } from "@/lib/applicationEvidence";
import { prepareConsentedResume } from "@/lib/consentedResume";
import { notifyGoogleIndexing } from "@/lib/googleIndexingService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/marketing/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  MapPin,
  CheckCircle2,
  FileText,
  User,
  GraduationCap,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

// Modular Apply Components
import ApplyJobSidebar from "@/components/apply/ApplyJobSidebar";
import ApplyStepCV from "@/components/apply/ApplyStepCV";
import ApplyStepProfile from "@/components/apply/ApplyStepProfile";
import ApplyStepSkills from "@/components/apply/ApplyStepSkills";
import ApplyStepPreferences from "@/components/apply/ApplyStepPreferences";
import ApplyStepReview from "@/components/apply/ApplyStepReview";
import ApplySuccessPass from "@/components/apply/ApplySuccessPass";
import type { ApplicantAccountStatus } from "@/components/apply/ApplySuccessPass";

const STEPS = [
  { id: 1, title: "السيرة الذاتية", icon: FileText },
  { id: 2, title: "البيانات الشخصية", icon: User },
  { id: 3, title: "المهارات والتعليم", icon: GraduationCap },
  { id: 4, title: "التفضيلات والرسالة", icon: Clock },
  { id: 5, title: "المراجعة والإرسال", icon: CheckCircle2 },
];

export default function ApplyJob() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<ApplicantAccountStatus>("preparing");

  // Stepper State (1 - 5)
  const [currentStep, setCurrentStep] = useState(1);
  const stepNavigationRef = useRef<HTMLElement>(null);
  const previousStep = useRef(currentStep);

  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    stepNavigationRef.current?.focus({ preventScroll: true });
    stepNavigationRef.current?.scrollIntoView?.({ block: "start" });
  }, [currentStep]);

  // Form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    experience: "",
    linkedinUrl: "",
    portfolioUrl: "",
    universityDegree: "",
    major: "",
    universityName: "",
    gradYear: "",
    licenseNumber: "",
    licenseExpiry: "",
    licenseType: "رخصة مهنية",
    noticePeriod: "متاح للبدء فوراً",
    expectedSalary: "",
    workMode: "حضوري في مقر العمل",
    coverLetter: "",
    demoVideoUrl: "",
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const resumeAnalysisVersion = useRef(0);
  const submissionInFlight = useRef(false);

  // Load Job
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setJob(null);
    async function fetchJob() {
      if (!id) { setLoading(false); return; }
      try {
        // Query jobs table directly to avoid PostgREST foreign key cache mismatch
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (jobError) throw jobError;

        if (jobData) {
          let companyData = null;
          if (jobData.company_id) {
            try {
              const { data: cData, error: companyError } = await supabase
                .rpc("get_public_job_employer", { _job_id: jobData.id })
                .maybeSingle();
              if (companyError) throw companyError;
              companyData = cData;
            } catch (err) {
              console.warn("Could not fetch company:", err);
            }
          }
          if (!cancelled) setJob({ ...jobData, companies: companyData });
        } else {
          if (!cancelled) setJob(null);
        }
      } catch (e) {
        console.warn("Could not fetch job:", e);
        if (!cancelled) setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJob();
    return () => { cancelled = true; };
  }, [id]);

  const { cleanDescription, specs, hasSpecs } = useMemo(() => parseJobCustomSpecs(job), [job]);
  const jobAvailability = useMemo(() => getJobAvailability(job), [job]);

  // If page is loaded for an expired or closed job, trigger URL_DELETED to Google Indexing API in background
  useEffect(() => {
    if (!loading && job && !jobAvailability.isOpen && id) {
      notifyGoogleIndexing({
        jobId: id,
        action: "URL_DELETED",
        jobTitle: job.title,
        status: job.status,
      }).catch(() => {});
    }
  }, [loading, job, jobAvailability.isOpen, id]);

  const schoolDisplayName = useMemo(() => getPublicJobEmployerName(job, specs), [job, specs]);

  const isEducational = Boolean(
    specs.is_educational ||
    job?.department?.includes("تعليم") ||
    job?.department?.includes("أكاديمي") ||
    job?.title?.includes("معلم") ||
    job?.title?.includes("مدرس")
  );

  // Suggested skills extracted from job requirements
  const suggestedJobSkills = useMemo(() => {
    if (!job?.requirements || !Array.isArray(job.requirements)) return [];
    const skillsFound: string[] = [];
    job.requirements.forEach((req: string) => {
      const words = req.split(/[\s,،/]+/);
      words.forEach(w => {
        const clean = w.trim().replace(/[•\-_*]/g, "");
        if (clean.length > 3 && !skillsFound.includes(clean) && skillsFound.length < 8) {
          skillsFound.push(clean);
        }
      });
    });
    return skillsFound;
  }, [job]);
  const applicationEvidence = useMemo(() => analyzeApplicationEvidence({
    requirements: job?.requirements,
    resumeText,
    skills,
    form,
  }), [job?.requirements, resumeText, skills, form]);

  // Google Jobs Structured Data (JobPosting) - Strict Google Search Central Compliance
  const jobPostingJsonLd = useMemo(() => {
    // Only generate JobPosting structured data if the job is active and NOT expired
    if (!job || !job.title || !jobAvailability.isOpen || jobAvailability.isExpired) return undefined;
    const employmentTypeMap: Record<string, string> = {
      "دوام كامل": "FULL_TIME",
      "دوام جزئي": "PART_TIME",
      "عقد": "CONTRACTOR",
      "تدريب": "INTERN",
      "مؤقت": "TEMPORARY",
      "عن بُعد": "FULL_TIME",
    };

    const datePosted = job.created_at ? new Date(job.created_at).toISOString() : new Date().toISOString();
    const validThrough = jobAvailability.validThroughIso;

    const plainDesc = cleanDescription || job.description || `وظيفة ${job.title} لدى ${schoolDisplayName}`;
    const loc = job.location || "جدة، المملكة العربية السعودية";
    const isJeddah = loc.includes("جدة") || loc.includes("Jeddah");
    const isRiyadh = loc.includes("الرياض") || loc.includes("Riyadh");
    const locality = isJeddah ? "جدة" : (isRiyadh ? "الرياض" : "المملكة العربية السعودية");
    const region = isJeddah ? "منطقة مكة المكرمة" : (isRiyadh ? "منطقة الرياض" : "المملكة العربية السعودية");

    return {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: plainDesc,
      identifier: {
        "@type": "PropertyValue",
        name: "TawzeefX",
        value: `TX-${id?.slice(0, 8) || "JOB"}`,
      },
      datePosted: datePosted,
      validThrough: validThrough,
      employmentType: job.type && employmentTypeMap[job.type] ? employmentTypeMap[job.type] : "FULL_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: schoolDisplayName,
        sameAs: "https://www.tawzeefx.com/",
        logo: (job as any)?.companies?.logo_url || "https://www.tawzeefx.com/icon-512x512.png",
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          streetAddress: loc,
          addressLocality: locality,
          addressRegion: region,
          addressCountry: "SA",
        },
      },
      ...(job.type === "عن بُعد" ? { jobLocationType: "TELECOMMUTE" } : {}),
      ...(job.salary_min || job.salary_max ? {
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "SAR",
          value: {
            "@type": "QuantitativeValue",
            ...(job.salary_min ? { minValue: Number(job.salary_min) } : {}),
            ...(job.salary_max ? { maxValue: Number(job.salary_max) } : {}),
            unitText: "MONTH",
          },
        },
      } : {}),
      directApply: true,
    };
  }, [job, cleanDescription, schoolDisplayName, id]);

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // AI Resume Extraction Engine
  const processResumeFile = async (file: File) => {
    const isValid = validateFile(file, "resume");
    if (!isValid) return;
    const analysisVersion = ++resumeAnalysisVersion.current;
    setAiAnalyzed(false);
    setResumeText("");
    setResumeFile(file);
    toast({ title: "تم إرفاق السيرة الذاتية بنجاح ✅", description: file.name });

    setIsAnalyzingAI(true);

    try {
      let extractedText = "";
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (ext === "pdf") {
        extractedText = await extractTextFromPDF(file);
      } else if (ext === "docx") {
        extractedText = await extractTextFromDocx(file);
      }

      if (analysisVersion !== resumeAnalysisVersion.current) return;
      setResumeText(extractedText);
      if (extractedText) {
        // Fast Regex Heuristics
        const phoneMatch = extractedText.match(/(?:(?:\+|00)?(966|20|971|965|968|973|974)?[-.\s]?)?(05\d{8}|01[0125]\d{8}|\d{9,12})/);
        const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const expMatch = extractedText.match(/(\d+)\s*(?:\+|سنوات|سنة|عام|years?|yrs?)/i);
        const licenseMatch = extractedText.match(/(?:ETEC|رخصة|ترخيص|SOCPA|SCFHS)[-\s:]*([A-Za-z0-9-]+)/i);

        setForm(prev => {
          const updated = { ...prev };
          if (!prev.email && emailMatch) { updated.email = emailMatch[0].trim().toLowerCase(); }
          if (!prev.phone && phoneMatch) { updated.phone = phoneMatch[0].trim(); }
          if (!prev.experience && expMatch) { updated.experience = expMatch[1]; }
          if (!prev.licenseNumber && licenseMatch) { updated.licenseNumber = licenseMatch[1].trim(); }
          return updated;
        });

        if (analysisVersion !== resumeAnalysisVersion.current) return;
        setAiAnalyzed(true);
        toast({
          title: "تمت قراءة السيرة الذاتية",
          description: "راجع البيانات المستخرجة وأكمل الحقول الناقصة قبل الإرسال.",
        });
      } else {
        toast({ title: "الملف مرفق", description: "تعذر استخراج النص تلقائياً. يمكنك إدخال بياناتك يدوياً وإرسال الملف مع الطلب." });
      }
    } catch (parseErr) {
      if (analysisVersion !== resumeAnalysisVersion.current) return;
      console.warn("Resume parsing exception notice:", parseErr);
      toast({ title: "الملف مرفق", description: "تعذرت قراءة السيرة تلقائياً. أكمل بياناتك يدوياً." });
    } finally {
      if (analysisVersion === resumeAnalysisVersion.current) setIsAnalyzingAI(false);
    }
  };

  const handleFileRemove = () => {
    resumeAnalysisVersion.current++;
    setResumeFile(null);
    setResumeText("");
    setAiAnalyzed(false);
    setIsAnalyzingAI(false);
  };

  const prepareApplicantAccount = async (code: string, email: string) => {
    setAccountStatus("preparing");
    try {
      const { data, error } = await supabase.functions.invoke("auto-create-candidate-account", {
        body: { trackingCode: code, email },
      });
      if (error || !["invited", "existing"].includes(data?.status)) throw error || new Error("Account invitation failed");
      setAccountStatus(data.status);
    } catch (error) {
      console.error("Applicant account invitation failed:", error);
      setAccountStatus("error");
    }
  };

  // Final Application Submission
  const handleSubmit = async (aiConsent: boolean) => {
    if (submissionInFlight.current || submitted) return;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "يرجى استكمال البيانات الأساسية", variant: "destructive" });
      setCurrentStep(2);
      return;
    }
    if (!id || !job || !getJobAvailability(job).isOpen) {
      toast({ title: "هذه الوظيفة غير متاحة للتقديم الآن", variant: "destructive" });
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    try {
    let resumeUrl: string | null = null;

    // Upload CV to Storage Bucket
    if (resumeFile) {
      const ext = (resumeFile.name.split(".").pop() || "").toLowerCase();
      const filePath = `applications/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, resumeFile, { upsert: false });
      if (uploadError) throw uploadError;
      // This bucket is private; recruiters request a signed URL when viewing it.
      resumeUrl = filePath;
    }

    const generatedTrackingCode = "TX-" + crypto.randomUUID().replace(/-/g, "").toUpperCase();

    const cleanEmail = form.email.trim().toLowerCase();
    const cleanPhone = form.phone.trim();

    const payload: any = {
      job_id: id,
      company_id: job?.company_id || null,
      name: form.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      experience: form.experience || null,
      cover_letter: form.coverLetter || null,
      resume_url: resumeUrl,
      skills: skills.length > 0 ? skills : null,
      specialty: form.currentTitle || job?.title || null,
      tracking_code: generatedTrackingCode,
      license_number: form.licenseNumber || null,
      license_expiry: form.licenseExpiry || null,
      university_degree: form.universityDegree || null,
      demo_video_url: form.demoVideoUrl || null,
    };
    if (aiConsent && resumeUrl && resumeText.trim()) {
      const excerpt = prepareConsentedResume(resumeText, form.name);
      if (excerpt) {
        payload.ai_processing_consent_at = new Date().toISOString();
        payload.ai_resume_excerpt = excerpt;
      }
    }

    const { error: appError } = await supabase.from("applications").insert(payload);
    if (appError) throw appError;

    setTrackingCode(generatedTrackingCode);
    // The saved application gets its receipt immediately, independently of email provisioning.
    setSubmitted(true);
    void prepareApplicantAccount(generatedTrackingCode, cleanEmail);
    toast({ title: "تم تقديم طلبك بنجاح ✅" });
    } catch (error) {
      console.error("Application submission failed:", error);
      toast({ title: "فشل إرسال الطلب", description: "لم يتم حفظ الطلب. حاول مرة أخرى.", variant: "destructive" });
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <SEO
          title="شاغر وظيفي معتمد | TawzeefX"
          description="بوابة التقديم والتوظيف الذكي عبر منصة TawzeefX."
          canonical={`https://www.tawzeefx.com/apply/${id}`}
          noindex={false}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">جاري تحميل بيانات الشاغر الوظيفي...</p>
        </div>
      </div>
    );
  }

  if (!job || !jobAvailability.isOpen) {
    return (
      <div className="min-h-screen bg-muted/30 text-foreground flex flex-col font-sans" dir="rtl">
        <SEO
          title={`${job?.title ? `الشاغر الوظيفي (${job.title}) مغلق` : "الشاغر الوظيفي غير متاح"} | TawzeefX`}
          description="عذراً، هذا الشاغر الوظيفي غير متاح حالياً أو انتهت فترة التقديم عليه."
          canonical={`https://www.tawzeefx.com/apply/${id}`}
          noindex={true}
        />
        <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
              <div className="text-right">
                <span className="font-black text-sm tracking-tight text-foreground block leading-tight">
                  Tawzeef-X
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  بوابة التقديم والتوظيف الذكي
                </span>
              </div>
            </Link>
            <Link to="/careers">
              <Button variant="default" size="sm" className="h-9 text-xs font-bold gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>تصفح كل الوظائف</span>
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Briefcase className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">
              {jobAvailability.isExpired ? "انتهت مهلة التقديم على هذا الشاغر" : "الشاغر الوظيفي غير متاح"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {jobAvailability.isExpired
                ? "عذراً، انتهت مهلة استقبال طلبات التقديم لهذه الوظيفة. ندعوك لاستعراض الوظائف النشطة والتقديم عليها مباشرة."
                : "قد يكون هذا الشاغر قد تم إغلاقه أو أرشفته. يمكنك تصفح الشواغر المتاحة حالياً والتقديم عليها مباشرة."}
            </p>
            <Link to="/careers">
              <Button className="mt-2 text-xs font-bold gap-2">
                <span>تصفح الوظائف الشاغرة المتاحة</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && trackingCode) {
    return (
      <ApplySuccessPass
        job={job}
        trackingCode={trackingCode}
        applicantName={form.name}
        applicantEmail={form.email}
        applicantPhone={form.phone}
        schoolDisplayName={schoolDisplayName}
        accountStatus={accountStatus}
        onRetryAccount={() => void prepareApplicantAccount(trackingCode, form.email.trim().toLowerCase())}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground flex flex-col font-sans" dir="rtl">
      <SEO
        title={`${job?.title || "شاغر وظيفي معتمد"} | ${schoolDisplayName} | TawzeefX`}
        description={`قدم الآن على شاغر ${job?.title || "وظيفة"} لدى ${schoolDisplayName} عبر منصة TawzeefX. أرفق سيرتك وراجع بياناتك ومتطلبات الوظيفة قبل الإرسال.`}
        canonical={`https://www.tawzeefx.com/apply/${id}`}
        jsonLd={jobPostingJsonLd}
        noindex={!jobAvailability.isOpen}
      />

      {/* Top Header App Bar */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <div className="text-right">
              <span className="font-black text-sm tracking-tight text-foreground block leading-tight">
                Tawzeef-X
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold block">
                بوابة التقديم والتوظيف الذكي
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-bold border-primary/30 text-primary bg-primary/5 gap-1.5 hidden sm:flex">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>بوابة التقديم</span>
            </Badge>

            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground">
                <span>الرئيسية</span>
                <ChevronRight className="w-3 h-3 rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-border/60 bg-card px-4 sm:px-6 py-6 sm:py-8" aria-labelledby="job-title">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>{schoolDisplayName}</span><span aria-hidden="true">/</span><span>طلب توظيف</span>
              <Badge variant="outline" className="rounded-full text-primary border-primary/20 bg-primary/5 text-[11px] gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" />متاح للتقديم</Badge>
            </div>
            <h1 id="job-title" className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight break-words">{job?.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
              {job?.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>}
              {job?.type && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{job.type}</span>}
              {job?.department && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" />{job.department}</span>}
            </div>
          </div>
          <div className="hidden sm:block border-s border-border ps-6 text-xs text-muted-foreground space-y-2 shrink-0">
            <p>مرجع الوظيفة</p><p className="font-mono text-foreground" dir="ltr">TX-{id?.slice(0, 8)}</p>
            <a href="#job-details" className="inline-block text-primary underline underline-offset-4">تفاصيل الفرصة</a>
          </div>
        </div>
      </section>

      {/* Main Workspace (Wizard + Sidebar) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex-1 w-full">
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          {/* Application workspace */}
          <div className="lg:col-span-8 min-w-0">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <nav ref={stepNavigationRef} tabIndex={-1} aria-label="خطوات طلب التوظيف" className="px-4 sm:px-7 py-5 bg-muted/20 border-b border-border scroll-mt-20 focus:outline-none">
                <div className="flex items-center justify-between gap-3 mb-4 text-xs">
                  <p className="font-semibold text-foreground" aria-live="polite">{STEPS[currentStep - 1].title}</p>
                  <span className="text-muted-foreground">الخطوة {currentStep} من {STEPS.length}</span>
                </div>
                <ol className="grid grid-cols-5 gap-2 sm:gap-3">
                  {STEPS.map((step) => {
                    const completed = currentStep > step.id;
                    const active = currentStep === step.id;
                    const Icon = step.icon;
                    return <li key={step.id} className="min-w-0">
                      <button type="button" onClick={() => completed && setCurrentStep(step.id)} disabled={!completed && !active} aria-current={active ? "step" : undefined} aria-label={`${step.id}. ${step.title}${completed ? "، مكتملة" : ""}`} className={`w-full text-right rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 ${active ? "text-primary" : completed ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className={`block h-1 rounded-full mb-3 ${active || completed ? "bg-primary" : "bg-border"}`} />
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                          {completed ? <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" /> : <Icon className="w-4 h-4 shrink-0" />}
                          <span className="hidden sm:inline leading-5">{step.title}</span><span className="sm:hidden">{step.id}</span>
                        </span>
                      </button>
                    </li>;
                  })}
                </ol>
              </nav>
              <div className="p-5 sm:p-8 lg:p-9">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ApplyStepCV
                      resumeFile={resumeFile}
                      onFileSelect={processResumeFile}
                      onFileRemove={handleFileRemove}
                      isAnalyzingAI={isAnalyzingAI}
                      aiAnalyzed={aiAnalyzed}
                      jobRequirements={Array.isArray(job?.requirements) ? job.requirements : []}
                      onNext={() => setCurrentStep(2)}
                      onSkipManual={() => setCurrentStep(2)}
                    />
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ApplyStepProfile
                      form={form}
                      onChange={handleFieldChange}
                      onNext={() => setCurrentStep(3)}
                      onPrev={() => setCurrentStep(1)}
                    />
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ApplyStepSkills
                      skills={skills}
                      onSkillsChange={setSkills}
                      form={form}
                      onChange={handleFieldChange}
                      suggestedJobSkills={suggestedJobSkills}
                      isEducational={isEducational}
                      onNext={() => setCurrentStep(4)}
                      onPrev={() => setCurrentStep(2)}
                    />
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ApplyStepPreferences
                      form={form}
                      onChange={handleFieldChange}
                      isEducational={isEducational}
                      onNext={() => setCurrentStep(5)}
                      onPrev={() => setCurrentStep(3)}
                    />
                  </motion.div>
                )}

                {currentStep === 5 && (
                  <motion.div
                    key="step-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ApplyStepReview
                      form={form}
                      skills={skills}
                      resumeFile={resumeFile}
                      resumeReadable={Boolean(prepareConsentedResume(resumeText, form.name))}
                      evidence={applicationEvidence}
                      job={job}
                      submitting={submitting}
                      onSubmit={handleSubmit}
                      onPrev={() => setCurrentStep(4)}
                      onJumpToStep={(step) => setCurrentStep(step)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 leading-6"><ShieldCheck className="w-3.5 h-3.5 shrink-0" />القرار النهائي لفريق التوظيف. يمكنك مراجعة بياناتك قبل الإرسال.</p>
          </div>

          {/* Job details remain available alongside the application. */}
          <div id="job-details" className="lg:col-span-4 min-w-0 lg:sticky lg:top-20 scroll-mt-20">
            <ApplyJobSidebar
              job={job}
              specs={specs}
              hasSpecs={hasSpecs}
              schoolDisplayName={schoolDisplayName}
              description={cleanDescription}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
