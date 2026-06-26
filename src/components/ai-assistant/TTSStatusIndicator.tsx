import { Volume2, AlertTriangle, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpeechService } from "@/hooks/useSpeechService";
import { cn } from "@/lib/utils";

/**
 * Compact pill that signals the current TTS state:
 * - normal: ElevenLabs available (green dot)
 * - blocked: ElevenLabs returned 401/fallback → using browser SpeechSynthesis
 * - speaking: pulse animation while audio is playing
 */
export default function TTSStatusIndicator() {
  const svc = useSpeechService();
  const isSpeaking = svc.status === "speaking" || svc.status === "loading";
  const blocked = svc.elevenLabsBlocked;

  const label = blocked ? "احتياطي المتصفح" : "ElevenLabs";
  const icon = blocked ? <RotateCw className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />;
  const tooltip = blocked
    ? "ElevenLabs محظور (401). يتم استخدام محرك القراءة المدمج في المتصفح كبديل."
    : "محرك ElevenLabs نشط للقراءة الصوتية.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={blocked ? "outline" : "secondary"}
            className={cn(
              "h-6 gap-1 text-[10px] px-2 cursor-help",
              blocked && "border-amber-500/50 text-amber-700 dark:text-amber-400",
              !blocked && "border-green-500/40",
            )}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              blocked ? "bg-amber-500" : "bg-green-500",
              isSpeaking && "animate-pulse",
            )} />
            {icon}
            <span className="hidden md:inline">{label}</span>
            {blocked && <AlertTriangle className="w-3 h-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
