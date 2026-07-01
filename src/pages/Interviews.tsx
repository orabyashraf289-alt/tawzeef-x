import { useState, useMemo } from "react";
import AIInterviewQuestions from "@/components/AIInterviewQuestions";
import SentimentBadge from "@/components/SentimentBadge";
import DashboardLayout from "@/components/DashboardLayout";
import { InterviewsSkeleton } from "@/components/Skeletons";
import InterviewCalendar from "@/components/InterviewCalendar";
import InterviewEvaluationForm from "@/components/InterviewEvaluationForm";
import { Calendar, Clock, Video, MapPin, User, Star, Plus, CheckCircle, XCircle, ExternalLink, Copy, Check, Link2, FileText, CircleDot, LayoutGrid, List, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInterviews, useAddInterview } from "@/hooks/useJobs";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { stagger, fadeUp } from "@/lib/motion";
import { useI18n } from "@/contexts/I18nContext";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";

const statusStyles: Record<string, string> = {
  "مجدولة": "bg-info/10 text-info border-info/20",
  "مكتملة": "bg-success/10 text-success border-success/20",
  "ملغاة": "bg-destructive/10 text-destructive border-destructive/20",
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("");

const container = stagger(0.05);
const item = fadeUp;

function generateRoomId() {
  return `tawzeef-x-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseAIInterviewReport(notes: string | null) {
  if (!notes || !notes.includes("--- تقييم الذكاء الاصطناعي للمقابلة ---")) return null;
  
  try {
    const recommendation = notes.match(/التوصية:\s*(.*)/)?.[1] || "";
    const scoreStr = notes.match(/التقييم العام:\s*(\d+)/)?.[1] || "";
    const score = scoreStr ? parseInt(scoreStr) : null;
    
    // Extract sections
    const summaryMatch = notes.match(/الملخص:\s*\n([\s\S]*?)(?=\n\nنقاط القوة:|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : "";
    
    const strengthsMatch = notes.match(/نقاط القوة:\s*\n([\s\S]*?)(?=\n\nنقاط الضعف:|$)/);
    const strengths = strengthsMatch 
      ? strengthsMatch[1].split("\n").map(s => s.replace(/^-\s*/, "").trim()).filter(Boolean)
      : [];
      
    const weaknessesMatch = notes.match(/نقاط الضعف:\s*\n([\s\S]*?)(?=\n\nمهارات التواصل:|$)/);
    const weaknesses = weaknessesMatch 
      ? weaknessesMatch[1].split("\n").map(s => s.replace(/^-\s*/, "").trim()).filter(Boolean)
      : [];
      
    const communicationMatch = notes.match(/مهارات التواصل:\s*\n([\s\S]*?)$/);
    const communication = communicationMatch ? communicationMatch[1].trim() : "";
    
    return { recommendation, score, summary, strengths, weaknesses, communication };
  } catch (e) {
    console.error("Failed to parse AI interview report:", e);
    return null;
  }
}

export default function Interviews() {
  const { t } = useI18n();
  const { data: interviews, isLoading } = useInterviews();
  const addInterview = useAddInterview();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasActionPermission } = useScreenPermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ratingDialog, setRatingDialog] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingNotes, setRatingNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [evalDialog, setEvalDialog] = useState<any | null>(null);
  const [form, setForm] = useState({
    candidate_name: "", position: "", date: "", time: "",
    type: "عن بُعد", interviewer: "", meeting_type: "jitsi" as "jitsi" | "external",
    external_link: "",
  });

  const filteredInterviews = useMemo(() => {
    if (!selectedCalDate || viewMode !== "calendar") return interviews || [];
    return (interviews || []).filter(i => i.date === selectedCalDate);
  }, [interviews, selectedCalDate, viewMode]);

  const scheduled = (interviews || []).filter(i => i.status === "مجدولة").length;
  const completed = (interviews || []).filter(i => i.status === "مكتملة").length;
  const cancelled = (interviews || []).filter(i => i.status === "ملغاة").length;

  const handleAdd = async () => {
    if (!form.candidate_name || !form.position || !form.date || !form.time) return;

    let meetingUrl = "";
    if (form.type === "عن بُعد") {
      if (form.meeting_type === "jitsi") {
        const roomId = generateRoomId();
        meetingUrl = `${window.location.origin}/meeting/${roomId}?name=${encodeURIComponent(form.candidate_name)}&position=${encodeURIComponent(form.position)}`;
      } else {
        meetingUrl = form.external_link;
      }
    }

    // Use the existing addInterview then update with meeting_url
    addInterview.mutate(
      { candidate_name: form.candidate_name, position: form.position, date: form.date, time: form.time, type: form.type, interviewer: form.interviewer },
      {
        onSuccess: async () => {
          // Update the latest interview with meeting_url
          if (meetingUrl) {
            const { data: latest } = await supabase
              .from("interviews")
              .select("id")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (latest) {
              await supabase.from("interviews").update({ meeting_url: meetingUrl } as any).eq("id", latest.id);
              queryClient.invalidateQueries({ queryKey: ["interviews"] });
            }
          }
        }
      }
    );
    setDialogOpen(false);
    setForm({ candidate_name: "", position: "", date: "", time: "", type: "عن بُعد", interviewer: "", meeting_type: "jitsi", external_link: "" });
  };

  const handleRate = async () => {
    if (!ratingDialog) return;
    const { error } = await supabase.from("interviews").update({ status: "مكتملة", rating: ratingValue, notes: ratingNotes }).eq("id", ratingDialog.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    toast({ title: t("interviews.ratingSaved") });
    setRatingDialog(null);
    setRatingValue(0);
    setRatingNotes("");
  };

  const handleJoinMeeting = (interview: any) => {
    const meetingUrl = (interview as any).meeting_url;
    const idParam = `&interviewId=${interview.id}`;
    if (!meetingUrl) {
      const roomId = generateRoomId();
      const url = `/meeting/${roomId}?name=${encodeURIComponent(interview.candidate_name)}&position=${encodeURIComponent(interview.position)}${idParam}`;
      navigate(url);
      return;
    }
    if (meetingUrl.includes("/meeting/")) {
      try {
        const parsed = new URL(meetingUrl);
        const path = parsed.pathname + parsed.search + (parsed.search ? "&" : "?") + `interviewId=${interview.id}`;
        navigate(path);
      } catch {
        navigate(meetingUrl + (meetingUrl.includes("?") ? "&" : "?") + `interviewId=${interview.id}`);
      }
    } else {
      window.open(meetingUrl, "_blank");
    }
  };

  const handleCopyLink = (interview: any) => {
    const meetingUrl = (interview as any).meeting_url;
    if (meetingUrl) {
      navigator.clipboard.writeText(meetingUrl);
      setCopiedId(interview.id);
      toast({ title: t("interviews.linkCopied") });
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("interviews.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("interviews.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              <button onClick={() => { setViewMode("list"); setSelectedCalDate(null); }}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
                <List className="w-3.5 h-3.5 inline ml-1" />{t("interviews.listView")}
              </button>
              <button onClick={() => setViewMode("calendar")}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
                <LayoutGrid className="w-3.5 h-3.5 inline ml-1" />{t("interviews.calendarView")}
              </button>
            </div>
            {hasActionPermission("action.create_interviews") && (
              <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Plus className="w-4 h-4 ml-2" />{t("interviews.schedule")}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3">
          {[
            { label: t("interviews.scheduled"), value: scheduled, icon: Calendar, color: "text-info", bg: "bg-info/10" },
            { label: t("interviews.completed"), value: completed, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
            { label: t("interviews.cancelled"), value: cancelled, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-border/50 flex items-center gap-3`}>
              <stat.icon className={cn("w-8 h-8", stat.color)} />
              <div>
                <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-4">
            <InterviewCalendar
              interviews={(interviews || []) as any}
              onSelectDate={setSelectedCalDate}
              selectedDate={selectedCalDate}
            />
            <div className="space-y-2">
              {selectedCalDate && (
                <p className="text-sm font-semibold text-foreground mb-2">
                  {t("interviews.interviewsForDay")} {new Date(selectedCalDate).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                  <span className="text-muted-foreground font-normal mr-2">({filteredInterviews.length})</span>
                </p>
              )}
              {filteredInterviews.length === 0 && selectedCalDate && (
                <div className="text-center py-10 bg-muted/20 rounded-xl border border-border/30">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("interviews.noInterviewsDay")}</p>
                </div>
              )}
              {!selectedCalDate && (
                <div className="text-center py-10 bg-muted/20 rounded-xl border border-border/30">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("interviews.selectDay")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interviews List */}
        {viewMode === "list" && (isLoading ? (
          <InterviewsSkeleton />
        ) : (interviews || []).length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-foreground font-semibold mb-1">{t("interviews.noInterviews")}</p>
            <p className="text-sm text-muted-foreground mb-5">{t("interviews.noInterviewsDesc")}</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 ml-2" />{t("interviews.schedule")}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2">
              {(interviews || []).map((interview) => (
                <div key={interview.id}>
                  <div className="bg-card rounded-xl border border-border/50 hover:shadow-sm hover:border-primary/20 transition-all relative overflow-hidden">
                    <div className={cn("absolute right-0 top-0 bottom-0 w-1",
                      interview.status === "مجدولة" ? "bg-info" : interview.status === "مكتملة" ? "bg-success" : "bg-destructive"
                    )} />
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {getInitials(interview.candidate_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-sm text-foreground">{interview.candidate_name}</h3>
                            <p className="text-xs text-muted-foreground">{interview.position}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs mr-13 sm:mr-0">
                          <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            <Calendar className="w-3 h-3" />{interview.date}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3" />{interview.time?.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            {interview.type === "عن بُعد" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                            {interview.type}
                          </span>
                          {interview.interviewer && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="w-3 h-3" />{interview.interviewer}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusStyles[interview.status] || ""}`}>
                            {interview.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {interview.status === "مكتملة" && interview.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("w-3.5 h-3.5", i < interview.rating! ? "fill-warning text-warning" : "text-border")} />
                              ))}
                            </div>
                          )}
                          {/* Meeting Actions for scheduled remote interviews */}
                          {interview.status === "مجدولة" && interview.type === "عن بُعد" && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                                onClick={() => handleJoinMeeting(interview)}
                              >
                                <Video className="w-3.5 h-3.5" />
                                {t("interviews.join")}
                              </Button>
                              {(interview as any).meeting_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 gap-1"
                                  onClick={() => handleCopyLink(interview)}
                                >
                                  {copiedId === interview.id ? (
                                    <Check className="w-3 h-3 text-success" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                          {interview.status === "مجدولة" && (
                            <>
                              <AIInterviewQuestions position={interview.position} candidateName={interview.candidate_name} />
                              <AddToCalendarButton
                                title={`مقابلة: ${interview.candidate_name} - ${interview.position}`}
                                description={`مقابلة مع ${interview.candidate_name} لوظيفة ${interview.position}${interview.meeting_url ? `\nرابط الاجتماع: ${interview.meeting_url}` : ""}`}
                                location={interview.type === "عن بُعد" ? (interview.meeting_url || "عن بُعد") : "حضوري"}
                                date={interview.date}
                                time={interview.time}
                              />
                              {hasActionPermission("action.edit_interviews") && (
                                <Button size="sm" variant="outline" className="text-xs h-7"
                                  onClick={() => { setRatingDialog(interview); setRatingValue(0); setRatingNotes(""); }}>
                                  {t("interviews.evaluate")}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Notes & Transcript */}
                      {(interview.notes || (interview as any).transcript) && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                          {(() => {
                            const report = parseAIInterviewReport(interview.notes);
                            if (report) {
                              return (
                                <div className="bg-primary/[0.02] border border-primary/10 rounded-xl p-4 space-y-3 mt-2" dir="rtl">
                                  <div className="flex items-center justify-between border-b border-border/50 pb-2 flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                      <span className="text-xs font-bold text-foreground">تحليل المقابلة الذكي بالذكاء الاصطناعي</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                        report.recommendation === "مقبول" || report.recommendation.includes("مقبول") ? "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-500/20" :
                                        report.recommendation === "مرفوض" || report.recommendation.includes("مرفوض") ? "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-500/20" :
                                        "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/20"
                                      )}>
                                        التوصية: {report.recommendation}
                                      </span>
                                      {report.score !== null && (
                                        <span className={cn(
                                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                          report.score >= 80 ? "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-500/20" :
                                          report.score >= 50 ? "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/20" :
                                          "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400"
                                        )}>
                                          تقييم الأداء: {report.score}%
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {report.summary && (
                                    <div className="space-y-1">
                                      <h5 className="text-[11px] font-bold text-foreground">الملخص التنفيذي:</h5>
                                      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/30">
                                        {report.summary}
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                    {report.strengths.length > 0 && (
                                      <div className="space-y-1">
                                        <h5 className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                          <TrendingUp className="w-3.5 h-3.5" />نقاط القوة والميزات:
                                        </h5>
                                        <ul className="space-y-1 bg-green-500/[0.01] border border-green-500/10 rounded-lg p-2.5">
                                          {report.strengths.map((str, idx) => (
                                            <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1">
                                              <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                              <span>{str}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {report.weaknesses.length > 0 && (
                                      <div className="space-y-1">
                                        <h5 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                          <TrendingDown className="w-3.5 h-3.5" />نقاط التحسين والفجوات:
                                        </h5>
                                        <ul className="space-y-1 bg-amber-500/[0.01] border border-amber-500/10 rounded-lg p-2.5">
                                          {report.weaknesses.map((weak, idx) => (
                                            <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1">
                                              <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                              <span>{weak}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {report.communication && (
                                    <div className="space-y-1 pt-1">
                                      <h5 className="text-[11px] font-bold text-foreground">مهارات التواصل واللغة:</h5>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {report.communication}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Fallback to standard plain text notes
                            return (
                              <div className="flex items-start gap-2">
                                <p className="text-xs text-muted-foreground flex-1 whitespace-pre-line">{interview.notes}</p>
                                <SentimentBadge text={interview.notes} context={`ملاحظات مقابلة لوظيفة ${interview.position}`} />
                              </div>
                            );
                          })()}
                          {(interview as any).transcript && (
                            <div className="bg-muted/30 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <FileText className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-semibold text-primary">{t("interviews.transcript")}</span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3">{(interview as any).transcript}</p>
                            </div>
                          )}
                          {(interview as any).recording_url && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                              <CircleDot className="w-3 h-3" />{t("interviews.recordingSaved")}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}

      </div>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{t("interviews.scheduleNew")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("interviews.candidateName")}</Label><Input value={form.candidate_name} onChange={e => setForm({ ...form, candidate_name: e.target.value })} placeholder={t("interviews.candidateName")} /></div>
            <div><Label>{t("interviews.position")}</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder={t("interviews.position")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("interviews.date")}</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>{t("interviews.time")}</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            </div>
            <div><Label>{t("interviews.type")}</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="عن بُعد">{t("interviews.remoteOnline")}</SelectItem>
                  <SelectItem value="حضوري">{t("interviews.onSite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting type for remote interviews */}
            {form.type === "عن بُعد" && (
              <div className="space-y-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  {t("interviews.onlineMeetingType")}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, meeting_type: "jitsi" })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs",
                      form.meeting_type === "jitsi"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Video className="w-5 h-5" />
                    <span className="font-medium">{t("interviews.jitsiMeeting")}</span>
                    <span className="text-[10px] text-muted-foreground">{t("interviews.jitsiDesc")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, meeting_type: "external" })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs",
                      form.meeting_type === "external"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-medium">{t("interviews.externalLink")}</span>
                    <span className="text-[10px] text-muted-foreground">Zoom, Google Meet...</span>
                  </button>
                </div>
                {form.meeting_type === "external" && (
                  <div>
                    <Label className="text-xs">{t("interviews.meetingLink")}</Label>
                    <Input
                      value={form.external_link}
                      onChange={e => setForm({ ...form, external_link: e.target.value })}
                      placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
                      dir="ltr"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            <div><Label>{t("interviews.interviewer")}</Label><Input value={form.interviewer} onChange={e => setForm({ ...form, interviewer: e.target.value })} placeholder={t("interviews.interviewerName")} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Form */}
      <InterviewEvaluationForm
        open={!!evalDialog}
        onClose={() => setEvalDialog(null)}
        candidateName={evalDialog?.candidate_name || ""}
        onSubmit={async ({ rating, notes }) => {
          if (!evalDialog) return;
          const { error } = await supabase.from("interviews").update({ status: "مكتملة", rating, notes }).eq("id", evalDialog.id);
          if (error) { toast({ title: t("common.error", "خطأ"), description: error.message, variant: "destructive" }); return; }
          queryClient.invalidateQueries({ queryKey: ["interviews"] });
          toast({ title: t("interviews.ratingSaved") });
          setEvalDialog(null);
        }}
      />

      {/* Old Rating Dialog (kept for backward compat) */}
      <Dialog open={!!ratingDialog} onOpenChange={() => setRatingDialog(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{t("interviews.quickRate")} — {ratingDialog?.candidate_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("interviews.ratingLabel")}</Label>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setRatingValue(i + 1)}>
                    <Star className={cn("w-8 h-8 transition-all cursor-pointer", i < ratingValue ? "fill-warning text-warning scale-110" : "text-border hover:text-warning/50")} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label>{t("interviews.notes")}</Label><Textarea value={ratingNotes} onChange={e => setRatingNotes(e.target.value)} placeholder={t("interviews.addNotes")} rows={3} /></div>
            <Button variant="link" className="text-xs p-0" onClick={() => { setRatingDialog(null); setEvalDialog(ratingDialog); }}>
              {t("interviews.detailedEval")}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleRate} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={ratingValue === 0}>{t("interviews.saveRating")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
