import type { ChangeEvent, RefObject } from "react";
import { FileText, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileAttachment, { type AttachedFile } from "./FileAttachment";
import SlashCommandMenu, { type SlashCommand } from "./SlashCommandMenu";
import VoiceInputButton from "./VoiceInputButton";

interface AssistantComposerProps {
  input: string;
  isLoading: boolean;
  resumeFile: File | null;
  attachedFiles: AttachedFile[];
  inputRef: RefObject<HTMLInputElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onSend: (promptOverride?: string) => void;
  onClearResumeFile: () => void;
  onAddFiles: (files: AttachedFile[]) => void;
  onRemoveFile: (idx: number) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onAppendTranscript: (text: string) => void;
}

export default function AssistantComposer({
  input,
  isLoading,
  resumeFile,
  attachedFiles,
  inputRef,
  fileInputRef,
  onInputChange,
  onSend,
  onClearResumeFile,
  onAddFiles,
  onRemoveFile,
  onFileSelect,
  onAppendTranscript,
}: AssistantComposerProps) {
  return (
    <>
      {resumeFile && (
        <div className="px-4 pb-1.5 w-full max-w-full mx-auto shrink-0">
          <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg w-fit shadow-sm border border-primary/20 backdrop-blur-sm">
            <FileText className="w-3 h-3" />
            <span>{resumeFile.name}</span>
            <button onClick={onClearResumeFile} className="hover:text-destructive">
              <XCircle className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="px-4 pb-1.5 w-full max-w-full mx-auto shrink-0">
          <FileAttachment
            files={attachedFiles}
            onAdd={onAddFiles}
            onRemove={onRemoveFile}
            disabled={isLoading}
            hideButton={true}
          />
        </div>
      )}

      <div className="p-3 sm:p-4 pt-1 pb-4 shrink-0 relative w-full max-w-full mx-auto z-20 bg-background/70 backdrop-blur-md border-t border-border/20">
        <SlashCommandMenu
          query={input}
          onSelect={(cmd: SlashCommand) => {
            onInputChange(cmd.prompt);
            if (cmd.autoSend) {
              onSend(cmd.prompt);
            }
          }}
        />
        <div className="bg-card/90 border border-border/60 p-2 rounded-full shadow-md flex gap-2 items-center relative max-w-4xl mx-auto backdrop-blur-md">
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.pdf,.doc,.docx"
            className="hidden"
            onChange={onFileSelect}
          />

          <FileAttachment
            files={[]}
            onAdd={(newOnes) => onAddFiles(newOnes)}
            onRemove={() => {}}
            disabled={isLoading}
          />

          <VoiceInputButton onTranscript={onAppendTranscript} disabled={isLoading} />

          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            placeholder="اكتب أمرك للمساعد الذكي أو / للأوامر السريعة..."
            className="flex-1 rounded-full bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm shadow-none"
          />
          <Button
            onClick={() => onSend()}
            disabled={(!input.trim() && attachedFiles.length === 0 && !resumeFile) || isLoading}
            size="icon"
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-10 h-10 rounded-full shrink-0 shadow-sm hover:scale-105 transition-transform duration-200"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
