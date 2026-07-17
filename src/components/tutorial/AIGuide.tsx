import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Bot, Brain, FileSearch, Users, MessageSquare, Sparkles, Zap,
  ArrowRight, CheckCircle2, Star, BarChart3, Lightbulb, Target,
  Shield, Clock, TrendingUp,
} from "lucide-react";

const aiFeatures = [
  {
    key: "resume",
    icon: FileSearch,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    gradient: "from-blue-500/5 to-blue-500/0",
  },
  {
    key: "ranking",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/5 to-emerald-500/0",
  },
  {
    key: "evaluation",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    gradient: "from-amber-500/5 to-amber-500/0",
  },
  {
    key: "questions",
    icon: MessageSquare,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    gradient: "from-violet-500/5 to-violet-500/0",
  },
  {
    key: "sentiment",
    icon: Brain,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    gradient: "from-rose-500/5 to-rose-500/0",
  },
  {
    key: "jobdesc",
    icon: Sparkles,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/5 to-cyan-500/0",
  },
  {
    key: "assistant",
    icon: Bot,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    gradient: "from-indigo-500/5 to-indigo-500/0",
  },
];

const aiAdvantages = [
  { key: "speed", icon: Clock },
  { key: "accuracy", icon: Target },
  { key: "fairness", icon: Shield },
  { key: "insights", icon: BarChart3 },
];

export default function AIGuide() {
  const { t, locale } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioUrl = "/videos/tawzeef-x-ai-audio.mp3";
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioUrl) return;

    const audio = audioElement || new Audio(audioUrl);
    if (!audioElement) {
      setAudioElement(audio);
    }
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
  }, [audioUrl, audioElement]);

  return (
    <div className="space-y-8">
      {/* AI Tutorial Video */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <video
              ref={videoRef}
              src="/videos/tawzeef-x-ai-guide.mp4"
              controls
              playsInline
              className="w-full aspect-video bg-black"
              preload="metadata"
            />
          </CardContent>
          <div className="p-3 flex items-center gap-2 border-t border-border/50 bg-gradient-to-r from-card to-muted/20">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {locale === "ar" ? "فيديو شامل لميزات الذكاء الاصطناعي" : "Comprehensive AI features overview"}
            </span>
          </div>
        </Card>
      </motion.div>

      {/* AI Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-sm overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="w-3 h-3" />
                {t("tutorial.ai.badge")}
              </Badge>
            </div>
            <CardTitle className="text-xl">
              {t("tutorial.ai.hero.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t("tutorial.ai.hero.desc")}
            </p>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiAdvantages.map((adv, i) => (
                <motion.div
                  key={adv.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/50"
                >
                  <adv.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    {t(`tutorial.ai.adv.${adv.key}`)}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Features Detailed */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          {t("tutorial.ai.features.title")}
        </h2>

        <div className="space-y-4">
          {aiFeatures.map((feat, i) => (
            <motion.div
              key={feat.key}
              initial={{ opacity: 0, x: locale === "ar" ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`border ${feat.border} overflow-hidden`}>
                <div className={`bg-gradient-to-r ${feat.gradient}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${feat.bg}`}>
                        <feat.icon className={`w-5 h-5 ${feat.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {t(`tutorial.ai.feat.${feat.key}.title`)}
                          <Badge
                            variant="outline"
                            className="text-[10px] opacity-60"
                          >
                            {String(i + 1).padStart(2, "0")}
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(`tutorial.ai.feat.${feat.key}.subtitle`)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`tutorial.ai.feat.${feat.key}.desc`)}
                    </p>

                    {/* How to use */}
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/30">
                      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        {t("tutorial.ai.howto")}
                      </p>
                      <ul className="space-y-2">
                        {t(`tutorial.ai.feat.${feat.key}.steps`)
                          .split("|")
                          .map((step, si) => (
                            <li
                              key={si}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                                {si + 1}
                              </div>
                              <span>{step.trim()}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* Pro tip */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">
                          {t("tutorial.ai.protip")}
                        </span>{" "}
                        {t(`tutorial.ai.feat.${feat.key}.tip`)}
                      </p>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Workflow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              {t("tutorial.ai.workflow.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("tutorial.ai.workflow.desc")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-2"
                >
                  <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/15 whitespace-nowrap">
                    {t(`tutorial.ai.workflow.step${n}`)}
                  </div>
                  {i < 4 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
