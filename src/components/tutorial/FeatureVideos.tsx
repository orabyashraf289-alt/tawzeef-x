import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, Users, Calendar, FileText, Play, Kanban, Bot, 
  BarChart3, Target, Share2, Settings, Search, CheckCircle2, 
  Clock, Award, BookOpen, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Download, Mic, Music, Loader2
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const featureVideos = [
  { key: "jobs", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", src: "/videos/tawzeef-x-jobs.mp4", audioSrc: "/videos/tawzeef-x-jobs-audio.mp3", category: "core", duration: "2:15" },
  { key: "candidates", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", src: "/videos/tawzeef-x-candidates.mp4", audioSrc: "/videos/tawzeef-x-candidates-audio.mp3", category: "core", duration: "3:05" },
  { key: "pipeline", icon: Kanban, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", src: "/videos/tawzeef-x-pipeline.mp4", audioSrc: "/videos/tawzeef-x-pipeline-audio.mp3", category: "core", duration: "1:50" },
  { key: "interviews", icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", src: "/videos/tawzeef-x-interviews.mp4", audioSrc: "/videos/tawzeef-x-interviews-audio.mp3", category: "core", duration: "2:40" },
  { key: "offers", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", src: "/videos/tawzeef-x-offers.mp4", audioSrc: "/videos/tawzeef-x-offers-audio.mp3", category: "core", duration: "2:00" },
  { key: "ai", icon: Bot, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", src: "/videos/tawzeef-x-ai-guide.mp4", audioSrc: "/videos/tawzeef-x-ai-audio.mp3", category: "ai", duration: "4:20" },
  { key: "reports", icon: BarChart3, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", src: "/videos/tawzeef-x-reports.mp4", audioSrc: "/videos/tawzeef-x-reports-audio.mp3", category: "advanced", duration: "3:10" },
  { key: "hiring", icon: Target, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", src: "/videos/tawzeef-x-hiring.mp4", audioSrc: "/videos/tawzeef-x-hiring-audio.mp3", category: "advanced", duration: "1:45" },
  { key: "share", icon: Share2, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", src: "/videos/tawzeef-x-share.mp4", audioSrc: "/videos/tawzeef-x-share-audio.mp3", category: "advanced", duration: "2:10" },
  { key: "settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", src: "/videos/tawzeef-x-settings.mp4", audioSrc: "/videos/tawzeef-x-settings-audio.mp3", category: "advanced", duration: "2:55" },
];

export default function FeatureVideos() {
  const { t, locale, dir } = useI18n();
  const { isAdmin } = useUserRole();
  const [activeVideo, setActiveVideo] = useState(featureVideos[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ElevenLabs Voiceover states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scriptText, setScriptText] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("Xb7hH8MSUJpSbSDYk0k2"); // Alice as default voice (active on user's account)
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [generatingTts, setGeneratingTts] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [syncVoiceover, setSyncVoiceover] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const defaultScript = useMemo(() => {
    const title = t(`tutorial.feat.${activeVideo.key}.title`);
    const desc = t(`tutorial.feat.${activeVideo.key}.desc`);
    const steps = t(`tutorial.feat.${activeVideo.key}.steps`).split("|").join(". ");
    return `${title}. ${desc} إليك الخطوات الرئيسية: ${steps}`;
  }, [activeVideo.key, t]);

  useEffect(() => {
    setScriptText(defaultScript);
    // Load pre-generated audio if exists
    setAudioUrl(activeVideo.audioSrc || null);
    setSyncVoiceover(!!activeVideo.audioSrc); // Auto-enable sync if we have pre-generated audio
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  }, [defaultScript, activeVideo.key]);

  // Video-Audio Synchronization Effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioUrl || !syncVoiceover) {
      if (video) video.muted = false;
      if (audioElement) {
        audioElement.pause();
      }
      return;
    }

    const audio = audioElement || new Audio(audioUrl);
    if (!audioElement) {
      setAudioElement(audio);
    }
    audio.src = audioUrl;
    video.muted = true;

    const handlePlay = () => {
      audio.currentTime = video.currentTime;
      audio.play().catch(console.warn);
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleSeeking = () => {
      audio.currentTime = video.currentTime;
    };

    const handleVolume = () => {
      audio.volume = video.volume;
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("volumechange", handleVolume);

    audio.volume = video.volume;
    audio.currentTime = video.currentTime;
    if (!video.paused) {
      audio.play().catch(console.warn);
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("volumechange", handleVolume);
      audio.pause();
    };
  }, [audioUrl, syncVoiceover, audioElement]);

  const handleGenerateVoiceover = async () => {
    if (!scriptText.trim()) {
      toast({ title: locale === "en" ? "Error" : "خطأ", description: locale === "en" ? "Please enter script text" : "يرجى كتابة نص التعليق الصوتي", variant: "destructive" });
      return;
    }

    setGeneratingTts(true);
    setAudioUrl(null);
    setSyncVoiceover(false);

    const voice = selectedVoiceId === "custom" ? customVoiceId : selectedVoiceId;
    if (selectedVoiceId === "custom" && !customVoiceId.trim()) {
      toast({ title: locale === "en" ? "Error" : "خطأ", description: locale === "en" ? "Please enter custom Voice ID" : "يرجى إدخال معرف الصوت المخصص", variant: "destructive" });
      setGeneratingTts(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: scriptText, voiceId: voice }
      });

      if (error) throw error;

      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
        if (blob.size < 500) {
          try {
            const text = await blob.text();
            const parsed = JSON.parse(text);
            if (parsed.fallback || parsed.error) {
              throw new Error(parsed.details || parsed.error || "ElevenLabs synthesis failed");
            }
          } catch (e) {
            // Not valid JSON, process as audio
          }
        }
      } else {
        if (data && typeof data === "object") {
          const anyData = data as any;
          if (anyData.fallback || anyData.error) {
            throw new Error(anyData.details || anyData.error || "ElevenLabs synthesis failed");
          }
        }
        blob = new Blob([data as any], { type: "audio/mpeg" });
      }

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setSyncVoiceover(true); // Auto-enable sync to let them hear it immediately
      toast({ title: locale === "en" ? "Success" : "تم بنجاح ✅", description: locale === "en" ? "AI Voiceover generated successfully!" : "تم توليد التعليق الصوتي بالذكاء الاصطناعي بنجاح!" });
    } catch (e: any) {
      console.error(e);
      toast({ title: locale === "en" ? "Generation Failed" : "فشل توليد الصوت", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingTts(false);
    }
  };
  const [watchedVideos, setWatchedVideos] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("tawzeef-watched-videos");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleToggleWatched = (key: string) => {
    const nextWatched = watchedVideos.includes(key)
      ? watchedVideos.filter(k => k !== key)
      : [...watchedVideos, key];
    
    setWatchedVideos(nextWatched);
    localStorage.setItem("tawzeef-watched-videos", JSON.stringify(nextWatched));
  };

  const categories = [
    { id: "all", label: locale === "en" ? "All Videos" : "جميع الفيديوهات" },
    { id: "core", label: locale === "en" ? "Core Features" : "أساسيات النظام" },
    { id: "advanced", label: locale === "en" ? "Advanced Features" : "خيارات متقدمة" },
    { id: "ai", label: locale === "en" ? "AI Tools" : "الذكاء الاصطناعي" }
  ];

  const filteredVideos = useMemo(() => {
    return featureVideos.filter(v => {
      const matchesCategory = selectedCategory === "all" || v.category === selectedCategory;
      const title = t(`tutorial.feat.${v.key}.title`).toLowerCase();
      const matchesSearch = title.includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, t]);

  const completionPercentage = Math.round((watchedVideos.length / featureVideos.length) * 100);

  return (
    <div className="space-y-6">
      {/* Academy Progress Bar */}
      <Card className="border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Award className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {locale === "en" ? "Tawzeef-X Academy Center" : "أكاديمية تعليم توظيف-إكس"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === "en" 
                  ? "Track your progress and master all the platform screens" 
                  : "تابع مستوى تقدمك وتعرّف على أسرار استخدام كافة شاشات المنصة"}
              </p>
            </div>
          </div>
          
          <div className="w-full sm:w-60 space-y-1.5 text-right" dir={dir}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-primary font-bold">{completionPercentage}%</span>
              <span className="text-muted-foreground">
                {locale === "en" 
                  ? `${watchedVideos.length} of ${featureVideos.length} Completed` 
                  : `تمت مشاهدة ${watchedVideos.length} من أصل ${featureVideos.length}`}
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Academy Hub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border border-border/60 shadow-md">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black group">
                <video
                  ref={videoRef}
                  key={activeVideo.key}
                  src={activeVideo.src}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              </div>
              <div className="p-5 space-y-4 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-right" dir={dir}>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        {activeVideo.category}
                      </span>
                      <h2 className="text-lg font-bold text-foreground">
                        {t(`tutorial.feat.${activeVideo.key}.title`)}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {locale === "en" ? `Duration: ${activeVideo.duration} mins` : `مدة الفيديو: ${activeVideo.duration} دقائق`}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleToggleWatched(activeVideo.key)}
                    variant={watchedVideos.includes(activeVideo.key) ? "outline" : "default"}
                    className="gap-2 text-xs h-9"
                  >
                    <CheckCircle2 className={cn("w-4 h-4", watchedVideos.includes(activeVideo.key) ? "text-green-500 fill-green-500/10" : "")} />
                    {watchedVideos.includes(activeVideo.key) 
                      ? (locale === "en" ? "Completed" : "تمت المشاهدة ✅") 
                      : (locale === "en" ? "Mark as Watched" : "تحديد كمشاهد")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ElevenLabs AI Voiceover Studio */}
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-md overflow-hidden mt-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Mic className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {locale === "en" ? "ElevenLabs AI Voiceover Studio" : "استوديو التعليق الصوتي بالذكاء الاصطناعي (ElevenLabs)"}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {locale === "en" 
                        ? "Generate custom AI narration and synchronize it with this video tutorial" 
                        : "ولّد تعليقاً صوتياً احترافياً بالذكاء الاصطناعي وقم بمزامنته مع هذا الدرس"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold">
                  {locale === "en" ? "Admin Settings" : "إعدادات المسؤول"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Script Textarea */}
              <div className="space-y-1.5 text-right" dir={dir}>
                <label className="text-xs font-bold text-muted-foreground">
                  {locale === "en" ? "Voiceover Script" : "نص السيناريو والتعليق الصوتي"}
                </label>
                <Textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder={locale === "en" ? "Enter the script text..." : "اكتب النص الذي سيقوله المعلق الصوتي..."}
                  className="min-h-[100px] text-xs leading-relaxed resize-y"
                />
              </div>

              {/* Voice Selector & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right" dir={dir}>
                {/* Voice Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">
                    {locale === "en" ? "Select AI Voice" : "اختر صوت الذكاء الاصطناعي"}
                  </label>
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="AZnzlk1XipRD3TQA3GNg">ميمي (عربي/متعدد اللغات - Mimi)</option>
                    <option value="pNInz6obpgq5epaNsJ15">راشيل (متعدد اللغات - Rachel)</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">سارة (إنجليزي - Sarah)</option>
                    <option value="ErXwobaYiN019PkySvjV">أنطوني (صوت رجالي - Antoni)</option>
                    <option value="custom">أدخل Voice ID مخصص...</option>
                  </select>
                </div>

                {/* Custom Voice ID Input */}
                {selectedVoiceId === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">
                      {locale === "en" ? "Custom ElevenLabs Voice ID" : "معرّف الصوت الخاص (Voice ID)"}
                    </label>
                    <Input
                      value={customVoiceId}
                      onChange={(e) => setCustomVoiceId(e.target.value)}
                      placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Generation Control */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  onClick={handleGenerateVoiceover}
                  disabled={generatingTts}
                  className="gap-2 text-xs font-bold shrink-0 min-w-[150px]"
                >
                  {generatingTts ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {locale === "en" ? "Generating..." : "جاري التوليد..."}
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      {locale === "en" ? "Generate Voiceover" : "توليد التعليق الصوتي"}
                    </>
                  )}
                </Button>

                {/* Status indicator and audio controls */}
                {audioUrl && (
                  <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/40 w-full sm:w-auto">
                    {/* Play/Pause control for testing audio alone */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => {
                          if (audioElement) {
                            if (audioElement.paused) audioElement.play().catch(console.warn);
                            else audioElement.pause();
                          } else {
                            const audio = new Audio(audioUrl);
                            setAudioElement(audio);
                            audio.play().catch(console.warn);
                          }
                        }}
                      >
                        <Music className="w-4 h-4" />
                      </Button>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {locale === "en" ? "Test Track" : "معاينة الصوت"}
                      </span>
                    </div>

                    <div className="h-4 w-px bg-border/80 hidden sm:block" />

                    {/* Sync toggle */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={syncVoiceover ? "default" : "outline"}
                        className="h-7 text-[10px] font-bold px-2.5 rounded-lg gap-1.5"
                        onClick={() => setSyncVoiceover(!syncVoiceover)}
                      >
                        {syncVoiceover ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {syncVoiceover 
                          ? (locale === "en" ? "Mute Video & Play Sync" : "مزامنة الصوت نشطة 🔊") 
                          : (locale === "en" ? "Sync with Video" : "مزامنة مع الفيديو")}
                      </Button>
                    </div>

                    {/* Download button */}
                    <a
                      href={audioUrl}
                      download={`tawzeef-x-${activeVideo.key}-voiceover.mp3`}
                      className="p-1.5 rounded-lg bg-background hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
                      title={locale === "en" ? "Download MP3" : "تحميل ملف MP3"}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Waveform Visualization Overlay during generation */}
              {generatingTts && (
                <div className="flex items-center justify-center gap-1.5 py-4 bg-muted/10 rounded-xl border border-dashed border-primary/20">
                  <span className="text-xs text-primary font-bold animate-pulse mr-2">
                    {locale === "en" ? "ElevenLabs is synthesizing voice..." : "تقوم ElevenLabs بتركيب تعليقك الصوتي الآن..."}
                  </span>
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 bg-primary rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 20 + 8}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: "0.6s"
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Playlist */}
        <div className="space-y-4">
          {/* Filters and Search */}
          <Card className="border border-border/50 p-4 space-y-3.5 bg-card/60">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" dir={dir} />
              <Input
                placeholder={locale === "en" ? "Search tutorials..." : "ابحث عن درس تعليمي..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-3 pr-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                    selectedCategory === cat.id
                      ? "bg-primary border-primary text-white shadow-sm"
                      : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Playlist Scrollable */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filteredVideos.map((video, idx) => {
                const isActive = activeVideo.key === video.key;
                const isWatched = watchedVideos.includes(video.key);

                return (
                  <motion.div
                    key={video.key}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => setActiveVideo(video)}
                      className={cn(
                        "w-full text-right flex items-center justify-between p-3 rounded-xl border transition-all text-xs group",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/40 bg-card hover:bg-muted/20 hover:border-border/60"
                      )}
                      dir={dir}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                          isActive ? "bg-primary text-white border-primary/20" : cn(video.bg, "border-border/20")
                        )}>
                          {isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <video.icon className={cn("w-4 h-4", video.color)} />}
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="font-bold text-foreground truncate">
                            {t(`tutorial.feat.${video.key}.title`)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {video.duration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isWatched && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10 shrink-0" />
                        )}
                        {dir === "rtl" ? <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
