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

function usePublicJobs(companyId?: string | null) {
  return useQuery({
    queryKey: ["public-jobs", companyId],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("id, title, department, location, type, experience_level, salary_min, salary_max, created_at, description, requirements")
        .eq("status", "نشطة");
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function useCompanyBranding(companyId?: string | null) {
  return useQuery({
    queryKey: ["company-public-branding", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, logo_url, brand_settings")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
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

function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

export default function Careers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = searchParams.get("company");

  const { data: companyBranding, isLoading: isBrandingLoading } = useCompanyBranding(companyId);
  const { data: jobs, isLoading: isJobsLoading } = usePublicJobs(companyId);

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [department, setDepartment] = useState("all");
  const [type, setType] = useState("all");
  const [location, setLocation] = useState("all");

  const brand = useMemo(() => {
    if (!companyBranding) return null;
    const settings = (companyBranding.brand_settings as any) || {};
    return {
      name: settings.companyName || companyBranding.name || "شركة شريكة",
      logoUrl: settings.logoUrl || companyBranding.logo_url,
      primaryColor: settings.primaryColor || "#0d9488",
      accentColor: settings.accentColor || "#14b8a6",
      fontFamily: settings.fontFamily || "Cairo, sans-serif",
    };
  }, [companyBranding]);

  // Convert Hex values to CSS variable-friendly HSL format
  const styleVars = useMemo(() => {
    if (!brand) return {};
    try {
      const primaryHsl = hexToHsl(brand.primaryColor);
      const accentHsl = hexToHsl(brand.accentColor);
      return {
        "--primary": primaryHsl,
        "--ring": primaryHsl,
        "--accent": accentHsl,
        fontFamily: brand.fontFamily,
      } as React.CSSProperties;
    } catch (e) {
      console.error("Error setting custom branding styles", e);
      return {};
    }
  }, [brand]);

  const departments = useMemo(() => [...new Set((jobs || []).map(j => j.department).filter(Boolean))], [jobs]);
  const locations = useMemo(() => [...new Set((jobs || []).map(j => j.location).filter(Boolean))], [jobs]);
  const types = useMemo(() => [...new Set((jobs || []).map(j => j.type).filter(Boolean))], [jobs]);

  const filtered = useMemo(() => {
    return (jobs || []).filter(j => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || 
        j.title.toLowerCase().includes(q) || 
        (j.department && j.department.toLowerCase().includes(q)) || 
        (j.location && j.location.toLowerCase().includes(q));
      const matchDept = department === "all" || j.department === department;
      const matchType = type === "all" || j.type === type;
      const matchLoc = location === "all" || j.location === location;
      return matchSearch && matchDept && matchType && matchLoc;
    });
  }, [jobs, search, department, type, location]);

  const hasFilters = department !== "all" || type !== "all" || location !== "all";

  const isLoading = isJobsLoading || isBrandingLoading;

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={styleVars}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {brand ? (
              <>
                {brand.logoUrl ? (
                  <div className="bg-white/90 rounded-xl p-1 shadow-sm border border-border/50">
                    <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                    {brand.name.substring(0, 2)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">{brand.name}</span>
                  <span className="text-[8px] text-muted-foreground/60 tracking-wider">بوابة التوظيف المهنية</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/90 rounded-xl p-1 shadow-sm">
                  <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">Tawzeef-X</span>
                  <span className="text-[9px] text-muted-foreground tracking-widest uppercase">الوظائف</span>
                </div>
              </>
            )}
          </Link>
          <div className="flex items-center gap-2">
            {brand && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 border-l border-border/50 pl-3">
                شريك تقني لـ <span className="font-bold text-muted-foreground/75">Tawzeef-X</span>
              </span>
            )}
            <Link to="/portal">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                <Search className="w-3.5 h-3.5" />تتبع طلبك
              </Button>
            </Link>
            {!brand && (
              <Link to="/auth?mode=signup">
                <Button size="sm" className="text-xs gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />سجل كشركة
                </Button>
              </Link>
            )}
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
            {brand ? `فرص العمل الحالية في ${brand.name}` : "اكتشف فرصتك المهنية القادمة"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-muted-foreground text-sm sm:text-base mb-8 max-w-lg mx-auto"
          >
            {brand ? `تصفح الوظائف المتاحة وقدّم الآن للانضمام إلى فريقنا المتميز` : "تصفح الوظائف المتاحة وقدّم بسهولة — بدون تسجيل دخول"}
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          {brand ? (
            <>
              <p>© {new Date().getFullYear()} {brand.name} — بوابة التوظيف المهنية</p>
              <p className="text-[10px] text-muted-foreground/50">بشراكة تقنية مع Tawzeef-X لخدمات التوظيف الذكي</p>
            </>
          ) : (
            <p>© {new Date().getFullYear()} Tawzeef-X — منصة التوظيف الذكية</p>
          )}
        </div>
      </footer>
    </div>
  );
}
