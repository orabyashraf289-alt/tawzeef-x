import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import confetti from "canvas-confetti";
import { useNavigate, useSearchParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, Shield, Zap, BarChart3, FileCheck, Briefcase, Sparkles, Building2, CheckCircle2, KeyRound, Monitor, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ─── Device Trust Helpers ─── */
const TRUST_KEY = "tawzeef-x_trusted_device";
const TRUST_DAYS = 30;

function generateDeviceId(): string {
  const nav = window.navigator;
  const raw = [nav.userAgent, nav.language, screen.width, screen.height, new Date().getTimezoneOffset()].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}

function isTrustedDevice(email: string): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(TRUST_KEY) || "{}");
    const entry = data[email];
    if (!entry) return false;
    if (Date.now() > entry.expires) { delete data[email]; localStorage.setItem(TRUST_KEY, JSON.stringify(data)); return false; }
    return entry.deviceId === generateDeviceId();
  } catch { return false; }
}

function trustDevice(email: string) {
  try {
    const data = JSON.parse(localStorage.getItem(TRUST_KEY) || "{}");
    data[email] = { deviceId: generateDeviceId(), expires: Date.now() + TRUST_DAYS * 24 * 60 * 60 * 1000 };
    localStorage.setItem(TRUST_KEY, JSON.stringify(data));
  } catch {}
}
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { lovable } from "@/integrations/lovable/index";
import { translateAuthError } from "@/lib/authErrors";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { checkPasswordStrength, isRateLimited, isValidEmail, sanitizeInput, detectSuspiciousInput } from "@/lib/security";

/* ─── Optimized Animated Aurora Background ─── */
const AuroraBackground = memo(function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Aurora layer 1 — teal sweep */}
      <div
        className="absolute w-[140%] h-[140%] top-[-40%] right-[-30%] will-change-transform"
        style={{
          background: "conic-gradient(from 180deg at 50% 50%, hsl(var(--primary) / 0.12) 0deg, hsl(var(--accent) / 0.06) 120deg, transparent 240deg, hsl(var(--primary) / 0.12) 360deg)",
          filter: "blur(90px)",
          transform: "translate3d(0,0,0)",
          animation: "spin-slow 70s linear infinite",
        }}
      />
      {/* Aurora layer 2 — coral bloom */}
      <div
        className="absolute w-[120%] h-[120%] bottom-[-30%] left-[-20%] will-change-transform"
        style={{
          background: "conic-gradient(from 0deg at 40% 60%, hsl(var(--accent) / 0.08) 0deg, transparent 120deg, hsl(var(--primary) / 0.07) 240deg, hsl(var(--accent) / 0.08) 360deg)",
          filter: "blur(110px)",
          transform: "translate3d(0,0,0)",
          animation: "spin-reverse-slow 90s linear infinite",
        }}
      />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
    </div>
  );
});

/* ─── Live AI Recruiting Command Center Mockup (High Performance) ─── */
const AICommandCenterWidget = memo(function AICommandCenterWidget() {
  const [parseProgress, setParseProgress] = useState(0);
  const [phase, setPhase] = useState<"parsing" | "matched" | "completed">("parsing");

  useEffect(() => {
    const cycle = () => {
      setPhase("parsing");
      setParseProgress(0);

      // Animate parsing progress to 100% over 3 seconds
      const interval = setInterval(() => {
        setParseProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setPhase("matched");
            
            // Advance to completed stepper after 3 more seconds
            setTimeout(() => {
              setPhase("completed");
            }, 3000);

            return 100;
          }
          return p + 4;
        });
      }, 100);

      return () => {
        clearInterval(interval);
      };
    };
    
    let cleanup = cycle();
    const interval = setInterval(() => {
      cleanup();
      cleanup = cycle();
    }, 12000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full max-w-[325px] mx-auto rounded-[20px] bg-white border border-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.02)] p-3 relative overflow-hidden select-none text-right">
      {/* Top subtle gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
      
      {/* Background decoration blur */}
      <div className="absolute -top-12 -right-12 w-20 h-20 rounded-full bg-emerald-500/5 filter blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-20 h-20 rounded-full bg-cyan-500/5 filter blur-3xl pointer-events-none" />

      <div className="space-y-2.5 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-800">تحليل المطابقة الذكي (AI Match)</span>
          </div>
          <span className="text-[7.5px] font-bold text-slate-400 tracking-wider">Engine v2</span>
        </div>

        {/* Section 1: File Parsing (Always Fully Visible) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-500">
            <span>تحليل السيرة الذاتية...</span>
            <span className="font-black text-slate-700">{parseProgress}%</span>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-cyan-50 flex items-center justify-center text-cyan-500 shrink-0">
                <FileCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-right overflow-hidden">
                <p className="text-[10px] font-bold text-slate-700 truncate">cv_ahmed_software.pdf</p>
                <p className="text-[7.5px] text-slate-400">حجم الملف: 1.2 ميجابايت</p>
              </div>
            </div>
            <Badge variant="secondary" className={`text-[7.5px] px-1 h-4 transition-all duration-300 ${parseProgress === 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-slate-50 text-slate-500'}`}>
              {parseProgress === 100 ? "مكتمل ✅" : "جاري التحليل..."}
            </Badge>
          </div>
          <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-300" 
              style={{ width: `${parseProgress}%` }}
            />
          </div>
        </div>

        {/* Section 2: AI Matching & Skills Breakdown (Pre-rendered, opacity changes) */}
        <div className={`space-y-2.5 transition-all duration-500 ${phase === "parsing" ? "opacity-35 blur-[0.5px] scale-[0.98]" : "opacity-100 blur-0 scale-100"}`}>
          <span className="text-[8.5px] font-black text-slate-400 block pt-0.5">المطابقة والتصنيف الذكي</span>
          
          {/* Profile Card Header with matching ring */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/50 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 border border-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-tr from-emerald-400 to-cyan-400 text-white font-bold text-[8.5px]">أ م</AvatarFallback>
              </Avatar>
              <div className="text-right">
                <h3 className="text-[10px] font-black text-slate-800">أحمد محمد</h3>
                <p className="text-[7.5px] text-slate-400 font-bold">مطور برمجيات Senior</p>
              </div>
            </div>

            {/* Match percentage gauge SVG */}
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="13" stroke="#f1f5f9" strokeWidth="2.5" fill="transparent" />
                <circle cx="16" cy="16" r="13" stroke="url(#paint0_linear)" strokeWidth="2.5" fill="transparent" strokeDasharray="81" strokeDashoffset="3.24" strokeLinecap="round" />
                <defs>
                  <linearGradient id="paint0_linear" x1="0" y1="0" x2="1" y2="0">
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-800 leading-none">96%</span>
                <span className="text-[4px] text-slate-400 font-bold leading-none mt-0.5">مطابقة</span>
              </div>
            </div>
          </div>

          {/* Skills and Matching criteria breakdown */}
          <div className="space-y-1">
            {[
              { title: "المهارات التقنية والبرمجية", percent: 98, color: "from-emerald-400 to-cyan-400" },
              { title: "الخبرة والمشاريع السابقة", percent: 92, color: "from-cyan-400 to-blue-400" },
              { title: "التوافق الثقافي للمؤسسة", percent: 95, color: "from-emerald-400 to-teal-400" }
            ].map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-600">
                  <span>{item.title}</span>
                  <span className="text-slate-800 font-black">{item.percent}%</span>
                </div>
                <div className="h-[2px] w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Skill tags */}
          <div className="flex flex-wrap gap-1 justify-start" dir="ltr">
            {["React", "TypeScript", "Node.js", "Supabase", "SQL"].map((tag) => (
              <span key={tag} className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/40">
                {tag}
              </span>
            ))}
          </div>

          {/* AI Recommendation Quote box */}
          <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100/50 relative overflow-hidden">
            <div className="flex gap-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-right">
                <p className="text-[7.5px] font-black text-emerald-700">توصية الذكاء الاصطناعي:</p>
                <p className="text-[8.5px] text-slate-700 leading-relaxed font-medium mt-0.5">
                  أحمد يمتلك خبرة عميقة ومشاريع سابقة تطابق المتطلبات بدقة ممتازة. نوصي بجدولة مقابلة فنية فوراً.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Status progression stepper (Pre-rendered, opacity/color changes) */}
        <div className={`pt-2 border-t border-slate-100 flex items-center justify-between transition-all duration-500 ${phase === "parsing" ? "opacity-35 blur-[0.5px]" : "opacity-100 blur-0"}`}>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[6.5px] font-bold">✓</div>
            <span className="text-[8px] font-bold text-slate-500">تقديم الطلب</span>
          </div>
          <div className="w-4 h-[0.5px] bg-emerald-200" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[6.5px] font-bold">✓</div>
            <span className="text-[8px] font-bold text-slate-500">التصفية</span>
          </div>
          <div className="w-4 h-[0.5px] bg-slate-200" />
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[6.5px] font-bold transition-all duration-500 ${phase === "completed" ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
              {phase === "completed" ? "✓" : "3"}
            </div>
            <span className={`text-[8px] font-bold transition-all duration-500 ${phase === "completed" ? 'text-emerald-600' : 'text-slate-400'}`}>المقابلة</span>
          </div>
        </div>

      </div>
    </div>
  );
});

/* ─── Right branding panel (High Performance) ─── */
const BrandingPanel = memo(function BrandingPanel() {
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);

  // Extremely fast cursor follow tracking without layouts triggers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - 225);
    mouseY.set(e.clientY - rect.top - 225);
  }, [mouseX, mouseY]);

  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full relative overflow-hidden p-14 select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Soft emerald-teal light background */}
      <div className="absolute inset-0 bg-[#f4fcf9]" style={{
        background: "radial-gradient(circle at 100% 0%, #edfcf7 0%, #f4fbf8 70%)"
      }} />

      {/* Ambient neon light glow shapes (GPU Composited) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.06] filter blur-[110px] will-change-transform"
          style={{
            background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
            top: "-10%",
            right: "-10%",
            animation: "float-sphere-1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] filter blur-[95px] will-change-transform"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            bottom: "10%",
            left: "-10%",
            animation: "float-sphere-2 20s ease-in-out infinite",
          }}
        />
      </div>

      {/* Optimized Starry Particles using off-thread GPU animations */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-emerald-400 floating-particle"
            style={{
              width: `${(i % 2) + 2}px`,
              height: `${(i % 2) + 2}px`,
              left: `${10 + i * 9}%`,
              top: `${15 + (i * 13) % 70}%`,
              ["--float-duration" as any]: `${7 + (i % 3) * 2}s`,
              ["--float-delay" as any]: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Grid mesh pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* GPU accelerated cursor follow light */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full pointer-events-none opacity-[0.12] will-change-transform"
        style={{
          x: mouseX,
          y: mouseY,
          background: "radial-gradient(circle, #10b981 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* Header Info */}
      <div className="relative z-10 px-6 pt-4 space-y-12">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center border border-emerald-500/10 bg-white/80 backdrop-blur-xl relative overflow-hidden group p-2 shadow-sm transition-transform duration-300 hover:scale-105 hover:rotate-[-2deg]"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wide leading-tight text-slate-800">Tawzeef-X</span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-600/60 uppercase">منصة التوظيف الذكية</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="space-y-5">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/10 bg-emerald-50/50 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/25"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800">منصة التوظيف الذكية #1</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-slate-800 leading-tight">
            وظّف الأفضل <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              بذكاء وسرعة فائقة
            </span>
          </h1>

          <p className="text-sm leading-relaxed text-slate-500 max-w-[400px]">
            أتمتة كامل رحلة التوظيف بالذكاء الاصطناعي — من صياغة ونشر الوظيفة والبحث عن المرشحين والمطابقة الذكية، وحتى المقابلات وإرسال العروض.
          </p>
        </div>
      </div>

      {/* Synced AI Command Center widget */}
      <div className="relative z-10 my-4 flex items-center justify-center">
        <AICommandCenterWidget />
      </div>

      {/* Bottom Stats Container */}
      <div
        className="relative z-10 p-5 rounded-2xl border border-emerald-500/10 bg-white/60 backdrop-blur-2xl shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/3 to-cyan-500/3 opacity-30" />
        <div className="flex items-center justify-between relative z-10 px-4">
          {[
            { val: "AI", label: "تقييم ذكي" },
            { val: "24/7", label: "دعم متواصل" },
            { val: "98%", label: "رضا العملاء" },
            { val: "3X", label: "أسرع توظيفاً" },
          ].map((s, i) => (
            <div key={i} className="text-center transition-transform duration-200 hover:scale-105">
              <span className="text-2xl xl:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-800 to-slate-600 leading-none block">
                {s.val}
              </span>
              <span className="text-[9px] font-bold text-slate-400 block mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─── Social Buttons ─── */
const SocialButtons = memo(function SocialButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple" | "azure") => {
    setLoadingProvider(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="transition-all duration-200 hover:scale-[1.015] active:scale-[0.985]">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-11 rounded-xl text-xs font-bold gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all duration-300 px-1"
          onClick={() => handleOAuth("google")}
        >
          {loadingProvider === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </Button>
      </div>

      <div className="transition-all duration-200 hover:scale-[1.015] active:scale-[0.985]">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-11 rounded-xl text-xs font-bold gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all duration-300 px-1"
          onClick={() => handleOAuth("apple")}
        >
          {loadingProvider === "apple" ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          Apple
        </Button>
      </div>

      <div className="transition-all duration-200 hover:scale-[1.015] active:scale-[0.985]">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-11 rounded-xl text-xs font-bold gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all duration-300 px-1"
          onClick={() => handleOAuth("azure")}
        >
          {loadingProvider === "azure" ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 23 23">
              <path fill="#F25022" d="M1 1h10v10H1z" />
              <path fill="#7FBA00" d="M12 1h10v10H12z" />
              <path fill="#00A4EF" d="M1 12h10v10H1z" />
              <path fill="#FFB900" d="M12 12h10v10H12z" />
            </svg>
          )}
          Microsoft
        </Button>
      </div>
    </div>
  );
});

/* ─── Auth form ─── */
const AuthForm = memo(function AuthForm({ isLogin, setIsLogin, setPendingOtp }: { isLogin: boolean; setIsLogin: (v: boolean) => void; setPendingOtp: (v: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpShake, setOtpShake] = useState(false);
  const [pendingPassword, setPendingPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [accountType, setAccountType] = useState<"company" | "job_seeker">("company");
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get("email") || "";
  const [form, setForm] = useState({ email: inviteEmail, password: "", fullName: "", companyName: "" });
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current!); return 0; } return c - 1; }), 1000);
      return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }
  }, [countdown > 0]);

  const requestLoginOtp = useCallback(async (email: string) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-login-otp`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || "فشل إرسال رمز التحقق");
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        toast({ title: "خطأ", description: "يرجى إدخال بريد إلكتروني صحيح", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (detectSuspiciousInput(form.email) || detectSuspiciousInput(form.fullName || "") || detectSuspiciousInput(form.companyName || "")) {
        toast({ title: "خطأ", description: "تم رصد محتوى غير آمن في المدخلات", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (isRateLimited(`auth_${normalizedEmail}`, 5, 5 * 60 * 1000)) {
        toast({ title: "تجاوزت الحد المسموح ⛔", description: "يرجى الانتظار عدة دقائق قبل المحاولة مجدداً", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!isLogin && checkPasswordStrength(form.password).score < 2) {
        toast({ title: "كلمة المرور ضعيفة", description: "يرجى اختيار كلمة مرور أقوى (8 أحرف على الأقل مع رموز وأرقام)", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (isLogin) {
        setPendingOtp(true);
        setPendingPassword(form.password);
        let { data: loginData, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: form.password });

        // Smart Candidate Phone Password Fallback (if user typed phone with spaces/formatting)
        if (error && (error.message.includes("Invalid login credentials") || error.message.includes("invalid_credentials"))) {
          const cleanPhonePass = form.password.replace(/\D/g, "");
          if (cleanPhonePass && cleanPhonePass !== form.password && cleanPhonePass.length >= 6) {
            const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: cleanPhonePass });
            if (retry.data?.session) {
              loginData = retry.data;
              error = null;
            }
          }
        }

        if (error) { setPendingOtp(false); logAuditEvent({ eventType: "login.failed", userEmail: normalizedEmail, details: { reason: error.message } }); throw error; }

        const userRole = loginData.session?.user?.user_metadata?.role || loginData.session?.user?.user_metadata?.account_type;

        if (isTrustedDevice(normalizedEmail) || userRole === "candidate") {
          setPendingPassword("");
          setPendingOtp(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
          toast({ title: "تم تسجيل الدخول بنجاح ✅", description: userRole === "candidate" ? "مرحباً بك في بوابة المتقدمين" : "جهاز موثوق — تم تخطي التحقق" });
          logAuditEvent({ eventType: "login.success", userId: loginData.user?.id, userEmail: normalizedEmail, details: { method: "candidate_direct_login" } });
          navigate(userRole === "candidate" ? "/portal" : userRole === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
          return;
        }

        try {
          await requestLoginOtp(normalizedEmail);
          await supabase.auth.signOut();

          setOtpEmail(normalizedEmail);
          setOtpCode("");
          setOtpStep(true);
          setCountdown(60);
          toast({ title: "تم إرسال رمز التحقق ✉️", description: "أرسلنا رمزاً مكوناً من 6 أرقام إلى بريدك الإلكتروني" });
        } catch (otpError: any) {
          if (
            otpError.message.includes("Email credentials are not configured") ||
            otpError.message.includes("credentials are not configured")
          ) {
            setPendingPassword("");
            setPendingOtp(false);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
            toast({
              title: "تم تسجيل الدخول ✅",
              description: "تم تخطي التحقق الثنائي لعدم تهيئة بريد SMTP في الخادم",
            });
            logAuditEvent({
              eventType: "login.success",
              userId: loginData.user?.id,
              userEmail: normalizedEmail,
              details: { method: "direct_bypass_no_smtp" },
            });
            const accountType = loginData.session?.user?.user_metadata?.account_type;
            navigate(accountType === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
            return;
          } else {
            await supabase.auth.signOut();
            setPendingOtp(false);
            throw otpError;
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { full_name: form.fullName, account_type: accountType, company_name: accountType === "company" ? form.companyName : "" }, emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        if (data.user) {
          supabase.functions.invoke("send-welcome-email", {
            body: { email: form.email, fullName: form.fullName, accountType },
          }).catch(console.error);

          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"] });
          setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.3 } }), 300);
          setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.7 } }), 500);
          toast({ title: "مرحباً بك! 🎉", description: "تم إنشاء حسابك بنجاح — تحقق من بريدك الإلكتروني" });
          navigate("/onboarding");
        }
      }
    } catch (error: any) {
      setPendingPassword("");
      setPendingOtp(false);
      toast({ title: "خطأ", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setLoading(false); }
  }, [isLogin, form, navigate, accountType, requestLoginOtp, setPendingOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length < 6) {
      toast({ title: "يرجى إدخال الرمز المكون من 6 أرقام", variant: "destructive" });
      return;
    }

    if (!pendingPassword) {
      toast({ title: "انتهت جلسة التحقق", description: "يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
      setOtpStep(false);
      setPendingOtp(false);
      return;
    }

    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-login-otp", {
        body: { email: otpEmail, code: otpCode },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "تعذر التحقق من الرمز");
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: otpEmail,
        password: pendingPassword,
      });
      if (loginError) throw loginError;

      if (rememberDevice) trustDevice(otpEmail);
      setPendingPassword("");
      setPendingOtp(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
      toast({ title: "تم التحقق بنجاح ✅" });
      const accountType = loginData.session?.user?.user_metadata?.account_type;
      navigate(accountType === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
    } catch (error: any) {
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 600);
      toast({ title: "خطأ", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setOtpLoading(false); }
  }, [otpCode, pendingPassword, otpEmail, rememberDevice, navigate, setPendingOtp]);

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;

    if (!pendingPassword) {
      toast({ title: "انتهت جلسة التحقق", description: "يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
      setOtpStep(false);
      setPendingOtp(false);
      return;
    }

    setOtpLoading(true);
    try {
      await requestLoginOtp(otpEmail);
      setCountdown(60);
      toast({ title: "تم إعادة إرسال الرمز ✉️", description: "تحقق من آخر رسالة في بريدك الإلكتروني" });
    } catch (error: any) {
      toast({ title: "خطأ", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setOtpLoading(false); }
  }, [countdown, otpEmail, pendingPassword, requestLoginOtp, setPendingOtp]);

  const focused = (field: string) => focusedField === field;

  const inputClass = (field: string) =>
    `h-[48px] pr-11 rounded-xl text-[14px] font-medium transition-all duration-300 border-2 focus-visible:ring-0 focus-visible:ring-offset-0 ${
      focused(field)
        ? "bg-white border-primary shadow-[0_0_0_4px_rgba(16,185,129,0.12)] text-slate-900"
        : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300 text-slate-700 placeholder:text-slate-400"
    }`;

  const iconClass = (field: string) =>
    `absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
      focused(field) ? "text-primary scale-110" : "text-slate-400"
    }`;

  return (
    <div className="w-full max-w-[440px] mx-auto px-4 select-none">

      {/* Styled Sweeping Border Gradient Glassmorphism Container */}
      <div className="sweeping-border-card backdrop-blur-3xl shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_0_60px_-12px_rgba(16,185,129,0.12)]">
        
        {emailConfirmation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex items-center justify-center mx-auto"
              style={{ width: 72, height: 72, borderRadius: "20px", background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--primary) / 0.05))" }}
            >
              <CheckCircle2 className="w-9 h-9 text-accent animate-pulse" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                تأكيد البريد الإلكتروني ✉️
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[320px] mx-auto">
                أرسلنا رابط تأكيد الحساب للبريد التالي. يرجى تفقده لإتمام عملية التسجيل:
              </p>
              <p className="font-bold text-foreground text-sm tracking-wide" dir="ltr">{emailConfirmation}</p>
            </div>

            <Button
              variant="outline"
              onClick={() => { setEmailConfirmation(null); setIsLogin(true); }}
              className="rounded-xl h-11 px-8 text-xs font-bold"
            >
              العودة لتسجيل الدخول
            </Button>
          </motion.div>
        ) : otpStep ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4 space-y-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex items-center justify-center mx-auto"
              style={{ width: 72, height: 72, borderRadius: "20px", background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.05))" }}
            >
              <KeyRound className="w-9 h-9 text-primary" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                التحقق الثنائي 🔐
              </h2>
              <p className="text-muted-foreground text-sm max-w-[320px] mx-auto">
                أرسلنا رمز تحقق مؤقت مكون من 6 أرقام إلى بريدك الإلكتروني:
              </p>
              <p className="font-bold text-foreground text-sm" dir="ltr">{otpEmail}</p>
            </div>
            
            <div className={`max-w-[280px] mx-auto ${otpShake ? "animate-shake" : ""}`}>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`text-center text-[28px] font-bold tracking-[0.5em] h-[52px] rounded-xl border-2 focus-visible:ring-0 transition-colors duration-300 ${
                  otpShake
                    ? "border-destructive bg-destructive/5 focus-visible:border-destructive text-destructive"
                    : "border-border focus-visible:border-primary/50 text-foreground"
                }`}
                style={{ fontFamily: "monospace" }}
                dir="ltr"
                autoFocus
              />
            </div>

            <div className="space-y-4">
              <div className="transition-all duration-200 hover:scale-[1.015] active:scale-[0.985]">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length < 6}
                  className="w-full h-11 rounded-xl text-xs font-bold text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                  }}
                >
                  {otpLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري التحقق...
                    </span>
                  ) : "تأكيد الرمز ودخول"}
                </Button>
              </div>

              {/* Remember device checkbox */}
              <div className="flex items-center justify-center gap-2">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(v) => setRememberDevice(!!v)}
                  className="border-border rounded"
                />
                <label
                  htmlFor="remember-device"
                  className="text-xs text-muted-foreground font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Monitor className="w-3.5 h-3.5 text-muted-foreground/60" />
                  تذكر هذا الجهاز لمدة 30 يوماً
                </label>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 flex items-center justify-center gap-4">
              {countdown > 0 ? (
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <span>إعادة الإرسال بعد {countdown} ثانية</span>
                </div>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={otpLoading}
                  className="text-xs text-primary hover:text-primary-foreground hover:bg-primary/10 transition-colors font-bold px-3 py-1.5 rounded-lg"
                >
                  إعادة إرسال الرمز ✉️
                </button>
              )}
              <span className="text-muted-foreground/20">|</span>
              <button
                onClick={() => { setOtpStep(false); setOtpCode(""); setOtpEmail(""); setPendingPassword(""); setCountdown(0); setPendingOtp(false); }}
                className="text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-1"
              >
                العودة
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Branding Logo */}
            <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-slate-100/80 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden p-2.5 bg-gradient-to-tr from-primary/10 to-accent/10 border border-primary/20 shadow-md">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
              </div>
              <h1 className="text-lg font-black text-slate-800 mt-2">Tawzeef-X</h1>
              <p className="text-[9px] font-bold tracking-[0.2em] text-primary/60 uppercase">منصة التوظيف الذكية</p>
            </div>

            {/* Back link */}
            <div className="hidden lg:block">
              <a href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-300 font-medium group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span>العودة للرئيسية</span>
              </a>
            </div>

            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login-header" : "signup-header"}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="space-y-1.5 text-right"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary mb-1">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-[10px] font-bold tracking-wide">
                    {isLogin ? "مرحباً بعودتك" : "انضم للمنصة الأذكى"}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                  {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
                </h2>
                <p className="text-muted-foreground text-xs leading-normal">
                  {isLogin ? "أدخل بريدك الإلكتروني وكلمة المرور للوصول لحسابك" : "ابدأ رحلتك في التوظيف الذكي وتتبع المرشحين"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, x: isLogin ? -15 : 15, filter: "blur(2px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: isLogin ? 15 : -15, filter: "blur(2px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {!isLogin && (
                  <div className="space-y-4">
                    {/* Account Type Toggle */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-semibold text-slate-600 tracking-wide block">
                        نوع الحساب
                      </label>
                      <div className="flex bg-muted/40 rounded-xl p-1 border border-border/30 relative h-[42px] select-none">
                        <div
                          className="absolute inset-y-1 rounded-lg bg-card shadow-sm border border-border/40 transition-all duration-300 ease-out"
                          style={{
                            width: "calc(50% - 4px)",
                            right: accountType === "company" ? "4px" : "calc(50% + 2px)",
                            left: accountType === "company" ? "calc(50% + 2px)" : "4px"
                          }}
                        />
                        {[
                          { type: "company" as const, icon: <Building2 className="w-3.5 h-3.5" />, label: "جهة توظيف / HR" },
                          { type: "job_seeker" as const, icon: <User className="w-3.5 h-3.5" />, label: "باحث عن عمل" },
                        ].map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => setAccountType(opt.type)}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                              accountType === opt.type ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.icon}
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-semibold text-slate-600 tracking-wide block">
                        الاسم الكامل
                      </label>
                      <div className="relative">
                        <User className={iconClass("name")} />
                        <Input
                          value={form.fullName}
                          onChange={e => setForm({ ...form, fullName: e.target.value })}
                          onFocus={() => setFocusedField("name")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="أدخل الاسم الثنائي أو الثلاثي"
                          className={inputClass("name")}
                          required
                        />
                      </div>
                    </div>

                    {/* Company Name (only for company accounts) */}
                    {accountType === "company" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-1.5 text-right"
                      >
                        <label className="text-xs font-semibold text-slate-600 tracking-wide block">
                          اسم الشركة / المؤسسة
                        </label>
                        <div className="relative">
                          <Building2 className={iconClass("companyName")} />
                          <Input
                            value={form.companyName}
                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                            onFocus={() => setFocusedField("companyName")}
                            onBlur={() => setFocusedField(null)}
                            placeholder="مثال: شركة الحلول الذكية"
                            className={inputClass("companyName")}
                            required
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide block">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className={iconClass("email")} />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="example@company.com"
                      className={inputClass("email")}
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide block">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className={iconClass("password")} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      className={`${inputClass("password")} pl-11`}
                      dir="ltr"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/35 hover:text-foreground transition-all duration-200 active:scale-90"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {!isLogin && form.password.length > 0 && (() => {
                    const strength = checkPasswordStrength(form.password);
                    return (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 space-y-1"
                      >
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i < strength.score ? strength.color : "hsl(var(--muted))" }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span style={{ color: strength.color }}>{strength.label}</span>
                          {strength.suggestions.length > 0 && (
                            <span className="text-muted-foreground/60">{strength.suggestions[0]}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {isLogin && (
                  <div className="flex justify-end text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-accent font-bold transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                )}

                <div className="pt-2 transition-all duration-200 hover:scale-[1.015] active:scale-[0.985]">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-xs font-bold border-0 text-white shadow-lg hover:shadow-primary/10 transition-all duration-300 relative overflow-hidden group"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  >
                    {/* Shimmer */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                        animation: "shimmer-move 2.2s linear infinite"
                      }}
                    />
                    <span className="relative z-10">
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري المعالجة...
                        </span>
                      ) : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
                    </span>
                  </Button>
                </div>
              </motion.form>
            </AnimatePresence>

            <div className="relative flex items-center justify-center my-4 select-none">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <span className="relative px-3 text-[10px] font-bold text-muted-foreground/50 bg-background/0 uppercase tracking-widest">
                أو المتابعة عبر
              </span>
            </div>

            <SocialButtons />

            <p className="text-center text-xs text-muted-foreground select-none">
              {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-bold hover:text-accent transition-colors underline-offset-4 hover:underline"
              >
                {isLogin ? "أنشئ حساب جديد" : "سجّل دخولك"}
              </button>
            </p>

            <p className="text-center text-[10px] text-muted-foreground/35 leading-relaxed select-none">
              بالمتابعة أنت توافق على{" "}
              <span className="text-muted-foreground/50 underline-offset-2 hover:underline cursor-pointer">شروط الاستخدام</span>
              {" "}و{" "}
              <span className="text-muted-foreground/50 underline-offset-2 hover:underline cursor-pointer">سياسة الخصوصية</span>
            </p>

            {/* Mobile back button */}
            <div className="lg:hidden text-center pt-2">
              <a href="/" className="text-muted-foreground hover:text-foreground text-xs inline-flex items-center gap-1.5 transition-colors font-bold group">
                <span>العودة للرئيسية</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300 rotate-180" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Page ─── */
export default function Auth() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [pendingOtp, setPendingOtp] = useState(false);

  useEffect(() => { setIsLogin(searchParams.get("mode") !== "signup"); }, [searchParams]);

  // Don't redirect while OTP 2FA is in progress
  if (user && !pendingOtp) {
    const accountType = user.user_metadata?.account_type;
    return <Navigate to={accountType === "job_seeker" ? "/seeker-dashboard" : "/dashboard"} replace />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden bg-gradient-to-tr from-emerald-50/30 via-slate-50 to-cyan-50/30 text-slate-800" dir="rtl">
      {/* Styles for sweeping border gradient + off-thread hardware accelerated CSS animations */}
      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sweeping-border-card {
          position: relative;
          border: 1.5px solid transparent;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.98) 100%) padding-box,
                      linear-gradient(135deg, hsl(var(--primary) / 0.35) 0%, hsl(var(--accent) / 0.2) 50%, hsl(var(--primary) / 0.45) 100%) border-box;
          background-size: 200% 200%;
          animation: gradient-sweep 8s ease infinite;
          backdrop-filter: blur(20px);
        }

        /* GPU accelerated background sphere animations */
        @keyframes float-sphere-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(40px, -30px, 0) scale(1.15); }
        }
        @keyframes float-sphere-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.15); }
          50% { transform: translate3d(-35px, 35px, 0) scale(0.95); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg) translate3d(0,0,0); }
          100% { transform: rotate(360deg) translate3d(0,0,0); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg) translate3d(0,0,0); }
          100% { transform: rotate(0deg) translate3d(0,0,0); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate3d(15px, -35px, 0) scale(1.4); opacity: 0.6; }
        }
        @keyframes scan-vertical {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, 310px, 0); }
        }
        @keyframes shimmer-move {
          0% { transform: translate3d(-100%, 0, 0); }
          100% { transform: translate3d(200%, 0, 0); }
        }

        .floating-particle {
          will-change: transform;
          animation: float-particle var(--float-duration, 8s) ease-in-out infinite;
          animation-delay: var(--float-delay, 0s);
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <AuroraBackground />
      </div>
      <div className="relative z-10 min-h-screen min-h-[100dvh] grid lg:grid-cols-[1fr_1.15fr]">
        <BrandingPanel />
        <div className="flex items-center justify-center py-10 sm:py-14 lg:py-0 px-3">
          <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} setPendingOtp={setPendingOtp} />
        </div>
      </div>
    </div>
  );
}
