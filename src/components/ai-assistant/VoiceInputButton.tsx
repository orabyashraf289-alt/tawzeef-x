import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language?: "ara" | "eng";
  disabled?: boolean;
}

export default function VoiceInputButton({ onTranscript, language = "ara", disabled }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e: any) {
      toast({
        title: "تعذر الوصول للميكروفون",
        description: "تأكد من السماح بالوصول للميكروفون من إعدادات المتصفح",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribe = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("language", language);

      const { data, error } = await supabase.functions.invoke("elevenlabs-transcribe", {
        body: formData,
      });

      if (error) throw error;
      const text = data?.text?.trim();
      if (text) {
        onTranscript(text);
        toast({ title: "تم النسخ ✅", description: text.slice(0, 50) + (text.length > 50 ? "..." : "") });
      } else {
        toast({ title: "لم يتم اكتشاف كلام", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "فشل تحويل الصوت", description: e.message, variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled || isTranscribing}
      onClick={handleClick}
      title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
      className={cn(
        "shrink-0 w-10 h-10 rounded-xl transition-all",
        isRecording && "bg-destructive/10 text-destructive hover:bg-destructive/20 animate-pulse"
      )}
    >
      {isTranscribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Mic className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  );
}
