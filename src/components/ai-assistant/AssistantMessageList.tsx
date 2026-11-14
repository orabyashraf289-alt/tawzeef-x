import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightLeft, BarChart3, Bot, CalendarCheck, CheckCircle, GitCompare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CopilotActionData } from "@/types/copilotActions";
import AnalyticsReportContent, { isStructuredAnalyticsReport } from "./AnalyticsReportContent";
import AssistantMessageContent from "./AssistantMessageContent";
import AssistantWelcomeScreen from "./AssistantWelcomeScreen";
import BulkMovedCard from "./BulkMovedCard";
import CandidateComparisonCard from "./CandidateComparisonCard";
import CopilotActionCard from "./CopilotActionCard";
import EmailSentCard from "./EmailSentCard";
import InteractiveOfferCard from "./InteractiveOfferCard";
import InterviewGuideCard from "./InterviewGuideCard";
import JobPreviewCard from "./JobPreviewCard";
import MessageActions from "./MessageActions";
import { MODEL_OPTIONS, type ModelChoice } from "./ModelSelector";
import ProactiveInsightsCard from "./ProactiveInsightsCard";
import SpeakButton from "./SpeakButton";
import VoiceBriefingCard from "./VoiceBriefingCard";
import WhatsappSmsCard from "./WhatsappSmsCard";
import type { AssistantMessage, CompareDialogState, JobData } from "./assistantTypes";

const messageAnimation = {
  hidden: (role: "user" | "assistant") => ({
    opacity: 0,
    x: role === "user" ? 30 : -30,
    y: 10,
  }),
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 24,
    },
  },
};

interface AssistantMessageListProps {
  scrollRef: RefObject<HTMLDivElement>;
  messages: AssistantMessage[];
  isLoading: boolean;
  canManage: boolean;
  modelChoice: ModelChoice;
  jobs: JobRow[];
  candidates: CandidateRow[];
  stages: PipelineStage[];
  onSelectSuggestion: (prompt: string) => void;
  onSelectMode: (mode: string) => void;
  onCompareReply: (payload: Omit<CompareDialogState, "open">) => void;
  onPrefillInput: (text: string) => void;
  onConfirmJob: (msgIndex: number) => void;
  onOpenEditJob: (jobData: JobData, msgIndex: number) => void;
  onRejectJob: (msgIndex: number) => void;
  onDeleteJob: (msgIndex: number) => void;
  onOpenQr: (jobId: string, jobTitle: string) => void;
  onNavigate: (path: string) => void;
  onExecuteCopilotAction: (action: CopilotActionData) => Promise<void>;
  onCancelCopilotAction: (actionId: string) => void;
  onRollbackCopilotAction: (action: CopilotActionData) => Promise<void>;
}

export default function AssistantMessageList({
  scrollRef,
  messages,
  isLoading,
  canManage,
  modelChoice,
  jobs,
  candidates,
  stages,
  onSelectSuggestion,
  onSelectMode,
  onCompareReply,
  onPrefillInput,
  onConfirmJob,
  onOpenEditJob,
  onRejectJob,
  onDeleteJob,
  onOpenQr,
  onNavigate,
  onExecuteCopilotAction,
  onCancelCopilotAction,
  onRollbackCopilotAction,
}: AssistantMessageListProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-transparent min-h-0">
      {messages.length === 0 ? (
        <AssistantWelcomeScreen
          canManage={canManage}
          onSelectSuggestion={onSelectSuggestion}
          onSelectMode={onSelectMode}
        />
      ) : (
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              custom={msg.role}
              initial="hidden"
              animate="show"
              variants={messageAnimation}
              className={cn("flex gap-3 items-start", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
                  <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
              )}

              <div
                className={cn(
                  "min-w-0 rounded-2xl px-4 sm:px-5 py-4 text-sm leading-relaxed shadow-xs transition-all duration-200 relative",
                  msg.role === "user"
                    ? "max-w-[calc(100%-3rem)] sm:max-w-[75%] bg-md-primary text-md-on-primary font-medium rounded-tr-xs shadow-md3-1 whitespace-pre-wrap break-words"
                    : "max-w-[calc(100%-3rem)] sm:max-w-[88%] xl:max-w-[56rem] bg-card/95 border border-border/70 rounded-tl-xs text-foreground shadow-xs backdrop-blur-md dark:bg-card/80"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="premium-radial-glow -bottom-10 -left-10 bg-primary/10" />
                )}
                {msg.role === "assistant" ? (
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-primary border-b border-border/50 pb-2.5">
                      <span>ذكي</span>
                      <span className="font-medium text-muted-foreground">مساعد التوظيف</span>
                    </div>
                    <div className="min-w-0">
                      {msg.statsReport && isStructuredAnalyticsReport(msg.statsReport.report_type) ? (
                        <div className="assistant-message-content">
                          <AnalyticsReportContent reportType={msg.statsReport.report_type} stats={msg.statsReport.stats} />
                        </div>
                      ) : (
                        <AssistantMessageContent content={msg.content} />
                      )}
                      {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm ml-0.5" />}
                    </div>

                    {!msg.isStreaming && msg.content && msg.content.length > 10 && (
                      <div className="flex justify-end items-center gap-1.5 flex-wrap border-t border-border/50 pt-2.5">
                        <SpeakButton text={msg.content} messageId={`msg-${i}`} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-[10px] text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                          onClick={() => {
                            const base: { role: "user" | "assistant"; content: string }[] = [];
                            for (let k = 0; k < i; k++) {
                              base.push({ role: messages[k].role, content: messages[k].content });
                            }
                            const currentLabel = MODEL_OPTIONS.find((o) => o.value === modelChoice)?.short ?? "تلقائي";
                            onCompareReply({
                              reply: msg.content,
                              baseMessages: base,
                              modelLabel: currentLabel,
                            });
                          }}
                          title="قارن مع موديل آخر"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          قارن
                        </Button>
                        <MessageActions content={msg.content} />
                      </div>
                    )}

                    {msg.proactiveInsights && <ProactiveInsightsCard insights={msg.proactiveInsights} />}
                    {msg.emailSent && <EmailSentCard email={msg.emailSent} />}
                    {msg.bulkMoved && <BulkMovedCard data={msg.bulkMoved} />}

                    {msg.candidateComparison && (
                      <CandidateComparisonCard comparison={msg.candidateComparison} onActionClick={onPrefillInput} />
                    )}

                    {msg.interviewGuide && <InterviewGuideCard guide={msg.interviewGuide} />}

                    {msg.whatsappSms && <WhatsappSmsCard data={msg.whatsappSms} />}

                    {msg.voiceBriefing && <VoiceBriefingCard data={msg.voiceBriefing} />}

                    <JobPreviewCard
                      content={msg.content}
                      jobPreview={msg.jobPreview}
                      jobCreated={msg.jobCreated}
                      onConfirmJob={() => onConfirmJob(i)}
                      onOpenEditJob={(jobData) => onOpenEditJob(jobData, i)}
                      onRejectJob={() => onRejectJob(i)}
                      onDeleteJob={() => onDeleteJob(i)}
                      onOpenQr={onOpenQr}
                      onNavigateJob={(jobId) => onNavigate(`/jobs/${jobId}`)}
                      onPrefillEditPrompt={(title) => onPrefillInput(`عدّل وظيفة "${title}" `)}
                    />

                    {msg.jobUpdated && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 p-3 rounded-xl bg-success/5 border border-success/20 flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-success shrink-0" />
                        <div className="text-xs font-semibold">
                          <p className="font-bold text-success">تم تعديل الوظيفة</p>
                          <p className="text-muted-foreground">{msg.jobUpdated.title}</p>
                        </div>
                      </motion.div>
                    )}

                    {msg.candidateMoved && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3"
                      >
                        <ArrowRightLeft className="w-5 h-5 text-primary shrink-0" />
                        <div className="text-xs font-semibold">
                          <p className="font-bold text-primary">تم نقل {msg.candidateMoved.name}</p>
                          <p className="text-muted-foreground">
                            {msg.candidateMoved.old_stage} ← {msg.candidateMoved.new_stage}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {msg.interviewScheduled && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-3 glass-card-premium"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-warning shrink-0" />
                          <div className="text-xs font-semibold">
                            <p className="font-bold text-warning">مقابلة مجدولة: {msg.interviewScheduled.candidate_name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              📅 {msg.interviewScheduled.date} — ⏰ {msg.interviewScheduled.time} — 📍{" "}
                              {msg.interviewScheduled.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8 font-bold"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.interviewScheduled!.meeting_url);
                              toast({ title: "تم نسخ رابط المقابلة ✅" });
                            }}
                          >
                            نسخ رابط الاجتماع
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs h-8 gap-1 font-bold"
                            onClick={() => window.open(msg.interviewScheduled!.meeting_url, "_blank")}
                          >
                            <Video className="w-3 h-3" />
                            انضمام
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {msg.offerCreated && <InteractiveOfferCard offer={msg.offerCreated} />}

                    {msg.statsReport && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3 glass-card-premium"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                          <BarChart3 className="w-4 h-4" />
                          تقرير الإحصائيات
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {msg.statsReport.stats.total_jobs !== undefined && (
                            <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm">
                              <p className="text-lg font-bold text-primary">{msg.statsReport.stats.total_jobs}</p>
                              <p className="text-muted-foreground">الوظائف</p>
                            </div>
                          )}
                          {msg.statsReport.stats.total_candidates !== undefined && (
                            <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm">
                              <p className="text-lg font-bold text-blue-600">{msg.statsReport.stats.total_candidates}</p>
                              <p className="text-muted-foreground">المرشحين</p>
                            </div>
                          )}
                          {msg.statsReport.stats.total_interviews !== undefined && (
                            <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm">
                              <p className="text-lg font-bold text-purple-600">{msg.statsReport.stats.total_interviews}</p>
                              <p className="text-muted-foreground">المقابلات</p>
                            </div>
                          )}
                          {msg.statsReport.stats.total_offers !== undefined && (
                            <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center shadow-sm">
                              <p className="text-lg font-bold text-emerald-600">{msg.statsReport.stats.total_offers}</p>
                              <p className="text-muted-foreground">العروض</p>
                            </div>
                          )}
                          {msg.statsReport.stats.acceptance_rate !== undefined && (
                            <div className="bg-white dark:bg-background/50 rounded-lg p-2.5 text-center col-span-2 shadow-sm">
                              <p className="text-lg font-bold text-green-600">{msg.statsReport.stats.acceptance_rate}%</p>
                              <p className="text-muted-foreground">معدل قبول العروض</p>
                            </div>
                          )}
                        </div>
                        {msg.statsReport.stats.pipeline && (
                          <div className="space-y-1.5 mt-2">
                            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">مسار التوظيف:</p>
                            {Object.entries(msg.statsReport.stats.pipeline).map(([stage, count]) => {
                              const totalCandidates = msg.statsReport?.stats.total_candidates ?? 0;
                              return (
                                <div key={stage} className="flex items-center gap-2 text-[11px]">
                                  <span className="text-muted-foreground flex-1">{stage}</span>
                                  <div className="w-20 h-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ width: `${Math.min(100, (count / Math.max(1, totalCandidates)) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-indigo-700 dark:text-indigo-300 w-6 text-center">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 mt-1" onClick={() => onNavigate("/reports")}>
                          <BarChart3 className="w-3 h-3 ml-1" />
                          عرض التقارير الكاملة
                        </Button>
                      </motion.div>
                    )}

                    {msg.copilotAction && (
                      <CopilotActionCard
                        action={msg.copilotAction}
                        onExecute={onExecuteCopilotAction}
                        onCancel={onCancelCopilotAction}
                        onRollback={onRollbackCopilotAction}
                        jobs={jobs}
                        candidates={candidates}
                        stages={stages}
                      />
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8.5 h-8.5 rounded-xl bg-md-primary-container text-md-on-primary-container border border-primary/30 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  <span className="text-[10px] font-black">أنت</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
      {isLoading && !messages[messages.length - 1]?.isStreaming && (
        <div className="flex justify-start items-start gap-3">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md border border-primary/10">
            <Bot className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="bg-card/90 border border-border/40 rounded-2xl rounded-tl-xs px-5 py-3.5 shadow-md">
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
