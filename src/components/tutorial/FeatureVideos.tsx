import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Briefcase, Users, Calendar, FileText, Play, Kanban, Bot, BarChart3, Target, Share2, Settings } from "lucide-react";
import { useState } from "react";

const featureVideos = [
  { key: "jobs", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", src: "/videos/tawzeef-x-jobs.mp4" },
  { key: "candidates", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", src: "/videos/tawzeef-x-candidates.mp4" },
  { key: "pipeline", icon: Kanban, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", src: "/videos/tawzeef-x-pipeline.mp4" },
  { key: "interviews", icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", src: "/videos/tawzeef-x-interviews.mp4" },
  { key: "offers", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", src: "/videos/tawzeef-x-offers.mp4" },
  
  { key: "reports", icon: BarChart3, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", src: "/videos/tawzeef-x-reports.mp4" },
  { key: "hiring", icon: Target, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", src: "/videos/tawzeef-x-hiring.mp4" },
  { key: "share", icon: Share2, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", src: "/videos/tawzeef-x-share.mp4" },
  { key: "settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", src: "/videos/tawzeef-x-settings.mp4" },
];

export default function FeatureVideos() {
  const { t } = useI18n();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        {t("tutorial.videos.title")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featureVideos.map((v, i) => (
          <motion.div
            key={v.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className={`overflow-hidden border ${v.border} hover:shadow-md transition-all duration-300 group`}>
              <CardContent className="p-0">
                <div className="relative">
                  <video
                    src={v.src}
                    controls
                    playsInline
                    className="w-full aspect-video bg-black"
                    preload="metadata"
                    onPlay={() => setPlaying(v.key)}
                    onPause={() => setPlaying(null)}
                  />
                </div>
                <div className={`p-3 flex items-center gap-3 border-t ${v.border} bg-gradient-to-r from-card to-muted/20`}>
                  <div className={`p-2 rounded-xl ${v.bg}`}>
                    <v.icon className={`w-4 h-4 ${v.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-foreground">
                      {t(`tutorial.feat.${v.key}.title`)}
                    </span>
                  </div>
                  {playing === v.key && (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(b => (
                        <motion.div
                          key={b}
                          className={`w-0.5 rounded-full ${v.color.replace("text-", "bg-")}`}
                          animate={{ height: [4, 12, 4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: b * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
