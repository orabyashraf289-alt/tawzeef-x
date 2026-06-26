import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Video, PhoneOff, Copy, Check, ExternalLink, Mic, MicOff, CircleDot, Square, FileText, Download, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ——— Web Speech API hook for live transcription ———
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const start = useCallback((lang = "ar-SA") => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "المتصفح لا يدعم النسخ النصي", description: "يرجى استخدام Google Chrome", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + " ";
        } else {
          interim += t;
        }
      }
      if (final) setTranscript(prev => prev + final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.error("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return { isListening, transcript, interimTranscript, start, stop, reset, setTranscript };
}

// ——— Audio Recorder hook ———
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      toast({ title: "لا يمكن الوصول للميكروفون", variant: "destructive" });
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { isRecording, duration, audioBlob, start, stop };
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VideoRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  const candidateName = searchParams.get("name") || "";
  const position = searchParams.get("position") || "";
  const intId = searchParams.get("interviewId") || "";

  const speech = useSpeechRecognition();
  const recorder = useAudioRecorder();

  useEffect(() => { if (intId) setInterviewId(intId); }, [intId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [speech.transcript, speech.interimTranscript]);

  const jitsiDomain = "meet.jit.si";
  const roomName = roomId || `tawzeef-x-interview-${Date.now()}`;
  const jitsiUrl = `https://${jitsiDomain}/${roomName}#config.prejoinConfig.enabled=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.DEFAULT_BACKGROUND="#1a1a2e"`;

  const shareLink = `${window.location.origin}/meeting/${roomName}${candidateName ? `?name=${encodeURIComponent(candidateName)}&position=${encodeURIComponent(position)}` : ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "تم نسخ رابط المقابلة ✅" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartRecording = () => {
    recorder.start();
    speech.start("ar-SA");
  };

  const handleStopRecording = () => {
    recorder.stop();
    speech.stop();
  };

  const handleSave = async () => {
    if (!user || !interviewId) {
      toast({ title: "لا يمكن الحفظ", description: "لم يتم تحديد المقابلة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updates: any = {};

      // Save transcript
      if (speech.transcript.trim()) {
        updates.transcript = speech.transcript.trim();
      }

      // Upload recording
      if (recorder.audioBlob) {
        const ext = recorder.audioBlob.type.includes("webm") ? "webm" : "mp4";
        const filePath = `${user.id}/${interviewId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("interview-recordings")
          .upload(filePath, recorder.audioBlob, { upsert: true });
        if (uploadErr) throw uploadErr;
        updates.recording_url = filePath;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("interviews").update(updates as any).eq("id", interviewId);
        if (error) throw error;
        toast({ title: "تم حفظ التسجيل والنسخ النصي ✅" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTranscript = () => {
    if (!speech.transcript) return;
    const blob = new Blob([speech.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${candidateName || roomName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEndMeeting = () => {
    if (recorder.isRecording) handleStopRecording();
    navigate("/interviews");
  };

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border shrink-0"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              مقابلة أونلاين
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block ml-1 animate-pulse" />
                مباشر
              </Badge>
            </h1>
            {candidateName && (
              <p className="text-xs text-muted-foreground">{candidateName} — {position}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recording Controls */}
          {!recorder.isRecording ? (
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleStartRecording}
            >
              <CircleDot className="w-3.5 h-3.5" />
              بدء التسجيل
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-destructive/50 text-destructive"
              onClick={handleStopRecording}
            >
              <Square className="w-3 h-3 fill-destructive" />
              إيقاف
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 animate-pulse mr-1">
                {formatDuration(recorder.duration)}
              </Badge>
            </Button>
          )}

          {/* Transcript toggle */}
          <Button
            size="sm"
            variant={showTranscript ? "default" : "outline"}
            className="text-xs gap-1.5"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <FileText className="w-3.5 h-3.5" />
            النسخ النصي
          </Button>

          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open(jitsiUrl, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleEndMeeting}>
            <PhoneOff className="w-3.5 h-3.5" />
            إنهاء
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full mb-4"
              />
              <p className="text-sm text-muted-foreground">جاري تحميل غرفة المقابلة...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={jitsiUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            onLoad={() => setIsLoaded(true)}
          />

          {/* Live caption overlay */}
          <AnimatePresence>
            {speech.isListening && (speech.interimTranscript || speech.transcript) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-md border border-border rounded-xl px-4 py-3 max-w-2xl mx-auto shadow-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium">نسخ مباشر</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed" dir="rtl">
                  {speech.interimTranscript && (
                    <span className="text-muted-foreground">{speech.interimTranscript}</span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transcript Sidebar */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-r border-border bg-card flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  النسخ النصي
                </h3>
                <div className="flex items-center gap-1">
                  {speech.transcript && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownloadTranscript} title="تحميل">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {interviewId && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={saving} title="حفظ">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm leading-relaxed" dir="rtl">
                {!speech.transcript && !speech.isListening ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <Mic className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-xs">اضغط "بدء التسجيل" لبدء النسخ النصي المباشر</p>
                  </div>
                ) : (
                  <>
                    {speech.transcript && (
                      <p className="text-foreground whitespace-pre-wrap">{speech.transcript}</p>
                    )}
                    {speech.interimTranscript && (
                      <p className="text-muted-foreground italic">{speech.interimTranscript}</p>
                    )}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </div>
              {speech.isListening && (
                <div className="p-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  جاري الاستماع والنسخ...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
