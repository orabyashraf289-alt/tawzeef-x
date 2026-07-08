import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Briefcase, Calendar, FileText, LogOut, Clock, CheckCircle2, XCircle, Send, Eye, ChevronLeft, UploadCloud, User, MapPin, Phone, Tags, Sparkles, Check, Loader2, Plus, Trash2, Award, GraduationCap, Link2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageSkeleton } from "@/components/Skeletons";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

function useJobSeekerData() {
  const { user } = useAuth();

  const applications = useQuery({
    queryKey: ["seeker-applications", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, department, location, type)")
        .eq("email", user!.email!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const candidates = useQuery({
    queryKey: ["seeker-candidates", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, stage, status, role, tracking_code, ai_score, created_at, job_id")
        .eq("email", user!.email!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const candidateIds = candidates.data?.map((c: any) => c.id) || [];

  const interviews = useQuery({
    queryKey: ["seeker-interviews", candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return [];
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .in("candidate_id", candidateIds)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: candidateIds.length > 0,
  });

  const offers = useQuery({
    queryKey: ["seeker-offers", candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return [];
      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: candidateIds.length > 0,
  });

  return {
    applications: applications.data || [],
    candidates: candidates.data || [],
    interviews: interviews.data || [],
    offers: offers.data || [],
    isLoading: applications.isLoading || candidates.isLoading,
  };
}

const stageBadgeVariant = (stage: string) => {
  if (stage?.includes("مقبول") || stage?.includes("تعيين")) return "default";
  if (stage?.includes("مرفوض")) return "destructive";
  if (stage?.includes("مقابلة")) return "secondary";
  return "outline";
};

const interviewStatusIcon = (status: string) => {
  if (status === "مكتملة") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "ملغية") return <XCircle className="w-4 h-4 text-destructive" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
};

export default function JobSeekerDashboard() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const { applications, candidates, interviews, offers, isLoading } = useJobSeekerData();

  // Resume & Profile states
  const [uploading, setUploading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    fullName: "",
    jobTitle: "",
    phone: "",
    email: "",
    location: "",
    summary: "",
    skills: "",
    resumeFileUrl: ""
  });

  // Complex list fields
  const [experience, setExperience] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  // Add Item Forms
  const [newExp, setNewExp] = useState({ title: "", company: "", start: "", end: "", desc: "" });
  const [newEdu, setNewEdu] = useState({ degree: "", school: "", year: "" });
  const [newCert, setNewCert] = useState({ name: "", issuer: "", date: "", file_url: "" });
  const [newLang, setNewLang] = useState({ name: "", level: "مبتدئ" });
  const [newLink, setNewLink] = useState({ label: "LinkedIn", url: "" });

  // Query resume info
  const resumeQuery = useQuery({
    queryKey: ["seeker-resume", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (resumeQuery.data) {
      const r = resumeQuery.data;
      setForm({
        fullName: r.full_name || "",
        jobTitle: r.job_title || "",
        phone: r.phone || "",
        email: r.email || user?.email || "",
        location: r.location || "",
        summary: r.summary || "",
        skills: r.skills ? r.skills.join(", ") : "",
        resumeFileUrl: r.avatar_url || "" 
      });
      setExperience(r.experience || []);
      setEducation(r.education || []);
      setCertifications(r.certifications || []);
      setLanguages(r.languages || []);
      setLinks(r.links || []);
    } else if (user) {
      setForm(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [resumeQuery.data, user]);

  const saveMutation = useMutation({
    mutationFn: async (resumeData: any) => {
      // 1) Update profiles
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: resumeData.full_name,
          job_title: resumeData.job_title,
        })
        .eq("user_id", user!.id);
      if (profErr) throw profErr;

      // 2) Upsert resumes table
      if (resumeQuery.data) {
        const { error } = await supabase
          .from("resumes" as any)
          .update(resumeData)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("resumes" as any)
          .insert({
            user_id: user!.id,
            ...resumeData
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seeker-resume", user?.id] });
      toast({ title: "تم حفظ الملف الشخصي بنجاح ✅" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const skillsArray = form.skills.split(",").map(s => s.trim()).filter(Boolean);
      await saveMutation.mutateAsync({
        full_name: form.fullName,
        job_title: form.jobTitle,
        phone: form.phone,
        email: form.email,
        location: form.location,
        summary: form.summary,
        skills: skillsArray,
        avatar_url: form.resumeFileUrl,
        experience,
        education,
        certifications,
        languages,
        links
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const filePath = `${user!.id}/resume_${Date.now()}.${ext}`;

      // 1) Upload file to Supabase storage bucket 'resumes'
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // 2) Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, resumeFileUrl: publicUrl }));
      toast({ title: "تم رفع الملف بنجاح 📁", description: "جاري تحليل السيرة الذاتية بالذكاء الاصطناعي..." });

      // 3) Invoke parse-resume edge function
      try {
        const { data: parseResult, error: parseError } = await supabase.functions.invoke("parse-resume", {
          body: { resumeUrl: publicUrl, applicantName: form.fullName }
        });

        if (!parseError && parseResult) {
          setForm(prev => ({
            ...prev,
            fullName: parseResult.name || prev.fullName,
            jobTitle: parseResult.title || prev.jobTitle,
            phone: parseResult.phone || prev.phone,
            location: parseResult.location || prev.location,
            summary: parseResult.summary || prev.summary,
            skills: parseResult.skills ? parseResult.skills.join(", ") : prev.skills
          }));
          
          if (parseResult.experience) setExperience(parseResult.experience);
          if (parseResult.education) setEducation(parseResult.education);
          
          toast({ title: "تم التحليل بنجاح ✨", description: "تم استخراج البيانات بالذكاء الاصطناعي" });
        }
      } catch (parseErr) {
        console.error("AI parse failed, fallback to manual input:", parseErr);
      }

    } catch (err: any) {
      toast({ title: "فشل الرفع", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Certificate Uploader helper
  const handleUploadCertificate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const filePath = `${user!.id}/certificates/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      setNewCert(prev => ({ ...prev, file_url: publicUrl }));
      toast({ title: "تم إرفاق الشهادة بنجاح 📄" });
    } catch (err: any) {
      toast({ title: "فشل رفع الشهادة", description: err.message, variant: "destructive" });
    } finally {
      setCertUploading(false);
    }
  };

  // Add/Remove Helpers
  const addExperience = () => {
    if (!newExp.title || !newExp.company) return;
    setExperience([...experience, newExp]);
    setNewExp({ title: "", company: "", start: "", end: "", desc: "" });
  };

  const addEducation = () => {
    if (!newEdu.degree || !newEdu.school) return;
    setEducation([...education, newEdu]);
    setNewEdu({ degree: "", school: "", year: "" });
  };

  const addCertification = () => {
    if (!newCert.name || !newCert.issuer) return;
    setCertifications([...certifications, newCert]);
    setNewCert({ name: "", issuer: "", date: "", file_url: "" });
  };

  const addLanguage = () => {
    if (!newLang.name) return;
    setLanguages([...languages, newLang]);
    setNewLang({ name: "", level: "مبتدئ" });
  };

  const addLink = () => {
    if (!newLink.url) return;
    setLinks([...links, newLink]);
    setNewLink({ label: "LinkedIn", url: "" });
  };

  if (isLoading) return <PageSkeleton />;

  const stats = [
    { label: "طلباتي", value: applications.length, icon: Send, color: "text-primary" },
    { label: "مراحل التوظيف", value: candidates.length, icon: Briefcase, color: "text-blue-500" },
    { label: "المقابلات", value: interviews.length, icon: Calendar, color: "text-amber-500" },
    { label: "العروض", value: offers.length, icon: FileText, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold text-foreground">لوحة الباحث عن عمل</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-muted/40 rounded-lg">
              {([
                { value: "light" as const, icon: Sun },
                { value: "dark" as const, icon: Moon },
                { value: "system" as const, icon: Monitor },
              ]).map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className={cn("relative p-1.5 rounded-md transition-colors", theme === opt.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-foreground">مرحباً 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">تابع طلباتك ومقابلاتك وعروضك الوظيفية من مكان واحد</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted/50", s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto flex flex-nowrap whitespace-nowrap justify-start">
            <TabsTrigger value="applications" className="gap-1.5"><Send className="w-3.5 h-3.5" />الطلبات</TabsTrigger>
            <TabsTrigger value="stages" className="gap-1.5"><Briefcase className="w-3.5 h-3.5" />المراحل</TabsTrigger>
            <TabsTrigger value="interviews" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />المقابلات</TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5"><FileText className="w-3.5 h-3.5" />العروض</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" />الملف الشخصي والتوثيق</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader><CardTitle className="text-base">طلبات التوظيف</CardTitle></CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لم تقدم على أي وظيفة بعد</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوظيفة</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>تاريخ التقديم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{(app.jobs as any)?.title || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{(app.jobs as any)?.department || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(app.created_at).toLocaleDateString("ar-SA")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stages Tab */}
          <TabsContent value="stages">
            <Card>
              <CardHeader><CardTitle className="text-base">مراحل التوظيف</CardTitle></CardHeader>
              <CardContent>
                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد مراحل نشطة</p>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{c.role || "وظيفة"}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={stageBadgeVariant(c.stage)}>{c.stage}</Badge>
                            {c.tracking_code && (
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {c.tracking_code}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.ai_score && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">{c.ai_score}%</p>
                            <p className="text-[10px] text-muted-foreground">تقييم AI</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews">
            <Card>
              <CardHeader><CardTitle className="text-base">المقابلات</CardTitle></CardHeader>
              <CardContent>
                {interviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد مقابلات مجدولة</p>
                ) : (
                  <div className="space-y-3">
                    {interviews.map((iv: any) => (
                      <div key={iv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center gap-3">
                          {interviewStatusIcon(iv.status)}
                          <div>
                            <p className="text-sm font-medium text-foreground">{iv.position}</p>
                            <p className="text-xs text-muted-foreground">{iv.date} — {iv.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{iv.type}</Badge>
                          {iv.meeting_url && iv.status === "مجدولة" && (
                            <a href={iv.meeting_url} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                <Eye className="w-3.5 h-3.5" />انضمام
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card>
              <CardHeader><CardTitle className="text-base">العروض الوظيفية</CardTitle></CardHeader>
              <CardContent>
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد عروض</p>
                ) : (
                  <div className="space-y-3">
                    {offers.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{o.position}</p>
                          <p className="text-xs text-muted-foreground">{o.department} — {o.salary?.toLocaleString()} {o.currency}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={o.status === "accepted" ? "default" : o.status === "rejected" ? "destructive" : "outline"}>
                            {o.status === "accepted" ? "مقبول" : o.status === "rejected" ? "مرفوض" : o.status === "sent" ? "بانتظار الرد" : o.status}
                          </Badge>
                          {(o.status === "sent" || o.status === "viewed") && o.token && (
                            <Link to={`/offer/${o.token}`}>
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                <ChevronLeft className="w-3.5 h-3.5" />عرض
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile & Resume Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Details Form */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Basic Personal Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      البيانات الأساسية والملخص
                    </CardTitle>
                    <CardDescription>
                      بيانات التواصل والمسمى الوظيفي
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">الاسم الكامل</Label>
                        <Input id="fullName" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="الاسم ثلاثي" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                        <Input id="jobTitle" value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="مثال: مطور ويب، مهندس برمجيات" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">رقم الجوال</Label>
                        <Input id="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="966XXXXXXXXX+" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">العنوان / المدينة</Label>
                        <Input id="location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="الرياض، المملكة العربية السعودية" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="summary">الملخص المهني</Label>
                      <Textarea id="summary" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} placeholder="اكتب نبذة مختصرة عن خبراتك ومؤهلاتك..." className="h-24" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skills">المهارات (افصل بينها بفاصلة)</Label>
                      <Input id="skills" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="React, Node.js, TypeScript, UI/UX" />
                    </div>
                  </CardContent>
                </Card>

                {/* Experience Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      الخبرات المهنية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {experience.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {experience.map((exp, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{exp.title}</p>
                              <p className="text-xs text-muted-foreground">{exp.company} | {exp.start} - {exp.end}</p>
                              {exp.desc && <p className="text-xs text-muted-foreground mt-1">{exp.desc}</p>}
                            </div>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setExperience(experience.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Experience Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-dashed border-border">
                      <div className="space-y-1">
                        <Label className="text-xs">المسمى الوظيفي</Label>
                        <Input size={30} value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} placeholder="مطور برمجيات" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الشركة</Label>
                        <Input value={newExp.company} onChange={e => setNewExp({...newExp, company: e.target.value})} placeholder="اسم الشركة" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تاريخ البدء</Label>
                        <Input value={newExp.start} onChange={e => setNewExp({...newExp, start: e.target.value})} placeholder="2024" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تاريخ الانتهاء</Label>
                        <Input value={newExp.end} onChange={e => setNewExp({...newExp, end: e.target.value})} placeholder="الحالي أو 2026" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs">الوصف</Label>
                        <Textarea value={newExp.desc} onChange={e => setNewExp({...newExp, desc: e.target.value})} placeholder="اكتب مهامك الوظيفية..." className="h-16" />
                      </div>
                      <Button type="button" size="sm" className="mt-2 sm:col-span-2 w-full sm:w-auto" onClick={addExperience}>
                        <Plus className="w-4 h-4 ml-1" /> إضافة خبرة
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Education Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      التعليم والمؤهلات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {education.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {education.map((edu, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{edu.degree}</p>
                              <p className="text-xs text-muted-foreground">{edu.school} — {edu.year}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setEducation(education.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Education Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-dashed border-border">
                      <div className="space-y-1">
                        <Label className="text-xs">الشهادة / التخصص</Label>
                        <Input value={newEdu.degree} onChange={e => setNewEdu({...newEdu, degree: e.target.value})} placeholder="بكالوريوس علوم حاسب" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الجامعة / الجهة</Label>
                        <Input value={newEdu.school} onChange={e => setNewEdu({...newEdu, school: e.target.value})} placeholder="جامعة الملك سعود" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">سنة التخرج</Label>
                        <Input value={newEdu.year} onChange={e => setNewEdu({...newEdu, year: e.target.value})} placeholder="2023" />
                      </div>
                      <Button type="button" size="sm" className="mt-2 sm:col-span-3 w-full sm:w-auto" onClick={addEducation}>
                        <Plus className="w-4 h-4 ml-1" /> إضافة مؤهل
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Certifications & Document Uploads */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      الشهادات المهنية والدورات (إرفاق وإثبات)
                    </CardTitle>
                    <CardDescription>
                      أرفق شهاداتك المهنية (مثل PMP, AWS, Google) لزيادة فرص قبولك
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {certifications.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {certifications.map((cert, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{cert.name}</p>
                              <p className="text-xs text-muted-foreground">{cert.issuer} — {cert.date}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {cert.file_url && (
                                <a href={cert.file_url} target="_blank" rel="noreferrer">
                                  <Button size="xs" variant="outline" className="text-[10px] h-7 px-2">
                                    <Eye className="w-3.5 h-3.5 ml-1" /> عرض
                                  </Button>
                                </a>
                              )}
                              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Certification Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-dashed border-border">
                      <div className="space-y-1">
                        <Label className="text-xs">اسم الشهادة</Label>
                        <Input value={newCert.name} onChange={e => setNewCert({...newCert, name: e.target.value})} placeholder="AWS Certified Solutions Architect" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الجهة المانحة</Label>
                        <Input value={newCert.issuer} onChange={e => setNewCert({...newCert, issuer: e.target.value})} placeholder="Amazon Web Services" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تاريخ الحصول عليها</Label>
                        <Input value={newCert.date} onChange={e => setNewCert({...newCert, date: e.target.value})} placeholder="2025" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تحميل ملف الشهادة (PDF / صورة)</Label>
                        <div className="flex items-center gap-2">
                          <Input type="file" accept=".pdf,image/*" onChange={handleUploadCertificate} className="text-xs" disabled={certUploading} />
                          {certUploading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                        </div>
                      </div>
                      <Button type="button" size="sm" className="mt-2 sm:col-span-2 w-full sm:w-auto" onClick={addCertification} disabled={certUploading}>
                        <Plus className="w-4 h-4 ml-1" /> إضافة شهادة
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Changes Bar */}
                <Button type="button" disabled={saving} onClick={handleSave} className="w-full text-base py-6 bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg transition-all rounded-xl flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري حفظ كافة البيانات والملفات...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      حفظ وتحديث الملف الشخصي بالكامل
                    </>
                  )}
                </Button>

              </div>

              {/* Sidebar - Resume Upload and Additional Lists */}
              <div className="space-y-6">
                
                {/* Resume Upload Box */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      ملف السيرة الذاتية الرئيسي
                    </CardTitle>
                    <CardDescription>
                      ارفع أو حدث ملف سيرتك الذاتية لفرز الـ AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/10 relative hover:bg-muted/20 transition-all">
                      {uploading ? (
                        <div className="space-y-2 flex flex-col items-center">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <p className="text-sm font-semibold">جاري المعالجة والتحليل...</p>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                          <p className="text-sm font-semibold">اسحب سيرتك الذاتية هنا</p>
                          <p className="text-xs text-muted-foreground mt-1">تنسيقات PDF، Word</p>
                          <input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadResume} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </>
                      )}
                    </div>

                    {form.resumeFileUrl && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center gap-2 truncate">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate">تم رفع السيرة بنجاح</span>
                        </div>
                        <a href={form.resumeFileUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-2">
                            <Eye className="w-3.5 h-3.5 ml-1" /> عرض الملف
                          </Button>
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" />
                      الروابط المهنية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {links.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {links.map((link, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded border border-border text-xs">
                            <a href={link.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[150px]">
                              {link.label}: {link.url}
                            </a>
                            <Button size="icon" variant="ghost" className="text-destructive h-6 w-6" onClick={() => setLinks(links.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 p-2 rounded border border-dashed border-border">
                      <div className="flex items-center gap-2">
                        <select className="bg-background border border-border text-xs rounded p-1.5 w-1/3" value={newLink.label} onChange={e => setNewLink({...newLink, label: e.target.value})}>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="GitHub">GitHub</option>
                          <option value="Portfolio">Portfolio</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                        <Input className="text-xs" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} placeholder="رابط الحساب / الموقع" />
                      </div>
                      <Button type="button" size="xs" variant="outline" className="w-full text-[10px]" onClick={addLink}>
                        إضافة رابط
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Languages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      اللغات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {languages.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {languages.map((lang, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded border border-border text-xs">
                            <span>{lang.name} — <Badge variant="outline" className="text-[10px]">{lang.level}</Badge></span>
                            <Button size="icon" variant="ghost" className="text-destructive h-6 w-6" onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 p-2 rounded border border-dashed border-border">
                      <div className="flex items-center gap-2">
                        <Input className="text-xs w-2/3" value={newLang.name} onChange={e => setNewLang({...newLang, name: e.target.value})} placeholder="العربية، الإنجليزية" />
                        <select className="bg-background border border-border text-xs rounded p-1.5 w-1/3" value={newLang.level} onChange={e => setNewLang({...newLang, level: e.target.value})}>
                          <option value="اللغة الأم">اللغة الأم</option>
                          <option value="طلاقة">طلاقة</option>
                          <option value="متوسط">متوسط</option>
                          <option value="مبتدئ">مبتدئ</option>
                        </select>
                      </div>
                      <Button type="button" size="xs" variant="outline" className="w-full text-[10px]" onClick={addLanguage}>
                        إضافة لغة
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
