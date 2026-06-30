import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, Users, Calendar, FileText, Play, Kanban, Bot, 
  BarChart3, Target, Share2, Settings, Search, CheckCircle2, 
  Clock, Award, BookOpen, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const featureVideos = [
  { key: "jobs", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", src: "/videos/tawzeef-x-jobs.mp4", category: "core", duration: "2:15" },
  { key: "candidates", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", src: "/videos/tawzeef-x-candidates.mp4", category: "core", duration: "3:05" },
  { key: "pipeline", icon: Kanban, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", src: "/videos/tawzeef-x-pipeline.mp4", category: "core", duration: "1:50" },
  { key: "interviews", icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", src: "/videos/tawzeef-x-interviews.mp4", category: "core", duration: "2:40" },
  { key: "offers", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", src: "/videos/tawzeef-x-offers.mp4", category: "core", duration: "2:00" },
  { key: "ai", icon: Bot, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", src: "/videos/tawzeef-x-ai-guide.mp4", category: "ai", duration: "4:20" },
  { key: "reports", icon: BarChart3, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", src: "/videos/tawzeef-x-reports.mp4", category: "advanced", duration: "3:10" },
  { key: "hiring", icon: Target, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", src: "/videos/tawzeef-x-hiring.mp4", category: "advanced", duration: "1:45" },
  { key: "share", icon: Share2, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", src: "/videos/tawzeef-x-share.mp4", category: "advanced", duration: "2:10" },
  { key: "settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", src: "/videos/tawzeef-x-settings.mp4", category: "advanced", duration: "2:55" },
];

export default function FeatureVideos() {
  const { t, locale, dir } = useI18n();
  const [activeVideo, setActiveVideo] = useState(featureVideos[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
