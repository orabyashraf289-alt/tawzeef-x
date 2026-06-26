import { useState, useMemo } from "react";
import { useCreateAssessment, useQuestions } from "@/hooks/useQuestionBank";
import { useJobs } from "@/hooks/useJobs";
import { useI18n } from "@/contexts/I18nContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, Search, GripVertical, X, ListOrdered, Sparkles, Clock, Award, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preselectedJobId?: string;
}

export default function CreateAssessmentDialog({ open, onOpenChange, preselectedJobId }: Props) {
  const { t, locale } = useI18n();
  const { data: questions = [] } = useQuestions();
  const { data: jobs = [] } = useJobs();
  const createMutation = useCreateAssessment();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobId, setJobId] = useState(preselectedJobId || "");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(70);
  const [isRandomized, setIsRandomized] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  };

  // Smart filtering: show job-specific questions first, then general questions
  const filteredQuestions = useMemo(() => {
    let qs = [...questions];
    
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      qs = qs.filter(question => 
        question.question_text.toLowerCase().includes(q) ||
        (question.category || "").toLowerCase().includes(q)
      );
    }

    if (jobId && jobId !== "none") {
      // Sort: job-specific first, then general (no job_id), then other jobs
      qs.sort((a, b) => {
        const aMatch = a.job_id === jobId ? 0 : a.job_id ? 2 : 1;
        const bMatch = b.job_id === jobId ? 0 : b.job_id ? 2 : 1;
        return aMatch - bMatch;
      });
    }

    return qs;
  }, [questions, jobId, searchQuery]);

  // Auto-set title based on job
  const handleJobChange = (newJobId: string) => {
    setJobId(newJobId);
    if (newJobId && newJobId !== "none" && !title) {
      const job = jobs.find(j => j.id === newJobId);
      if (job) setTitle(`اختبار - ${job.title}`);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || selectedQuestions.length === 0) return;
    createMutation.mutate({
      assessment: { title, description, job_id: jobId && jobId !== "none" ? jobId : null, duration_minutes: duration, passing_score: passingScore, is_randomized: isRandomized },
      questionIds: selectedQuestions,
    }, {
      onSuccess: () => {
        setTitle(""); setDescription(""); setJobId(""); setDuration(60); setPassingScore(70); setIsRandomized(false); setSelectedQuestions([]);
        setSearchQuery("");
        onOpenChange(false);
      }
    });
  };

  const typeLabels: Record<string, string> = locale === "ar"
    ? { multiple_choice: "اختيار", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ" }
    : { multiple_choice: "MC", open_ended: "Open", code: "Code", true_false: "T/F" };

  const difficultyLabels: Record<string, { label: string; color: string }> = {
    easy: { label: "سهل", color: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" },
    medium: { label: "متوسط", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
    hard: { label: "صعب", color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" },
  };

  const selectedJob = jobId && jobId !== "none" ? jobs.find(j => j.id === jobId) : null;
  const jobQuestionCount = jobId && jobId !== "none" ? questions.filter(q => q.job_id === jobId).length : 0;

  // Estimates points & duration
  const totalPoints = useMemo(() => {
    return selectedQuestions.reduce((s, qid) => s + (questions.find(q => q.id === qid)?.points || 0), 0);
  }, [selectedQuestions, questions]);

  const estimatedDuration = useMemo(() => {
    return Math.max(5, selectedQuestions.length * 2);
  }, [selectedQuestions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-6">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
              <ListOrdered className="h-5 w-5" />
            </div>
            <span>{t("qbank.createAssessment")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          
          {/* Job & Title Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="linkedJob" className="text-xs font-bold text-foreground/85">{t("qbank.linkedJob")}</Label>
              <Select value={jobId || "none"} onValueChange={handleJobChange}>
                <SelectTrigger id="linkedJob" className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t("qbank.noJob")} />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                  <SelectItem value="none">{t("qbank.noJob")}</SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{j.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedJob && jobQuestionCount > 0 && (
                <p className="text-[10px] text-primary font-bold mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>📋 {jobQuestionCount} {locale === "ar" ? "سؤال مخصص لهذه الوظيفة" : "questions customized for this job"}</span>
                </p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-foreground/85">{t("qbank.assessmentTitle")}</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 font-semibold" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs font-bold text-foreground/85">{t("qbank.description")}</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs focus:ring-1 focus:ring-primary focus:border-primary/50 font-medium" />
          </div>

          {/* Duration & Passing Score & Randomize */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-bold text-foreground/85">{t("qbank.duration")} ({locale === "ar" ? "دقيقة" : "mins"})</Label>
              <Input id="duration" type="number" min={5} value={duration} onChange={e => setDuration(Number(e.target.value))} className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passingScore" className="text-xs font-bold text-foreground/85">{t("qbank.passingScore")} (%)</Label>
              <Input id="passingScore" type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 font-bold" />
            </div>
            <div className="flex items-end pb-3 sm:pb-3 shrink-0">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Switch checked={isRandomized} onCheckedChange={setIsRandomized} className="data-[state=checked]:bg-primary" />
                <span className="text-xs font-bold text-foreground/80">{t("qbank.randomizeQuestions")}</span>
              </label>
            </div>
          </div>

          {/* Select Questions panel */}
          <div className="space-y-2 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground/85">{t("qbank.selectQuestions")} ({selectedQuestions.length} {t("qbank.selected")})</Label>
              {selectedQuestions.length > 0 && (
                <Button variant="ghost" size="sm" className="text-[10px] font-black h-7 rounded-lg hover:bg-muted text-primary px-2.5" onClick={() => setSelectedQuestions([])}>
                  {locale === "ar" ? "مسح الكل" : "Clear All"}
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative mt-1">
              <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={locale === "ar" ? "ابحث في الأسئلة..." : "Search questions..."}
                className="ps-10 rounded-xl bg-muted/40 border-border/80 text-xs h-10 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
              />
            </div>

            {/* Select Job Questions Shortcut */}
            {jobId && jobId !== "none" && jobQuestionCount > 0 && (
              <Button variant="outline" size="sm" className="w-full mt-2 rounded-xl text-xs font-bold gap-2 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 h-10 shrink-0"
                onClick={() => {
                  const jobQIds = questions.filter(q => q.job_id === jobId).map(q => q.id);
                  setSelectedQuestions(prev => [...new Set([...prev, ...jobQIds])]);
                }}>
                <Briefcase className="w-4 h-4" /> <span>{locale === "ar" ? `تحديد كل أسئلة الوظيفة (${jobQuestionCount})` : `Select all job questions (${jobQuestionCount})`}</span>
              </Button>
            )}

            {/* Questions Scrollable list */}
            <ScrollArea className="h-[200px] border border-border/40 rounded-xl p-3 bg-muted/20 mt-2">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-xs font-bold">{t("qbank.noQuestions")}</p>
              ) : (
                <div className="space-y-2">
                  {filteredQuestions.map(q => {
                    const isJobQuestion = q.job_id === jobId && jobId !== "none";
                    const isSelected = selectedQuestions.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`flex items-start gap-3.5 p-2.5 rounded-xl cursor-pointer hover:bg-muted/50 transition-all border border-transparent ${
                          isSelected ? "bg-primary/5 border-primary/15 shadow-sm" : ""
                        } ${isJobQuestion ? "border-s-2 border-s-primary pl-3" : ""}`}
                        onClick={() => toggleQuestion(q.id)}
                      >
                        <Checkbox checked={isSelected} className="mt-1 h-4 w-4 rounded border-border/85" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground/80 truncate leading-relaxed">{q.question_text}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px] font-bold bg-muted/30 py-0 px-2 rounded-lg">{typeLabels[q.question_type] || q.question_type}</Badge>
                            <Badge variant="secondary" className="text-[9px] font-bold py-0 px-2 rounded-lg">{q.points} pts</Badge>
                            <Badge variant="outline" className={`text-[9px] font-bold py-0 px-2 rounded-lg border-0 ${difficultyLabels[q.difficulty]?.color || ""}`}>
                              {difficultyLabels[q.difficulty]?.label || q.difficulty}
                            </Badge>
                            {isJobQuestion && (
                              <Badge className="text-[9px] bg-primary/15 text-primary border-none py-0 px-2 font-black rounded-lg">{locale === "ar" ? "خاص بالوظيفة" : "Job Specific"}</Badge>
                            )}
                            {q.jobs && !isJobQuestion && (
                              <Badge variant="outline" className="text-[9px] py-0 px-2 rounded-lg">{q.jobs.title}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Ordered Selected Questions list with Premium Drag & Drop styling */}
          {selectedQuestions.length > 0 && (
            <div className="space-y-2.5 border-t border-border/40 pt-4">
              <Label className="flex items-center gap-2 text-xs font-bold text-foreground/85">
                <ListOrdered className="h-4.5 w-4.5 text-primary" />
                <span>{locale === "ar" ? "ترتيب الأسئلة (اسحب للترتيب)" : "Question Order (drag to reorder)"}</span>
              </Label>
              
              <div className="border border-border/40 rounded-xl p-2.5 max-h-[220px] overflow-y-auto space-y-2 bg-muted/10">
                {selectedQuestions.map((qid, idx) => {
                  const q = questions.find(x => x.id === qid);
                  if (!q) return null;
                  const isDragging = idx === draggedIdx;
                  return (
                    <div
                      key={qid}
                      draggable
                      onDragStart={(e) => {
                        setDraggedIdx(idx);
                        e.dataTransfer.setData("text/plain", String(idx));
                      }}
                      onDragEnd={() => setDraggedIdx(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = Number(e.dataTransfer.getData("text/plain"));
                        if (fromIdx === idx) return;
                        const newOrder = [...selectedQuestions];
                        const [moved] = newOrder.splice(fromIdx, 1);
                        newOrder.splice(idx, 0, moved);
                        setSelectedQuestions(newOrder);
                        setDraggedIdx(null);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70 hover:border-primary/30 cursor-move group transition-all duration-200 ${
                        isDragging ? "opacity-55 border-dashed border-primary scale-[0.98]" : "hover:shadow-sm"
                      }`}
                    >
                      <GripVertical className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                      <span className="text-xs font-bold text-foreground/80 flex-1 line-clamp-1">{q.question_text}</span>
                      <Badge variant="outline" className="text-[9px] py-0.5 px-2 rounded-lg font-bold shrink-0">{q.points}p</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" onClick={() => toggleQuestion(qid)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Metrics Row */}
              <div className="flex justify-between items-center bg-card/40 border border-border/40 p-3 rounded-xl text-xs font-bold mt-2">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4.5 h-4.5 text-amber-500" />
                  <span>{locale === "ar" ? "إجمالي النقاط" : "Total Points"}: <strong className="text-primary text-sm font-black">{totalPoints}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-indigo-500" />
                  <span>{locale === "ar" ? "وقت تقديري" : "Est. Time"}: <strong className="text-primary text-sm font-black">{estimatedDuration} {t("qbank.minutes")}</strong></span>
                </span>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-border/40 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-bold border-border/80 hover:bg-muted bg-transparent h-11 px-5">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || selectedQuestions.length === 0 || createMutation.isPending} className="rounded-xl h-11 px-5 text-xs font-bold shadow-lg shadow-primary/10 bg-primary hover:bg-primary/95 text-white border-none transition-all hover:scale-[1.01]">
              {createMutation.isPending ? t("common.loading") : t("qbank.createAssessment")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
