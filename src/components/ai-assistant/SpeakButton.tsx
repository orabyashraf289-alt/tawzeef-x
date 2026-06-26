import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechService } from "@/hooks/useSpeechService";
import { useMemo } from "react";

interface SpeakButtonProps {
  text: string;
  voiceId?: string;
  /** Stable id for this message — used to dedupe + cancel correctly. */
  messageId?: string;
}

/**
 * Per-message speak/stop button. Routes through the global speech service so
 * starting a new message cancels the previous one and the queue is centrally managed.
 */
export default function SpeakButton({ text, voiceId, messageId }: SpeakButtonProps) {
  const svc = useSpeechService();
  // Stable id derived from text if no messageId provided
  const id = useMemo(
    () => messageId || `msg-${text.slice(0, 40).replace(/\s+/g, "-")}`,
    [messageId, text],
  );

  const isActive = svc.isActive(id);
  const isLoading = isActive && svc.status === "loading";
  const isPlaying = isActive && svc.status === "speaking";

  const handle = () => {
    if (isActive) {
      svc.cancelIfActive(id);
      return;
    }
    // Latest-wins: clicking a new message stops any current playback.
    void svc.speak({ id, text, voiceId }, { overrideLatest: true });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handle}
      title={isPlaying ? "إيقاف القراءة" : "استماع"}
      className={cn("h-7 px-2 text-xs gap-1", isActive && "text-primary")}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isActive ? (
        <VolumeX className="w-3 h-3" />
      ) : (
        <Volume2 className="w-3 h-3" />
      )}
      {isPlaying ? "إيقاف" : isLoading ? "تحميل" : "استماع"}
    </Button>
  );
}
