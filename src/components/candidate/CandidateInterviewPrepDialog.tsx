import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  Brain,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  jobTitle: string;
  meetingUrl: string;
}

export default function CandidateInterviewPrepDialog({
  open,
  onOpenChange,
  candidateName,
  jobTitle,
  meetingUrl,
}: Props) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"devices" | "questions">("devices");

  // Sample job-specific prep questions
  const prepQuestions = [
    {
      q: `كيف تُوظّف خبراتك السابقة في تلبية متطلبات وظيفة (${jobTitle || "المتقدم إليها"})؟`,
      tip: "اذكر 2-3 مهارات أساسية تربط بين إنجازاتك واحتياج الوظيفة الحالي.",
    },
    {
      q: "احكِ لنا عن تحدٍ مهني معقد واجهته، وكيف تعاملت معه بنجاح؟",
      tip: "استخدم أسلوب STAR: الموقف، المهمة، الإجراء المتخذ، والنتيجة بالأرقام.",
    },
    {
      q: "ما هي بيئة العمل التي تتيح لك تقديم أفضل إنتاجية وإبداع؟",
      tip: "ركز على التعاون الجماعي، التواصل الفعال، والتطور المستمر.",
    },
  ];

  // Start media stream on dialog open
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animId: number | null = null;

    if (open) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          setStream(s);
          setDeviceError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }

          // Audio level meter
          try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(s);
            source.connect(analyser);
            analyser.fftSize = 64;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkLevel = () => {
              if (!analyser) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animId = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          } catch {
            // AudioContext not supported
          }
        })
        .catch((err) => {
          setDeviceError("تعذر الوصول للكاميرا أو الميكروفون. يرجى التأكد من صلاحيات المتصفح.");
        });
    } else {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (audioContext) {
        try {
          (audioContext as any).close();
        } catch {}
      }
      if (animId) cancelAnimationFrame(animId);
      setMicLevel(0);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext) {
        try {
          (audioContext as any).close();
        } catch {}
      }
      if (animId) cancelAnimationFrame(animId);
    };
  }, [open]);

  const toggleCamera = () => {
    if (stream) {
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !cameraActive;
        setCameraActive(!cameraActive);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !micActive;
        setMicActive(!micActive);
      }
    }
  };

  const handleJoin = () => {
    onOpenChange(false);
    if (meetingUrl.startsWith("/")) {
      navigate(meetingUrl);
    } else {
      window.open(meetingUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold">
                  محاكي التحضير للمقابلة وفحص الأجهزة — {jobTitle || "الوظيفة"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مرحباً {candidateName}، تأكد من وضوح الصوت والصورة واستعد للأسئلة
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
              مساعد الذكاء الاصطناعي ✨
            </Badge>
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex gap-2 border-b border-border/60 pb-2">
          <Button
            size="sm"
            variant={activeTab === "devices" ? "default" : "ghost"}
            className="text-xs h-7 gap-1.5"
            onClick={() => setActiveTab("devices")}
          >
            <Video className="w-3.5 h-3.5" />
            فحص الكاميرا والصوت
          </Button>
          <Button
            size="sm"
            variant={activeTab === "questions" ? "default" : "ghost"}
            className="text-xs h-7 gap-1.5"
            onClick={() => setActiveTab("questions")}
          >
            <Sparkles className="w-3.5 h-3.5" />
            نماذج الأسئلة المتوقعة
          </Button>
        </div>

        {activeTab === "devices" ? (
          <div className="space-y-3">
            {/* Camera View */}
            <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-border/80 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                  <VideoOff className="w-8 h-8" />
                  <span className="text-xs">الكاميرا معطلة مؤقتاً</span>
                </div>
              )}
              {deviceError && (
                <div className="absolute inset-0 bg-slate-900/90 p-4 text-center flex flex-col items-center justify-center text-rose-400 gap-2">
                  <VideoOff className="w-8 h-8" />
                  <p className="text-xs">{deviceError}</p>
                </div>
              )}

              {/* In-video floating controls */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full w-9 h-9 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10"
                  onClick={toggleCamera}
                >
                  {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full w-9 h-9 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10"
                  onClick={toggleMic}
                >
                  {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                </Button>
              </div>
            </div>

            {/* Mic Level Meter */}
            <div className="p-3 rounded-lg bg-card border border-border/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  مستوى التقاط الميكروفون:
                </span>
                <span className="font-bold text-foreground">{micLevel}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 rounded-lg bg-primary/[0.03] border border-primary/10 text-xs text-muted-foreground space-y-1">
              <strong className="text-foreground flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                إرشادات لضمان أفضل تجربة مقابلة:
              </strong>
              <p>• تأكد من الجلوس في مكان هادئ ذي إضاءة أمامية جيدة وتجنب الإضاءة الخلفية القوية.</p>
              <p>• يُفضل استخدام سماعات الرأس لضمان صفاء ونقاء الصوت دون صدى.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              صمم لك الذكاء الاصطناعي هذه الأسئلة بناءً على المهارات الأساسية المطلوبة لشغل الوظيفة:
            </p>
            <div className="space-y-2.5">
              {prepQuestions.map((pq, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-card border border-border/70 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <h5 className="text-xs font-bold text-foreground leading-snug">{pq.q}</h5>
                  </div>
                  <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40 mr-7">
                    <strong className="text-primary font-medium">💡 كيف تجيب: </strong>
                    {pq.tip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            إغلاق
          </Button>
          <Button
            size="sm"
            onClick={handleJoin}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            الانتقال لغرفة المقابلة الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
