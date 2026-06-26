import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Briefcase, Calendar, FileText, LogOut, Clock, CheckCircle2, XCircle, Send, Eye, ChevronLeft  } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageSkeleton } from "@/components/Skeletons";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

import { Link } from "react-router-dom";

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
  const { applications, candidates, interviews, offers, isLoading } = useJobSeekerData();

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
            {/* Theme toggle */}
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
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="applications" className="gap-1.5"><Send className="w-3.5 h-3.5" />الطلبات</TabsTrigger>
            <TabsTrigger value="stages" className="gap-1.5"><Briefcase className="w-3.5 h-3.5" />المراحل</TabsTrigger>
            <TabsTrigger value="interviews" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />المقابلات</TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5"><FileText className="w-3.5 h-3.5" />العروض</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  );
}
