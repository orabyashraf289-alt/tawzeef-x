import { useState, useMemo } from "react";
import EmptyState from "@/components/EmptyState";
import DashboardLayout from "@/components/DashboardLayout";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/hooks/useJobs";
import { Star, Search, Trash2, User, Briefcase, Mail, Phone, Tag, Plus, X, Bot, Filter, ArrowUpDown, RefreshCw, MessageSquare, Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

import { TalentPoolSkeleton } from "@/components/Skeletons";

export default function TalentPool() {
  const { user } = useAuth();
  const { t, locale, dir } = useI18n();
  const queryClient = useQueryClient();
  const { data: jobs } = useJobs();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "ai_score" | "rating">("newest");
  const [editNotesEntry, setEditNotesEntry] = useState<any>(null);
  const [notesForm, setNotesForm] = useState({ notes: "", rating: 0 });
  const [addTagEntry, setAddTagEntry] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [reassignEntry, setReassignEntry] = useState<any>(null);
  const [reassignJobId, setReassignJobId] = useState("");

  const { data: poolEntries, isLoading } = useQuery({
    queryKey: ["talent-pool", user?.id],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_pool")
        .select("*, candidates(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("talent_pool").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      toast({ title: locale === "en" ? "Removed from talent pool" : "تم الإزالة من قاعدة المواهب" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes, tags }: { id: string; notes: string; tags?: string[] }) => {
      const updateData: any = { notes };
      if (tags) updateData.tags = tags;
      const { error } = await supabase.from("talent_pool").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      toast({ title: locale === "en" ? "Notes updated" : "تم تحديث الملاحظات" });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ id, currentTags, newTag }: { id: string; currentTags: string[]; newTag: string }) => {
      const tags = [...new Set([...currentTags, newTag])];
      const { error } = await supabase.from("talent_pool").update({ tags }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      setNewTag("");
      setAddTagEntry(null);
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async ({ id, currentTags, tag }: { id: string; currentTags: string[]; tag: string }) => {
      const tags = currentTags.filter(t => t !== tag);
      const { error } = await supabase.from("talent_pool").update({ tags }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["talent-pool"] }),
  });

  const updateCandidateRating = useMutation({
    mutationFn: async ({ candidateId, rating }: { candidateId: string; rating: number }) => {
      const { error } = await supabase.from("candidates").update({ rating }).eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["talent-pool"] }),
  });

  // Reassign candidate to new job
  const reassignMutation = useMutation({
    mutationFn: async ({ candidateId, jobId }: { candidateId: string; jobId: string }) => {
      const job = (jobs || []).find(j => j.id === jobId);
      const { error } = await supabase.from("candidates").update({
        job_id: jobId,
        role: job?.title || undefined,
        stage: "تقديم الطلب",
        status: "قيد المراجعة",
      }).eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setReassignEntry(null);
      setReassignJobId("");
      toast({ title: locale === "en" ? "Candidate reassigned to new job" : "تم تعيين المرشح لوظيفة جديدة" });
    },
  });

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (poolEntries || []).forEach(e => e.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags);
  }, [poolEntries]);

  // Filter & sort
  const entries = useMemo(() => {
    let filtered = (poolEntries || []).filter(e => {
      const c = e.candidates;
      if (!c) return false;
      const matchSearch = !search.trim() || c.name?.includes(search) || c.email?.includes(search) || c.role?.includes(search) || c.skills?.some((s: string) => s.includes(search));
      const matchTag = tagFilter === "all" || (e.tags || []).includes(tagFilter);
      const matchScore = scoreFilter === "all" ||
        (scoreFilter === "high" && (c.ai_score ?? 0) >= 70) ||
        (scoreFilter === "med" && (c.ai_score ?? 0) >= 40 && (c.ai_score ?? 0) < 70) ||
        (scoreFilter === "low" && (c.ai_score ?? 0) < 40 && c.ai_score != null);
      return matchSearch && matchTag && matchScore;
    });

    filtered.sort((a, b) => {
      const ca = a.candidates, cb = b.candidates;
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "ai_score") return (cb?.ai_score ?? -1) - (ca?.ai_score ?? -1);
      if (sortBy === "rating") return (cb?.rating ?? 0) - (ca?.rating ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [poolEntries, search, tagFilter, scoreFilter, sortBy]);

  const getInitials = (name: string) => name?.split(" ").map((n: string) => n[0]).join("") || "?";
  const hasFilters = search || tagFilter !== "all" || scoreFilter !== "all";

  if (isLoading) {
    return (
      <DashboardLayout>
        <TalentPoolSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6" dir={dir}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{locale === "en" ? "Talent Pool" : "قاعدة المواهب"}</h1>
                <p className="text-sm text-muted-foreground">{locale === "en" ? "Outstanding candidates saved for future opportunities" : "المرشحون المميزون المحفوظون للوظائف المستقبلية"}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {entries.length}{hasFilters ? ` / ${(poolEntries || []).length}` : ""} {locale === "en" ? "candidates" : "مرشح"}
            </Badge>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={locale === "en" ? "Search by name, skill, email..." : "بحث بالاسم أو المهارة أو البريد..."}
              className={cn("h-9 text-sm", dir === "rtl" ? "pr-9" : "pl-9")} />
          </div>
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
                <SelectValue placeholder={locale === "en" ? "All Tags" : "كل الوسوم"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "en" ? "All Tags" : "كل الوسوم"}</SelectItem>
                {allTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
              <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
              <SelectValue placeholder={locale === "en" ? "AI Score" : "تقييم AI"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === "en" ? "All Scores" : "كل التقييمات"}</SelectItem>
              <SelectItem value="high">{locale === "en" ? "High (70+)" : "عالي (70+)"}</SelectItem>
              <SelectItem value="med">{locale === "en" ? "Medium (40-69)" : "متوسط (40-69)"}</SelectItem>
              <SelectItem value="low">{locale === "en" ? "Low (<40)" : "منخفض (<40)"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{locale === "en" ? "Newest" : "الأحدث"}</SelectItem>
              <SelectItem value="oldest">{locale === "en" ? "Oldest" : "الأقدم"}</SelectItem>
              <SelectItem value="ai_score">{locale === "en" ? "AI Score" : "تقييم AI"}</SelectItem>
              <SelectItem value="rating">{locale === "en" ? "Rating" : "التقييم"}</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border/50 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1"><div className="h-4 bg-muted rounded w-2/3" /><div className="h-3 bg-muted rounded w-1/2" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 && !hasFilters ? (
          <EmptyState
            icon={Star}
            title={locale === "en" ? "Talent pool is empty" : "قاعدة المواهب فارغة"}
            description={locale === "en" ? "Add outstanding candidates from the candidates page to save them here." : "أضف مرشحين مميزين من صفحة المرشحين لحفظهم هنا والرجوع إليهم مستقبلاً."}
          />

        ) : entries.length === 0 && hasFilters ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{locale === "en" ? "No matching results" : "لا يوجد نتائج مطابقة"}</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {entries.map((entry, i) => {
                const c = entry.candidates;
                if (!c) return null;
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                    <Card className="border-border/50 hover:shadow-md hover:border-warning/20 transition-all group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 border-2 border-warning/20">
                              <AvatarFallback className="bg-warning/10 text-warning font-bold text-sm">
                                {getInitials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link to={`/candidates/${c.id}`} className="font-bold text-sm hover:text-primary transition-colors">
                                {c.name}
                              </Link>
                              {c.role && <p className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.role}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                    onClick={() => { setEditNotesEntry(entry); setNotesForm({ notes: entry.notes || "", rating: c.rating || 0 }); }}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{locale === "en" ? "Edit notes" : "تعديل الملاحظات"}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                    onClick={() => setReassignEntry(entry)}>
                                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{locale === "en" ? "Reassign to job" : "تعيين لوظيفة"}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                                    onClick={() => removeMutation.mutate(entry.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{locale === "en" ? "Remove" : "إزالة"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-emerald-600" />{c.email}</p>}
                          {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-600" />{c.phone}</p>}
                          {c.experience && <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-emerald-600" />{c.experience}</p>}
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold w-fit mt-1">
                            🏅 رخصة مهنية سارية 🇸🇦 (ETEC)
                          </Badge>
                        </div>

                        {/* Rating */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(v => (
                              <button key={v} onClick={() => updateCandidateRating.mutate({ candidateId: c.id, rating: v })}
                                className="focus:outline-none">
                                <Star className={cn("w-3.5 h-3.5 transition-all", v <= (c.rating || 0) ? "fill-warning text-warning" : "text-border hover:text-warning/40")} />
                              </button>
                            ))}
                          </div>
                          {c.ai_score != null && (
                            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 gap-0.5 border-0",
                              c.ai_score >= 70 ? "bg-green-500/10 text-green-600" :
                              c.ai_score >= 40 ? "bg-amber-500/10 text-amber-600" :
                              "bg-destructive/10 text-destructive"
                            )}>
                              <Bot className="w-2.5 h-2.5" />{c.ai_score}%
                            </Badge>
                          )}
                        </div>

                        {/* Skills */}
                        {c.skills?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.skills.slice(0, 4).map((s: string, j: number) => (
                              <Badge key={j} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/10">{s}</Badge>
                            ))}
                            {c.skills.length > 4 && <span className="text-[10px] text-muted-foreground">+{c.skills.length - 4}</span>}
                          </div>
                        )}

                        {/* Tags */}
                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                          {(entry.tags || []).map((tag: string, j: number) => (
                            <Badge key={j} className="text-[10px] bg-warning/10 text-warning border-0 gap-1 pe-1">
                              {tag}
                              <button onClick={() => removeTagMutation.mutate({ id: entry.id, currentTags: entry.tags || [], tag })}
                                className="hover:text-destructive transition-colors">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                          {addTagEntry === entry.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                                placeholder={locale === "en" ? "Tag..." : "وسم..."}
                                className="h-5 w-20 text-[10px] px-1.5"
                                onKeyDown={e => { if (e.key === "Enter" && newTag.trim()) addTagMutation.mutate({ id: entry.id, currentTags: entry.tags || [], newTag: newTag.trim() }); }} />
                              <button onClick={() => { if (newTag.trim()) addTagMutation.mutate({ id: entry.id, currentTags: entry.tags || [], newTag: newTag.trim() }); }}
                                className="text-primary"><Check className="w-3 h-3" /></button>
                              <button onClick={() => { setAddTagEntry(null); setNewTag(""); }}
                                className="text-muted-foreground"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <button onClick={() => setAddTagEntry(entry.id)}
                              className="text-muted-foreground/50 hover:text-warning transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Notes */}
                        {entry.notes && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 flex-1">{entry.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editNotesEntry} onOpenChange={() => setEditNotesEntry(null)}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{locale === "en" ? "Edit Notes & Rating" : "تعديل الملاحظات والتقييم"} — {editNotesEntry?.candidates?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{locale === "en" ? "Rating" : "التقييم"}</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setNotesForm(f => ({ ...f, rating: v }))}>
                    <Star className={cn("w-7 h-7 transition-all", v <= notesForm.rating ? "fill-warning text-warning" : "text-border hover:text-warning/40")} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{locale === "en" ? "Notes" : "الملاحظات"}</Label>
              <Textarea value={notesForm.notes} onChange={e => setNotesForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={locale === "en" ? "Add private notes..." : "أضف ملاحظات خاصة..."} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotesEntry(null)}>{locale === "en" ? "Cancel" : "إلغاء"}</Button>
            <Button onClick={() => {
              if (editNotesEntry) {
                updateNotesMutation.mutate({ id: editNotesEntry.id, notes: notesForm.notes });
                if (editNotesEntry.candidates) {
                  updateCandidateRating.mutate({ candidateId: editNotesEntry.candidates.id, rating: notesForm.rating });
                }
                setEditNotesEntry(null);
              }
            }}>{locale === "en" ? "Save" : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignEntry} onOpenChange={() => setReassignEntry(null)}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{locale === "en" ? "Reassign to New Job" : "تعيين لوظيفة جديدة"} — {reassignEntry?.candidates?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{locale === "en" ? "Select Job" : "اختر الوظيفة"}</Label>
              <Select value={reassignJobId} onValueChange={setReassignJobId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={locale === "en" ? "Choose a job..." : "اختر وظيفة..."} />
                </SelectTrigger>
                <SelectContent>
                  {(jobs || []).filter(j => j.status === "نشطة").map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.title} — {j.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {locale === "en" ? "The candidate will be moved to the application stage for the selected job." : "سيتم نقل المرشح إلى مرحلة تقديم الطلب للوظيفة المختارة."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignEntry(null)}>{locale === "en" ? "Cancel" : "إلغاء"}</Button>
            <Button disabled={!reassignJobId} onClick={() => {
              if (reassignEntry?.candidates?.id && reassignJobId) {
                reassignMutation.mutate({ candidateId: reassignEntry.candidates.id, jobId: reassignJobId });
              }
            }}>{locale === "en" ? "Reassign" : "تعيين"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
