import { useState, useMemo } from "react";
import { useQuestions, useDeleteQuestion, useBulkDeleteQuestions, useDuplicateQuestion, useBulkUpdateQuestions, Question } from "@/hooks/useQuestionBank";
import { useI18n } from "@/contexts/I18nContext";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, Code, CheckSquare, ToggleLeft, MessageSquare, Sparkles, Copy, LayoutGrid, List, Download, Upload, X, BookOpen, AlertCircle } from "lucide-react";
import AddQuestionDialog from "./AddQuestionDialog";
import AIGenerateDialog from "./AIGenerateDialog";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { useCreateQuestion } from "@/hooks/useQuestionBank";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons: Record<string, any> = {
  multiple_choice: CheckSquare,
  open_ended: MessageSquare,
  code: Code,
  true_false: ToggleLeft,
};

const typeLabels: Record<string, Record<string, string>> = {
  ar: { multiple_choice: "اختيار متعدد", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ", matching: "مطابقة", ordering: "ترتيب" },
  en: { multiple_choice: "Multiple Choice", open_ended: "Open Ended", code: "Code", true_false: "True/False", matching: "Matching", ordering: "Ordering" },
};

const diffLabels: Record<string, Record<string, string>> = {
  ar: { easy: "سهل", medium: "متوسط", hard: "صعب" },
  en: { easy: "Easy", medium: "Medium", hard: "Hard" },
};

const diffColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export default function QuestionsList() {
  const { locale, t } = useI18n();
  const { data: questions = [], isLoading } = useQuestions();
  const { data: jobs = [] } = useJobs();
  const deleteMutation = useDeleteQuestion();
  const bulkDeleteMutation = useBulkDeleteQuestions();
  const duplicateMutation = useDuplicateQuestion();
  const bulkUpdate = useBulkUpdateQuestions();
  const createMutation = useCreateQuestion();
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [search, setSearch] = useState("");
  const [filterJob, setFilterJob] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => questions.filter(q => {
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterJob !== "all" && q.job_id !== filterJob) return false;
    if (filterType !== "all" && q.question_type !== filterType) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    return true;
  }), [questions, search, filterJob, filterType, filterDifficulty]);

  const allSelected = filtered.length > 0 && filtered.every(q => selectedIds.includes(q.id));
  const someSelected = selectedIds.length > 0;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filtered.some(q => q.id === id)));
    else setSelectedIds(prev => Array.from(new Set([...prev, ...filtered.map(q => q.id)])));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExport = () => {
    const rows = filtered.map(q => ({
      [locale === "ar" ? "نص السؤال" : "Question"]: q.question_text,
      [locale === "ar" ? "النوع" : "Type"]: typeLabels[locale]?.[q.question_type] || q.question_type,
      [locale === "ar" ? "الصعوبة" : "Difficulty"]: diffLabels[locale]?.[q.difficulty] || q.difficulty,
      [locale === "ar" ? "النقاط" : "Points"]: q.points,
      [locale === "ar" ? "الإجابة الصحيحة" : "Correct Answer"]: q.correct_answer || "",
      [locale === "ar" ? "الخيارات" : "Options"]: (q.options || []).map(o => `${o.option_text}${o.is_correct ? " ✓" : ""}`).join(" | "),
      [locale === "ar" ? "الشرح" : "Explanation"]: q.explanation || "",
      [locale === "ar" ? "الوظيفة" : "Job"]: q.jobs?.title || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), locale === "ar" ? "الأسئلة" : "Questions");
    XLSX.writeFile(wb, `questions-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: locale === "ar" ? "تم التصدير بنجاح" : "Exported successfully" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      let count = 0;
      for (const row of rows) {
        const text = row["نص السؤال"] || row["Question"] || row.question_text;
        if (!text) continue;
        const typeStr = String(row["النوع"] || row["Type"] || "open_ended").toLowerCase();
        const diffStr = String(row["الصعوبة"] || row["Difficulty"] || "medium").toLowerCase();
        const type = typeStr.includes("اختيار") || typeStr.includes("multiple") ? "multiple_choice" :
                     typeStr.includes("صح") || typeStr.includes("true") ? "true_false" :
                     typeStr.includes("كود") || typeStr.includes("code") ? "code" : "open_ended";
        const diff = diffStr.includes("سهل") || diffStr.includes("easy") ? "easy" :
                     diffStr.includes("صعب") || diffStr.includes("hard") ? "hard" : "medium";
        const optsRaw = String(row["الخيارات"] || row["Options"] || "");
        const options = optsRaw ? optsRaw.split("|").map((s, i) => {
          const isCorrect = s.includes("✓");
          return { option_text: s.replace("✓", "").trim(), is_correct: isCorrect, sort_order: i };
        }).filter(o => o.option_text) : undefined;
        await createMutation.mutateAsync({
          question: {
            question_text: text,
            question_type: type as any,
            difficulty: diff as any,
            job_id: null,
            points: Number(row["النقاط"] || row["Points"]) || 1,
            correct_answer: row["الإجابة الصحيحة"] || row["Correct Answer"] || null,
            explanation: row["الشرح"] || row["Explanation"] || null,
            code_language: null,
            category: "",
            time_limit_seconds: null,
            is_active: true,
          },
          options: type === "multiple_choice" ? options : undefined,
        });
        count++;
      }
      toast({ title: locale === "ar" ? `تم استيراد ${count} سؤال` : `${count} questions imported` });
    } catch (err: any) {
      toast({ title: locale === "ar" ? "فشل الاستيراد" : "Import failed", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  // Quick stats computed from questions state
  const quickStats = useMemo(() => {
    const total = questions.length;
    const mcq = questions.filter(q => q.question_type === "multiple_choice").length;
    const coding = questions.filter(q => q.question_type === "code").length;
    const open = questions.filter(q => q.question_type === "open_ended").length;
    return { total, mcq, coding, open };
  }, [questions]);

  const QuestionCard = ({ q }: { q: Question }) => {
    const Icon = typeIcons[q.question_type] || CheckSquare;
    const isSelected = selectedIds.includes(q.id);
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        <Card className={`hover:shadow-lg transition-all duration-300 bg-card/40 backdrop-blur-xl border border-border/40 hover:border-primary/20 ${isSelected ? "ring-1 ring-primary border-primary/30 bg-primary/5 shadow-md shadow-primary/5" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="pt-1 flex items-center shrink-0">
                <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(q.id)} className="h-4.5 w-4.5 rounded-md border-border/80 text-primary focus-visible:ring-primary" />
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/10">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground/90 leading-relaxed">{q.question_text}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="outline" className="text-[10px] font-bold bg-muted/30 border-border/60">{typeLabels[locale]?.[q.question_type] || q.question_type}</Badge>
                  <Badge className={`text-[10px] font-bold border ${diffColors[q.difficulty]}`}>{diffLabels[locale]?.[q.difficulty] || q.difficulty}</Badge>
                  <Badge variant="secondary" className="text-[10px] font-bold bg-secondary/80">{q.points} {t("qbank.points")}</Badge>
                  {q.jobs && <Badge variant="outline" className="text-[10px] font-bold border-primary/10 text-primary bg-primary/5">{q.jobs.title}</Badge>}
                  {q.code_language && <Badge variant="outline" className="text-[10px] font-bold border-indigo-500/20 text-indigo-500 bg-indigo-500/5">{q.code_language}</Badge>}
                </div>
                {view === "list" && q.question_type === "multiple_choice" && q.options && q.options.length > 0 && (
                  <div className="mt-3.5 space-y-1.5 border-t border-border/30 pt-3">
                    {q.options.map((o, i) => (
                      <div key={i} className={`text-xs flex items-center gap-2.5 p-1.5 rounded-lg border transition-colors ${o.is_correct ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/20" : "text-muted-foreground border-transparent hover:bg-muted/30"}`}>
                        <span className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${o.is_correct ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{o.option_text}</span>
                        {o.is_correct && <span className="ms-auto text-[10px] font-black uppercase tracking-wider">✓ {locale === "ar" ? "الإجابة الصحيحة" : "Correct"}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {view === "list" && q.question_type === "true_false" && q.correct_answer && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-2.5 bg-green-500/10 border border-green-500/20 rounded-lg p-2 inline-flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{t("qbank.correctAnswer")}: {q.correct_answer === "true" ? t("qbank.true") : t("qbank.false")}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => duplicateMutation.mutate(q)} title={locale === "ar" ? "نسخ" : "Duplicate"} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                  <Copy className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-all">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black text-foreground flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span>{t("qbank.deleteConfirmTitle")}</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">{t("qbank.deleteConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl font-bold text-xs h-10 border-border/80 hover:bg-muted bg-transparent">{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(q.id)} className="rounded-xl font-bold text-xs h-10 bg-destructive hover:bg-destructive/90 text-white border-none">
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 relative z-10">
      
      {/* Upper Quick Stats Row */}
      {!isLoading && questions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm p-4 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/10"><BookOpen className="w-5 h-5" /></div>
              <div>
                <p className="text-xl font-black text-foreground tracking-tight">{quickStats.total}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{locale === "ar" ? "إجمالي الأسئلة" : "Total Questions"}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm p-4 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10"><CheckSquare className="w-5 h-5" /></div>
              <div>
                <p className="text-xl font-black text-foreground tracking-tight">{quickStats.mcq}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{locale === "ar" ? "اختيار متعدد" : "Multiple Choice"}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm p-4 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10"><Code className="w-5 h-5" /></div>
              <div>
                <p className="text-xl font-black text-foreground tracking-tight">{quickStats.coding}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{locale === "ar" ? "أسئلة الكود" : "Coding Tests"}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm p-4 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/10"><MessageSquare className="w-5 h-5" /></div>
              <div>
                <p className="text-xl font-black text-foreground tracking-tight">{quickStats.open}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{locale === "ar" ? "أسئلة مفتوحة" : "Open Ended"}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card/30 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-2.5 flex-1 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("qbank.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="ps-10 rounded-xl bg-muted/40 border-border/70 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50" />
            </div>
            <Select value={filterJob} onValueChange={setFilterJob}>
              <SelectTrigger className="w-[160px] rounded-xl bg-muted/40 border-border/70 text-xs h-11 focus:ring-1 focus:ring-primary"><SelectValue placeholder={t("qbank.allJobs")} /></SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                <SelectItem value="all">{t("qbank.allJobs")}</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] rounded-xl bg-muted/40 border-border/70 text-xs h-11 focus:ring-1 focus:ring-primary"><SelectValue placeholder={t("qbank.allTypes")} /></SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                <SelectItem value="all">{t("qbank.allTypes")}</SelectItem>
                {Object.keys(typeLabels.ar).map(k => <SelectItem key={k} value={k}>{typeLabels[locale]?.[k] || k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[140px] rounded-xl bg-muted/40 border-border/70 text-xs h-11 focus:ring-1 focus:ring-primary"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                <SelectItem value="all">{locale === "ar" ? "كل الصعوبات" : "All Difficulties"}</SelectItem>
                <SelectItem value="easy">{diffLabels[locale]?.easy}</SelectItem>
                <SelectItem value="medium">{diffLabels[locale]?.medium}</SelectItem>
                <SelectItem value="hard">{diffLabels[locale]?.hard}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto justify-end items-center shrink-0">
            <div className="flex border border-border/80 rounded-xl overflow-hidden text-xs bg-muted/40 h-10 shrink-0">
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="rounded-none h-10 w-10 hover:bg-muted" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="rounded-none h-10 w-10 hover:bg-muted" onClick={() => setView("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl flex items-center gap-1.5 h-10 text-xs font-bold border-border/80 hover:bg-muted bg-card/60 shrink-0">
              <Download className="h-4 w-4" /> <span>{locale === "ar" ? "تصدير" : "Export"}</span>
            </Button>
            <label className="shrink-0">
              <Button variant="outline" size="sm" asChild className="rounded-xl flex items-center gap-1.5 h-10 text-xs font-bold border-border/80 hover:bg-muted bg-card/60 cursor-pointer">
                <span><Upload className="h-4 w-4" /> <span>{locale === "ar" ? "استيراد" : "Import"}</span></span>
              </Button>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            </label>
            <Button variant="outline" onClick={() => setShowAI(true)} className="rounded-xl flex items-center gap-1.5 h-10 text-xs font-bold border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 shrink-0">
              <Sparkles className="h-4 w-4" /> <span>{t("qbank.ai.generate")}</span>
            </Button>
            <Button onClick={() => setShowAdd(true)} className="rounded-xl flex items-center gap-1.5 h-10 text-xs font-bold shadow-md shadow-primary/10 bg-primary hover:bg-primary/95 text-white border-none shrink-0">
              <Plus className="h-4 w-4" /> <span>{t("qbank.addQuestion")}</span>
            </Button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        <AnimatePresence>
          {someSelected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 relative z-10"
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-4.5 w-4.5 rounded-md border-primary/30" />
                <span className="text-xs font-bold text-primary">
                  {locale === "ar" ? `${selectedIds.length} سؤال محدد` : `${selectedIds.length} selected`}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Select onValueChange={(v) => bulkUpdate.mutate({ ids: selectedIds, updates: { difficulty: v as any } })}>
                  <SelectTrigger className="h-9 w-[160px] text-xs rounded-xl bg-card/60 border-primary/20 focus:ring-1 focus:ring-primary"><SelectValue placeholder={locale === "ar" ? "تغيير الصعوبة" : "Change Difficulty"} /></SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                    <SelectItem value="easy">{diffLabels[locale]?.easy}</SelectItem>
                    <SelectItem value="medium">{diffLabels[locale]?.medium}</SelectItem>
                    <SelectItem value="hard">{diffLabels[locale]?.hard}</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5 h-9 rounded-xl text-xs font-bold">
                      <Trash2 className="h-3.5 w-3.5" /> {locale === "ar" ? "حذف الكل" : "Delete All"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black text-foreground flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span>{locale === "ar" ? `حذف ${selectedIds.length} سؤال؟` : `Delete ${selectedIds.length} questions?`}</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">{t("qbank.deleteConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl font-bold text-xs h-10 border-border/80 hover:bg-muted bg-transparent">{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { bulkDeleteMutation.mutate(selectedIds); setSelectedIds([]); }} className="rounded-xl font-bold text-xs h-10 bg-destructive hover:bg-destructive/90 text-white border-none">
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" size="icon" onClick={() => setSelectedIds([])} className="h-9 w-9 rounded-xl hover:bg-primary/10">
                  <X className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Select-all top bar */}
        {filtered.length > 0 && !someSelected && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground px-2 font-semibold">
            <Checkbox checked={false} onCheckedChange={toggleAll} className="h-4.5 w-4.5 rounded-md border-border/80" />
            <span>{locale === "ar" ? `${filtered.length} سؤال متاح` : `${filtered.length} questions available`}</span>
          </div>
        )}
      </div>

      {/* List / Grid content */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground font-semibold flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground text-xs font-bold leading-relaxed">
            {t("qbank.noQuestions")}
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.04 } }
          }}
          initial="hidden"
          animate="show"
          className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}
        >
          {filtered.map(q => <QuestionCard key={q.id} q={q} />)}
        </motion.div>
      )}

      <AddQuestionDialog open={showAdd} onOpenChange={setShowAdd} />
      <AIGenerateDialog open={showAI} onOpenChange={setShowAI} />
    </div>
  );
}
