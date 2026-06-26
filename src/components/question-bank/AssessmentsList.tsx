import { useState, useMemo } from "react";
import { useAssessments, useDeleteAssessment, useDuplicateAssessment, useToggleAssessmentActive } from "@/hooks/useQuestionBank";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Copy, Users, Clock, Check, ExternalLink, Search, FileQuestion, Power } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CreateAssessmentDialog from "./CreateAssessmentDialog";
import AssessmentResponsesDialog from "./AssessmentResponsesDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AssessmentsList() {
  const { t, locale } = useI18n();
  const { data: assessments = [], isLoading } = useAssessments();
  const deleteMutation = useDeleteAssessment();
  const duplicateMutation = useDuplicateAssessment();
  const toggleMutation = useToggleAssessmentActive();
  const [showCreate, setShowCreate] = useState(false);
  const [viewResponses, setViewResponses] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return assessments.filter(a => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterActive === "active" && !a.is_active) return false;
      if (filterActive === "inactive" && a.is_active) return false;
      return true;
    });
  }, [assessments, search, filterActive]);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/assessment/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("qbank.linkCopied") });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={locale === "ar" ? "ابحث عن اختبار..." : "Search assessments..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <div className="flex border rounded-md overflow-hidden text-xs">
            {(["all", "active", "inactive"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterActive(s)}
                className={`px-3 py-2 transition-colors ${filterActive === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {s === "all" ? (locale === "ar" ? "الكل" : "All") : s === "active" ? t("qbank.active") : t("qbank.inactive")}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("qbank.createAssessment")}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("qbank.noAssessments")}</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => {
            const qCount = a.assessment_questions?.length || 0;
            return (
              <Card key={a.id} className="hover:shadow-lg transition-all group">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1">{a.title}</h3>
                      {a.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                    </div>
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: a.id, is_active: v })}
                      title={a.is_active ? t("qbank.active") : t("qbank.inactive")}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-primary">
                        <FileQuestion className="h-3.5 w-3.5" />
                        <span className="font-bold text-sm">{qCount}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{locale === "ar" ? "سؤال" : "Q"}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-bold text-sm">{a.duration_minutes}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t("qbank.minutes")}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-bold text-sm">{a._response_count}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t("qbank.responses")}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      <Check className="h-3 w-3 me-1" /> {a.passing_score}%
                    </Badge>
                    {a.jobs && <Badge variant="secondary" className="text-xs">{a.jobs.title}</Badge>}
                    {a.is_randomized && <Badge variant="outline" className="text-xs">{locale === "ar" ? "عشوائي" : "Random"}</Badge>}
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    <Button variant="outline" size="sm" onClick={() => copyLink(a.token)} className="gap-1 flex-1">
                      <Copy className="h-3 w-3" /> {locale === "ar" ? "نسخ" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/assessment/${a.token}`, "_blank")} className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate(a.id)} className="gap-1" title={locale === "ar" ? "نسخ الاختبار" : "Duplicate"}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setViewResponses(a.id)} className="gap-1 flex-1">
                      <Users className="h-3 w-3" /> {locale === "ar" ? "النتائج" : "Results"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("qbank.deleteAssessmentTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("qbank.deleteAssessmentDesc")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)} className="bg-destructive text-destructive-foreground">
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateAssessmentDialog open={showCreate} onOpenChange={setShowCreate} />
      {viewResponses && (
        <AssessmentResponsesDialog assessmentId={viewResponses} open={!!viewResponses} onOpenChange={() => setViewResponses(null)} />
      )}
    </div>
  );
}
