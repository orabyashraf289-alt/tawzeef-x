import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Briefcase, Clock, Building2, ChevronLeft, Filter, X, DollarSign, Globe, Users, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import SARSymbol from "@/components/SARSymbol";

function usePublicJobs() {
  return useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, department, location, type, experience_level, salary_min, salary_max, created_at, description, requirements")
        .eq("status", "نشطة")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

const typeLabels: Record<string, string> = {
  "دوام كامل": "دوام كامل",
  "دوام جزئي": "دوام جزئي",
  "عن بُعد": "عن بُعد",
  "عقد": "عقد",
  "تدريب": "تدريب",
};

const typeBadgeStyle: Record<string, string> = {
  "دوام كامل": "bg-primary/10 text-primary border-primary/20",
  "دوام جزئي": "bg-accent/10 text-accent border-accent/20",
  "عن بُعد": "bg-success/10 text-success border-success/20",
  "عقد": "bg-warning/10 text-warning border-warning/20",
  "تدريب": "bg-info/10 text-info border-info/20",
};

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `من ${fmt(min)}`;
  return `حتى ${fmt(max!)}`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

export default function Careers() {
  const { data: jobs, isLoading } = usePublicJobs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [department, setDepartment] = useState("all");
  const [type, setType] = useState("all");
  const [location, setLocation] = useState("all");

  const departments = useMemo(() => [...new Set((jobs || []).map(j => j.department).filter(Boolean))], [jobs]);
  const locations = useMemo(() => [...new Set((jobs || []).map(j => j.location).filter(Boolean))], [jobs]);
  const types = useMemo(() => [...new Set((jobs || []).map(j => j.type).filter(Boolean))], [jobs]);

  const filtered = useMemo(() => {
    return (jobs || []).filter(j => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q) || j.location.toLowerCase().includes(q);
      const matchDept = department === "all" || j.department === department;
      const matchType = type === "all" || j.type === type;
      const matchLoc = location === "all" || j.location === location;
      return matchSearch && matchDept && matchType && matchLoc;
    });
  }, [jobs, search, department, type, location]);

  const hasFilters = department !== "all" || type !== "all" || location !== "all";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-white/90 rounded-xl p-1 shadow-sm">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Tawzeef-X</span>
              <span className="text-[9px] text-muted-foreground tracking-widest uppercase">الوظائف</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/portal">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                <Search className="w-3.5 h-3.5" />تتبع طلبك
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />سجل كشركة
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-black text-foreground mb-3"
          >
            اكتشف فرصتك المهنية القادمة
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-muted-foreground text-sm sm:text-base mb-8 max-w-lg mx-auto"
          >
            تصفح الوظائف المتاحة وقدّم بسهولة — بدون تسجيل دخول
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن وظيفة، قسم، أو مدينة..."
                className="h-12 pr-12 text-base bg-card border-border/60 shadow-sm rounded-2xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-primary" />
              <strong className="text-foreground">{(jobs || []).length}</strong> وظيفة نشطة
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-accent" />
              <strong className="text-foreground">{departments.length}</strong> قسم
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-success" />
              <strong className="text-foreground">{locations.length}</strong> موقع
            </span>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {departments.length > 0 && (
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="القسم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {types.length > 0 && (
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="نوع العمل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {locations.length > 0 && (
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="الموقع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواقع</SelectItem>
                {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <button
              onClick={() => { setDepartment("all"); setType("all"); setLocation("all"); }}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <X className="w-3 h-3" />مسح الفلاتر
            </button>
          )}
          <span className="text-xs text-muted-foreground mr-auto">
            {filtered.length} نتيجة
          </span>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-2xl p-5 border border-border/50 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded-full w-16" />
                  <div className="h-6 bg-muted rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-foreground font-semibold mb-1">لا توجد وظائف مطابقة</p>
            <p className="text-sm text-muted-foreground">جرّب تعديل معايير البحث</p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((job, i) => {
                const salary = formatSalary(job.salary_min, job.salary_max);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <Link to={`/apply/${job.id}`} className="block">
                      <div className="bg-card rounded-2xl p-5 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all h-full flex flex-col group">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {job.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.department}</p>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge variant="outline" className={cn("text-[10px] font-medium", typeBadgeStyle[job.type] || "")}>
                            {job.type}
                          </Badge>
                          {job.experience_level && (
                            <Badge variant="outline" className="text-[10px]">{job.experience_level}</Badge>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1.5 mt-auto">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{job.location}</span>
                          </div>
                          {salary && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <SARSymbol className="w-3.5 h-3.5" />
                              <span>{salary} ر.س/شهرياً</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeAgo(job.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Tawzeef-X — منصة التوظيف الذكية</p>
        </div>
      </footer>
    </div>
  );
}
