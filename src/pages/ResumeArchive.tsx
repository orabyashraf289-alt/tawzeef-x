import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileText, Download, ExternalLink, Search, Mail, Phone, Briefcase, Calendar,
  Archive, FileDown, Tag, StickyNote, X, Plus, Wifi, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getSignedResumeUrl } from "@/lib/resumeStorage";

interface ResumeRecord {
  id: string;
  source: "candidate" | "application";
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  job_id: string | null;
  job_title: string | null;
  resume_url: string;
  status: string | null;
  created_at: string;
  candidate_id?: string;
}

interface ArchiveMeta {
  id: string;
  resume_url: string;
  candidate_email: string | null;
  notes: string;
  tags: string[];
}

export default function ResumeArchive() {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "candidate" | "application">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [editing, setEditing] = useState<ResumeRecord | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [liveActive, setLiveActive] = useState(false);

  // Jobs for filter + title joining
  const { data: jobs } = useQuery({
    queryKey: ["archive-jobs", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id, title");
      return (data || []) as { id: string; title: string }[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const jobMap = useMemo(() => {
    const m: Record<string, string> = {};
    (jobs || []).forEach(j => { m[j.id] = j.title; });
    return m;
  }, [jobs]);

  // Archive meta (notes + tags)
  const { data: metas } = useQuery({
    queryKey: ["archive-meta", user?.id],
    queryFn: async (): Promise<ArchiveMeta[]> => {
      const { data } = await supabase
        .from("resume_archive_meta")
        .select("id, resume_url, candidate_email, notes, tags")
        .eq("user_id", user!.id);
      return (data || []) as ArchiveMeta[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const metaMap = useMemo(() => {
    const m: Record<string, ArchiveMeta> = {};
    (metas || []).forEach(x => {
      const key = `${x.resume_url}|${(x.candidate_email || "").toLowerCase()}`;
      m[key] = x;
    });
    return m;
  }, [metas]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (metas || []).forEach(m => m.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [metas]);

  // Resume records
  const { data: records, isLoading } = useQuery({
    queryKey: ["resume-archive", user?.id],
    queryFn: async (): Promise<ResumeRecord[]> => {
      const out: ResumeRecord[] = [];

      const { data: cands } = await supabase
        .from("candidates")
        .select("id, name, email, phone, role, job_id, status, resume_url, created_at")
        .eq("user_id", user!.id)
        .not("resume_url", "is", null);

      cands?.forEach(c => {
        if (!c.resume_url) return;
        out.push({
          id: `c-${c.id}`,
          source: "candidate",
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          job_id: c.job_id,
          job_title: null,
          resume_url: c.resume_url,
          status: c.status,
          created_at: c.created_at,
          candidate_id: c.id,
        });
      });

      const jobIds = (jobs || []).map(j => j.id);
      if (jobIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, name, email, phone, job_id, status, resume_url, created_at, specialty")
          .in("job_id", jobIds)
          .not("resume_url", "is", null);

        apps?.forEach(a => {
          if (!a.resume_url) return;
          out.push({
            id: `a-${a.id}`,
            source: "application",
            name: a.name,
            email: a.email,
            phone: a.phone,
            role: a.specialty || null,
            job_id: a.job_id,
            job_title: null,
            resume_url: a.resume_url,
            status: a.status,
            created_at: a.created_at,
          });
        });
      }

      const seen = new Set<string>();
      const dedup: ResumeRecord[] = [];
      for (const r of out) {
        const key = `${r.resume_url}|${(r.email || "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(r);
      }
      dedup.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      return dedup;
    },
    enabled: !!user && !!jobs,
    staleTime: 30_000,
  });

  // Realtime subscriptions for live archive updates
  useEffect(() => {
    if (!user) return;
    const jobIds = (jobs || []).map(j => j.id);

    const channel = supabase
      .channel(`archive-live-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["resume-archive", user.id] }),
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        (payload: any) => {
          const jid = (payload.new || payload.old)?.job_id;
          if (jid && jobIds.includes(jid)) {
            qc.invalidateQueries({ queryKey: ["resume-archive", user.id] });
          }
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "resume_archive_meta", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["archive-meta", user.id] }),
      )
      .subscribe(status => {
        setLiveActive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [user, jobs, qc]);

  const enriched = useMemo(() => {
    return (records || []).map(r => {
      const key = `${r.resume_url}|${(r.email || "").toLowerCase()}`;
      const meta = metaMap[key];
      return {
        ...r,
        job_title: r.job_id ? jobMap[r.job_id] || null : null,
        notes: meta?.notes || "",
        tags: meta?.tags || [],
      };
    });
  }, [records, jobMap, metaMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(r => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (jobFilter !== "all" && r.job_id !== jobFilter) return false;
      if (tagFilter !== "all" && !r.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.role?.toLowerCase().includes(q) ||
        r.job_title?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.tags.some(tg => tg.toLowerCase().includes(q))
      );
    });
  }, [enriched, search, jobFilter, sourceFilter, tagFilter]);

  const fileNameFromUrl = (url: string) => {
    try { return decodeURIComponent(url.split("/").pop() || "resume"); } catch { return "resume"; }
  };
  const fileExt = (url: string) => {
    const n = fileNameFromUrl(url);
    const i = n.lastIndexOf(".");
    return i >= 0 ? n.slice(i + 1).toUpperCase() : "FILE";
  };

  const downloadResume = async (url: string, candName: string) => {
    try {
      const signed = await getSignedResumeUrl(url);
      const res = await fetch(signed);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const ext = fileExt(url).toLowerCase();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${candName.replace(/[^a-z0-9\u0600-\u06FF]+/gi, "_")}_CV.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      const signed = await getSignedResumeUrl(url);
      window.open(signed, "_blank");
    }
  };

  const openResume = async (url: string) => {
    const signed = await getSignedResumeUrl(url);
    window.open(signed, "_blank");
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map(r => ({
      [locale === "ar" ? "الاسم" : "Name"]: r.name,
      [locale === "ar" ? "البريد" : "Email"]: r.email || "",
      [locale === "ar" ? "الهاتف" : "Phone"]: r.phone || "",
      [locale === "ar" ? "الوظيفة" : "Position"]: r.job_title || r.role || "",
      [locale === "ar" ? "الحالة" : "Status"]: r.status || "",
      [locale === "ar" ? "المصدر" : "Source"]: r.source === "candidate" ? (locale === "ar" ? "مرشح" : "Candidate") : (locale === "ar" ? "طلب" : "Application"),
      [locale === "ar" ? "الوسوم" : "Tags"]: (r.tags || []).join(", "),
      [locale === "ar" ? "ملاحظات" : "Notes"]: r.notes || "",
      [locale === "ar" ? "تاريخ التقديم" : "Submitted"]: new Date(r.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US"),
      [locale === "ar" ? "رابط السيرة" : "Resume URL"]: r.resume_url,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumes");
    XLSX.writeFile(wb, `resume-archive-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: locale === "ar" ? "تم التصدير" : "Exported" });
  };

  const stats = useMemo(() => {
    const total = enriched.length;
    const fromApps = enriched.filter(r => r.source === "application").length;
    const uniqueEmails = new Set(enriched.map(r => (r.email || "").toLowerCase()).filter(Boolean)).size;
    const lastMonth = enriched.filter(r => +new Date(r.created_at) > Date.now() - 30 * 86400000).length;
    return { total, fromApps, uniqueEmails, lastMonth };
  }, [enriched]);

  const openEditor = (r: ResumeRecord & { notes?: string; tags?: string[] }) => {
    setEditing(r);
    setEditNotes((r as any).notes || "");
    setEditTags((r as any).tags || []);
    setTagInput("");
  };

  const saveMeta = useMutation({
    mutationFn: async () => {
      if (!editing || !user) return;
      const payload = {
        user_id: user.id,
        resume_url: editing.resume_url,
        candidate_email: editing.email || "",
        notes: editNotes,
        tags: editTags,
      };
      const { error } = await supabase
        .from("resume_archive_meta")
        .upsert(payload, { onConflict: "user_id,resume_url,candidate_email" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive-meta", user?.id] });
      toast({ title: locale === "ar" ? "تم الحفظ" : "Saved" });
      setEditing(null);
    },
    onError: (e: any) => {
      toast({ title: locale === "ar" ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    },
  });

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!editTags.includes(v)) setEditTags([...editTags, v]);
    setTagInput("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Archive className="h-7 w-7 text-primary" />
              {locale === "ar" ? "أرشيف السير الذاتية" : "Resume Archive"}
              {liveActive && (
                <Badge variant="outline" className="text-xs gap-1 border-emerald-500/40 text-emerald-600">
                  <Wifi className="h-3 w-3" />
                  {locale === "ar" ? "مباشر" : "Live"}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === "ar"
                ? "جميع السير الذاتية المُقدّمة من المرشحين — يتم التحديث تلقائياً عند وصول طلبات جديدة."
                : "All resumes submitted by candidates — auto-updates as new applications arrive."}
            </p>
          </div>
          <Button onClick={exportExcel} variant="outline" disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4 me-2" />
            {locale === "ar" ? "تصدير Excel" : "Export Excel"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: locale === "ar" ? "إجمالي الملفات" : "Total Files", value: stats.total, icon: FileText },
            { label: locale === "ar" ? "مرشحون فريدون" : "Unique Candidates", value: stats.uniqueEmails, icon: Mail },
            { label: locale === "ar" ? "من نماذج التقديم" : "From Applications", value: stats.fromApps, icon: Briefcase },
            { label: locale === "ar" ? "آخر 30 يوم" : "Last 30 Days", value: stats.lastMonth, icon: Calendar },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="h-8 w-8 text-primary/40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={locale === "ar" ? "ابحث بالاسم، الوسوم، الملاحظات..." : "Search name, tags, notes..."}
                className="ps-9"
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "ar" ? "كل الوظائف" : "All Jobs"}</SelectItem>
                {(jobs || []).map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="md:w-40"><SelectValue placeholder={locale === "ar" ? "الوسوم" : "Tags"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "ar" ? "كل الوسوم" : "All Tags"}</SelectItem>
                {allTags.map(tg => (
                  <SelectItem key={tg} value={tg}>{tg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
              <TabsList>
                <TabsTrigger value="all">{locale === "ar" ? "الكل" : "All"}</TabsTrigger>
                <TabsTrigger value="candidate">{locale === "ar" ? "المرشحون" : "Candidates"}</TabsTrigger>
                <TabsTrigger value="application">{locale === "ar" ? "الطلبات" : "Applications"}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "ar" ? `النتائج (${filtered.length})` : `Results (${filtered.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{locale === "ar" ? "لا توجد سير ذاتية مطابقة" : "No matching resumes"}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(r => (
                  <div key={r.id} className="py-3 flex flex-col md:flex-row md:items-start gap-3 hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{r.name}</p>
                          <Badge variant="outline" className="text-xs">{fileExt(r.resume_url)}</Badge>
                          <Badge variant={r.source === "candidate" ? "secondary" : "outline"} className="text-xs">
                            {r.source === "candidate" ? (locale === "ar" ? "مرشح" : "Candidate") : (locale === "ar" ? "طلب" : "Application")}
                          </Badge>
                          {r.status && <Badge variant="outline" className="text-xs">{r.status}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                          {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                          {r.job_title && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{r.job_title}</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</span>
                        </div>
                        {(r.tags?.length || r.notes) && (
                          <div className="mt-2 space-y-1">
                            {r.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {r.tags.map(tg => (
                                  <Badge key={tg} variant="secondary" className="text-xs gap-1">
                                    <Tag className="h-3 w-3" />{tg}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {r.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                                <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{r.notes}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => openEditor(r)}>
                        <StickyNote className="h-3.5 w-3.5 me-1" />
                        {locale === "ar" ? "ملاحظات" : "Notes"}
                      </Button>
                      {r.candidate_id && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/candidates/${r.candidate_id}`}>
                            {locale === "ar" ? "الملف" : "Profile"}
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openResume(r.resume_url)}>
                        <ExternalLink className="h-3.5 w-3.5 me-1" />
                        {locale === "ar" ? "عرض" : "View"}
                      </Button>
                      <Button size="sm" onClick={() => downloadResume(r.resume_url, r.name)}>
                        <Download className="h-3.5 w-3.5 me-1" />
                        {locale === "ar" ? "تحميل" : "Download"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes & Tags Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir={locale === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {locale === "ar" ? "ملاحظات ووسوم" : "Notes & Tags"}
              {editing && <span className="block text-sm font-normal text-muted-foreground mt-1">{editing.name}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Tag className="h-4 w-4" />{locale === "ar" ? "الوسوم" : "Tags"}
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder={locale === "ar" ? "أضف وسم واضغط Enter" : "Add tag and press Enter"}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editTags.map(tg => (
                    <Badge key={tg} variant="secondary" className="gap-1 pe-1">
                      {tg}
                      <button onClick={() => setEditTags(editTags.filter(x => x !== tg))} className="hover:bg-destructive/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {allTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{locale === "ar" ? "وسوم سابقة:" : "Existing tags:"}</p>
                  <div className="flex flex-wrap gap-1">
                    {allTags.filter(tg => !editTags.includes(tg)).slice(0, 10).map(tg => (
                      <button
                        key={tg}
                        onClick={() => setEditTags([...editTags, tg])}
                        className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-muted"
                      >+ {tg}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <StickyNote className="h-4 w-4" />{locale === "ar" ? "ملاحظات" : "Notes"}
              </label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={5}
                placeholder={locale === "ar" ? "اكتب ملاحظاتك حول هذا المرشح..." : "Write notes about this candidate..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={() => saveMeta.mutate()} disabled={saveMeta.isPending}>
              {saveMeta.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {locale === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
