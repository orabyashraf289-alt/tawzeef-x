import { Sparkles } from "lucide-react";
import AddJobDialog from "@/components/AddJobDialog";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import DashboardLayout from "@/components/DashboardLayout";
import QRCodeDialog from "@/components/QRCodeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AIChatHeader from "@/components/ai-assistant/AIChatHeader";
import AssistantComposer from "@/components/ai-assistant/AssistantComposer";
import AssistantMessageList from "@/components/ai-assistant/AssistantMessageList";
import AssistantServicesDialog from "@/components/ai-assistant/AssistantServicesDialog";
import ConversationsArchiveSidebar from "@/components/ai-assistant/ConversationsArchiveSidebar";
import CopilotCommandBar from "@/components/ai-assistant/CopilotCommandBar";
import ExportConversation from "@/components/ai-assistant/ExportConversation";
import ModelCompareDialog from "@/components/ai-assistant/ModelCompareDialog";
import ModelSelector, { MODEL_OPTIONS } from "@/components/ai-assistant/ModelSelector";
import { useAssistantState } from "@/components/ai-assistant/useAssistantState";

export default function AIAssistant() {
  const state = useAssistantState();

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <style>{`
        .premium-radial-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.04;
          pointer-events: none;
        }
      `}</style>
      <div
        className="-m-4 sm:-m-6 lg:-m-8 h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] flex overflow-hidden relative z-10 bg-background/50"
        dir="rtl"
      >
        <ConversationsArchiveSidebar
          conversations={state.conversationsWithPin}
          activeConversationId={state.activeConversationId}
          sidebarOpen={state.sidebarOpen}
          onSelectConversation={state.loadConversation}
          onNewChat={state.handleNewChat}
          onDeleteConversation={state.handleDeleteConversation}
          onClearAll={state.handleClearAllConversations}
          onRenameConversation={state.handleRenameConversation}
          onTogglePinConversation={state.handleTogglePinConversation}
          onToggleSidebar={() => state.setSidebarOpen(false)}
        />

        {state.sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => state.setSidebarOpen(false)} />
        )}

        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          <AIChatHeader
            onClearChat={state.handleNewChat}
            messageCount={state.messages.length}
            isStreaming={state.isLoading}
            onToggleSidebar={() => state.setSidebarOpen(!state.sidebarOpen)}
            sidebarOpen={state.sidebarOpen}
          >
            <ExportConversation messages={state.messages.map((m) => ({ role: m.role, content: m.content }))} />
            <ModelSelector value={state.modelChoice} onChange={state.setModelChoice} />
          </AIChatHeader>

          <div className="px-4 py-2 border-b border-border/30 bg-card/60 backdrop-blur-md flex items-center justify-between text-xs gap-3 overflow-x-auto no-scrollbar">
            <CopilotCommandBar onLaunch={state.handleLaunchCopilotCommand} disabled={state.isLoading} />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => state.setServicesOpen(true)}
              className="shrink-0 gap-1.5"
              aria-label="عرض خدمات مساعد AI"
            >
              <Sparkles className="h-4 w-4" /> خدمات AI
            </Button>

            <div className="flex items-center gap-2 shrink-0 border-r border-border/40 pr-3 mr-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-black rounded-md3-full bg-md-primary-container text-md-on-primary-container border-0 px-2.5 py-0.5"
              >
                {MODEL_OPTIONS.find((m) => m.value === state.modelChoice)?.label || "تلقائي"} ⚡
              </Badge>
            </div>
          </div>

          <AssistantMessageList
            scrollRef={state.scrollRef}
            messages={state.messages}
            isLoading={state.isLoading}
            canManage={state.canManage}
            modelChoice={state.modelChoice}
            jobs={state.jobs}
            candidates={state.candidates}
            stages={state.activeStages}
            onSelectSuggestion={(prompt) => {
              void state.handleSend(prompt);
            }}
            onSelectMode={(mode) => state.navigate(`/ai-tools?mode=${mode}`)}
            onCompareReply={(payload) => state.setCompareDialog({ open: true, ...payload })}
            onPrefillInput={state.prefillInput}
            onConfirmJob={(msgIndex) => {
              void state.handleConfirmJob(msgIndex);
            }}
            onOpenEditJob={state.openEditJobModal}
            onRejectJob={(msgIndex) => {
              void state.handleRejectJob(msgIndex);
            }}
            onDeleteJob={(msgIndex) => {
              void state.handleDeleteJob(msgIndex);
            }}
            onOpenQr={(jobId, jobTitle) => state.setQrDialog({ open: true, jobId, jobTitle })}
            onNavigate={state.navigate}
            onExecuteCopilotAction={state.handleExecuteCopilotAction}
            onCancelCopilotAction={state.handleCancelCopilotAction}
            onRollbackCopilotAction={state.handleRollbackCopilotAction}
          />

          <AssistantComposer
            input={state.input}
            isLoading={state.isLoading}
            resumeFile={state.resumeFile}
            attachedFiles={state.attachedFiles}
            inputRef={state.inputRef}
            fileInputRef={state.fileInputRef}
            onInputChange={state.handleInputChange}
            onSend={(promptOverride) => {
              void state.handleSend(promptOverride);
            }}
            onClearResumeFile={() => state.setResumeFile(null)}
            onAddFiles={(newOnes) => state.setAttachedFiles((prev) => [...prev, ...newOnes].slice(0, 5))}
            onRemoveFile={(idx) => state.setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
            onFileSelect={state.handleFileSelect}
            onAppendTranscript={(text) => state.setInput((prev) => (prev ? prev + " " : "") + text)}
          />
        </div>
      </div>

      <QRCodeDialog
        open={state.qrDialog.open}
        onClose={() => state.setQrDialog({ open: false, jobId: "", jobTitle: "" })}
        jobTitle={state.qrDialog.jobTitle}
        jobId={state.qrDialog.jobId}
      />

      <ModelCompareDialog
        open={state.compareDialog.open}
        onClose={() => state.setCompareDialog((d) => ({ ...d, open: false }))}
        baseMessages={state.compareDialog.baseMessages}
        originalReply={state.compareDialog.reply}
        originalModelLabel={state.compareDialog.modelLabel}
      />

      <AssistantServicesDialog
        open={state.servicesOpen}
        onOpenChange={state.setServicesOpen}
        onSelect={state.selectAssistantService}
        canManage={state.canManage}
        canScheduleInterviews={state.canScheduleInterviews}
      />

      <AddJobDialog
        open={state.editJobModal.open}
        onClose={() => state.setEditJobModal({ open: false, data: null, msgIndex: null })}
        initialData={state.editJobModal.data}
        onAdd={async (job) => {
          if (state.editJobModal.msgIndex !== null) {
            await state.handleConfirmJob(state.editJobModal.msgIndex, job);
          }
          state.setEditJobModal({ open: false, data: null, msgIndex: null });
        }}
      />
    </DashboardLayout>
  );
}
