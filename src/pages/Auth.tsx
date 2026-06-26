import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { useNavigate, useSearchParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, Shield, Zap, BarChart3, FileCheck, Briefcase, Sparkles, Building2, CheckCircle2, KeyRound, Monitor, Send, Check, ChevronLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { lovable } from "@/integrations/lovable/index";
import { translateAuthError } from "@/lib/authErrors";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { checkPasswordStrength, isRateLimited, isValidEmail, sanitizeInput, detectSuspiciousInput } from "@/lib/security";

/* ─── Animated Aurora Background ─── */
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Aurora layer 1 — teal sweep */}
      <motion.div
        className="absolute animate-pulse"
        style={{
          width: "140%", height: "140%", top: "-40%", right: "-30%",
          background: "conic-gradient(from 180deg at 50% 50%, hsl(var(--primary) / 0.14) 0deg, hsl(var(--accent) / 0.08) 120deg, transparent 240deg, hsl(var(--primary) / 0.14) 360deg)",
          filter: "blur(90px)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      />
      {/* Aurora layer 2 — coral bloom */}
      <motion.div
        className="absolute"
        style={{
          width: "120%", height: "120%", bottom: "-30%", left: "-20%",
          background: "conic-gradient(from 0deg at 40% 60%, hsl(var(--accent) / 0.1) 0deg, transparent 120deg, hsl(var(--primary) / 0.09) 240deg, hsl(var(--accent) / 0.1) 360deg)",
          filter: "blur(110px)",
        }}
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      />
      {/* Aurora layer 3 — center glow */}
      <motion.div
        className="absolute"
        style={{
          width: "80%", height: "80%", top: "10%", left: "10%",
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.09) 0%, hsl(var(--accent) / 0.04) 50%, transparent 80%)",
          filter: "blur(70px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + (i % 4),
            height: 2 + (i % 4),
            left: `${10 + i * 5.5}%`,
            top: `${15 + (i * 11) % 70}%`,
            background: i % 3 === 0
              ? "hsl(var(--primary) / 0.4)"
              : i % 3 === 1
              ? "hsl(var(--accent) / 0.3)"
              : "hsl(181 70% 45% / 0.3)",
          }}
          animate={{
            y: [0, -45 - i * 3, 0],
            x: [0, (i % 2 === 0 ? 20 : -20), 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 2, 1],
          }}
          transition={{ duration: 7 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
    </div>
  );
}

/* ─── Live AI Recruiting Command Center Mockup ─── */
function AICommandCenterWidget() {
  const [parseProgress, setParseProgress] = useState(0);
  const [chatState, setChatState] = useState<"parsing" | "analyzed" | "hired" | "reset">("parsing");
  const [pipelineStage, setPipelineStage] = useState<"applied" | "shortlisted">("applied");
  const [typedMessage, setTypedMessage] = useState("");

  const targetMessage = "تم تحليل سيرة أحمد محمد الذاتية. المطابقة: 96% لدور مهندس برمجيات. نوصي بالمقابلة ✨";

  // Control typing animation
  useEffect(() => {
    if (chatState === "analyzed") {
      let index = 0;
      setTypedMessage("");
      const timer = setInterval(() => {
        setTypedMessage((prev) => prev + targetMessage.charAt(index));
        index++;
        if (index >= targetMessage.length) {
          clearInterval(timer);
          // Transition pipeline card to shortlisted after typing completes
          setTimeout(() => {
            setPipelineStage("shortlisted");
            setChatState("hired");
          }, 800);
        }
      }, 35);
      return () => clearInterval(timer);
    }
  }, [chatState]);

  // Main Loop Controller
  useEffect(() => {
    let cycleInterval: ReturnType<typeof setInterval>;
    let progressInterval: ReturnType<typeof setInterval>;

    const startCycle = () => {
      setChatState("parsing");
      setPipelineStage("applied");
      setParseProgress(0);
      setTypedMessage("");

      // Animate progress bar (Resume Parser)
      progressInterval = setInterval(() => {
        setParseProgress((p) => {
          if (p >= 100) {
            clearInterval(progressInterval);
            setChatState("analyzed"); // Trigger typing assistant
            return 100;
          }
          return p + 4;
        });
      }, 50);
    };

    startCycle();

    // 10s loop cycle
    cycleInterval = setInterval(() => {
      setChatState("reset");
      setTimeout(startCycle, 600);
    }, 11000);

    return () => {
      clearInterval(cycleInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      className="w-full max-w-[420px] mx-auto rounded-3xl bg-white/[0.01] border border-white/[0.06] backdrop-blur-2xl p-6 shadow-[0_30px_80px_-15px_rgba(16,185,129,0.15)] relative overflow-hidden select-none"
      style={{ transformStyle: "preserve-3d" }}
      whileHover={{
        rotateY: -3,
        rotateX: 3,
        scale: 1.015,
        borderColor: "rgba(16, 185, 129, 0.22)",
        boxShadow: "0 35px 90px -15px rgba(16, 185, 129, 0.2)"
      }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      {/* Dynamic scanline overlay for parsing step */}
      {chatState === "parsing" && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-20 pointer-events-none shadow-[0_0_12px_2px_rgba(34,211,238,0.4)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Grid pattern background inside widget */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)",
        backgroundSize: "100% 10px"
      }} />

      {/* Synchronized dashboard elements */}
      <div className="space-y-5 relative z-10">
        
        {/* Row 1: Header + Active Parser Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white/35 uppercase tracking-wider">سجل العمليات الحية</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>مستشعر معالج الملفات</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-white/80">cv_ahmed_software.pdf</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">{parseProgress}%</span>
            </div>
            
            {/* Progress bar wrapper */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${parseProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: AI Co-Pilot chat interaction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white/35 uppercase tracking-wider">مساعد المطابقة بالذكاء الاصطناعي</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden min-h-[76px] flex flex-col justify-center">
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-bold text-emerald-400/70">Tawzeef-X Co-Pilot</p>
                <p className="text-xs text-white/80 font-medium leading-relaxed">
                  {chatState === "parsing" ? (
                    <span className="inline-flex items-center gap-1 text-white/40">
                      <Loader2 className="w-3 h-3 animate-spin text-white/40" />
                      جاري استخراج وتصنيف المهارات البرمجية...
                    </span>
                  ) : (
                    typedMessage
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Pipeline Kanban shifting card */}
        <div className="space-y-2">
          <span className="text-[10px] font-black text-white/35 uppercase tracking-wider">مراحل التوظيف الذكية</span>
          <div className="grid grid-cols-2 gap-4 h-[76px]">
            
            {/* Column A: Applied */}
            <div className="rounded-2xl border border-white/[0.02] bg-white/[0.005] p-2 flex flex-col gap-1.5 relative justify-center">
              <span className="text-[8px] font-bold text-white/30 block mb-1 text-right">متقدمون (1)</span>
              
              <AnimatePresence>
                {pipelineStage === "applied" && (
                  <motion.div
                    layoutId="pipelineCard"
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[8px] text-white/70">أ</div>
                      <span className="text-[9px] font-bold text-white/80 truncate">أحمد محمد</span>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Column B: Shortlisted */}
            <div className="rounded-2xl border border-white/[0.03] bg-emerald-500/[0.01] p-2 flex flex-col gap-1.5 relative justify-center">
              <span className="text-[8px] font-bold text-emerald-400/40 block mb-1 text-right">مرشحون للمقابلة</span>
              
              <AnimatePresence>
                {pipelineStage === "shortlisted" && (
                  <motion.div
                    layoutId="pipelineCard"
                    className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between shadow-lg shadow-emerald-950/20"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-black">أ</div>
                      <span className="text-[9px] font-bold text-white/95 truncate">أحمد محمد</span>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-1 rounded text-[7px] font-black">96%</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>

      {/* Floating absolute stats capsule */}
      <motion.div
        className="absolute top-1/2 -right-4 translate-y-[-100%] rounded-2xl bg-gradient-to-tr from-[#0d122b] to-[#1e295d]/80 border border-white/[0.08] backdrop-blur-2xl p-3 shadow-2xl pointer-events-none z-30"
        style={{ scale: 0.85 }}
        animate={chatState === "hired" ? { scale: 0.9, x: -10, y: -20 } : { scale: 0.82, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 block">سرعة التصفية</span>
            <span className="text-xs font-black text-white leading-none">3X أسرع</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Right branding panel ─── */
function BrandingPanel() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, [0, 1], ["-20%", "120%"]);
  const glowY = useTransform(mouseY, [0, 1], ["-20%", "120%"]);

  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full relative overflow-hidden p-14 select-none"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
      }}
    >
      {/* Deep Obsidian background */}
      <div className="absolute inset-0 bg-[#050711]" style={{
        background: "radial-gradient(circle at 100% 0%, #0c0f24 0%, #050711 70%)"
      }} />

      {/* Ambient neon light glow shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.16] mix-blend-screen filter blur-[110px]"
          style={{
            background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
            top: "-10%",
            right: "-10%",
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.1] mix-blend-screen filter blur-[95px]"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            bottom: "10%",
            left: "-10%",
          }}
          animate={{
            scale: [1.25, 0.95, 1.25],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Background Starry Particles */}
      <div className="absolute inset-0 opacity-[0.18] pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [1, 1.6, 1] }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 4 }}
          />
        ))}
      </div>

      {/* Grid mesh pattern */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Mouse follow light */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full pointer-events-none opacity-[0.24]"
        style={{
          left: glowX,
          top: glowY,
          background: "radial-gradient(circle, #10b981 0%, transparent 60%)",
          filter: "blur(60px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Header Info */}
      <div className="relative z-10 px-6 pt-4 space-y-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <motion.div
            className="w-13 h-13 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl relative overflow-hidden group p-2 shadow-lg"
            whileHover={{ scale: 1.05, rotate: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain relative z-10" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wide leading-tight text-white/95">Tawzeef-X</span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400/50 uppercase">منصة التوظيف الذكية</span>
          </div>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl"
            whileHover={{ scale: 1.02, borderColor: "rgba(16, 185, 129, 0.25)" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white/80">منصة التوظيف الذكية #1</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </motion.div>

          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
            وظّف الأفضل <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              بذكاء وسرعة فائقة
            </span>
          </h1>

          <p className="text-sm leading-relaxed text-white/50 max-w-[400px]">
            أتمتة كامل رحلة التوظيف بالذكاء الاصطناعي — من صياغة ونشر الوظيفة والبحث عن المرشحين والمطابقة الذكية، وحتى المقابلات وإرسال العروض.
          </p>
        </motion.div>
      </div>

      {/* Synced AI Pipeline monitor mockup */}
      <div className="relative z-10 my-4 flex items-center justify-center">
        <AICommandCenterWidget />
      </div>

      {/* Bottom Stats Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="relative z-10 p-5 rounded-2xl border border-white/[0.05] bg-white/[0.01] backdrop-blur-2xl shadow-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 opacity-50" />
        <div className="flex items-center justify-between relative z-10 px-4">
          {[
            { val: "AI", label: "تقييم ذكي" },
            { val: "24/7", label: "دعم متواصل" },
            { val: "98%", label: "رضا العملاء" },
            { val: "3X", label: "أسرع توظيفاً" },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="text-center"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-2xl xl:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 leading-none block">
                {s.val}
              </span>
              <span className="text-[9px] font-bold text-white/40 block mt-1">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Social Buttons ─── */
function SocialButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoadingProvider(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex gap-3">
      <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }} className="flex-1">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-11 rounded-xl text-xs font-bold gap-2.5 bg-card/60 border border-border hover:bg-muted/40 hover:border-primary/20 transition-all duration-300"
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
      </motion.div>

      <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }} className="flex-1">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-11 rounded-xl text-xs font-bold gap-2.5 bg-foreground text-background border border-foreground hover:bg-foreground/90 transition-all duration-300"
          onClick={() => handleOAuth("apple")}
        >
          {loadingProvider === "apple" ? (
            <Loader2 className="w-4 h-4 animate-spin text-background" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          Apple
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Auth form ─── */
function AuthForm({ isLogin, setIsLogin, setPendingOtp }: { isLogin: boolean; setIsLogin: (v: boolean) => void; setPendingOtp: (v: boolean) => void }) {
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

      // Client-side validations
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

      // Rate limiting: max 5 attempts per 5 minutes
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
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: form.password });
        if (error) { setPendingOtp(false); logAuditEvent({ eventType: "login.failed", userEmail: normalizedEmail, details: { reason: error.message } }); throw error; }

        if (isTrustedDevice(normalizedEmail)) {
          setPendingPassword("");
          setPendingOtp(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
          toast({ title: "تم تسجيل الدخول ✅", description: "جهاز موثوق — تم تخطي التحقق" });
          logAuditEvent({ eventType: "login.success", userId: loginData.user?.id, userEmail: normalizedEmail, details: { method: "trusted_device" } });
          const accountType = loginData.session?.user?.user_metadata?.account_type;
          navigate(accountType === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
          return;
        }

        // Try sending OTP first; if SMTP is not configured, bypass and login directly
        try {
          await requestLoginOtp(normalizedEmail);
          
          // OTP succeeded, sign out to enforce verification
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
          // Send welcome email via Gmail SMTP (fire-and-forget)
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
        ? "bg-card border-primary/50 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]"
        : "bg-muted/15 border-transparent hover:border-border/30"
    } text-foreground placeholder:text-muted-foreground/35`;

  const iconClass = (field: string) =>
    `absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
      focused(field) ? "text-primary scale-110" : "text-muted-foreground/45"
    }`;

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 select-none">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden p-2.5 bg-gradient-to-tr from-primary/10 to-accent/10 border border-primary/15"
            whileTap={{ scale: 0.95 }}
          >
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          </motion.div>
          <div>
            <h1 className="text-xl font-black text-foreground">Tawzeef-X</h1>
            <p className="text-[10px] font-bold tracking-[0.25em] text-primary/60 uppercase">منصة التوظيف الذكية</p>
          </div>
        </motion.div>
      </div>

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
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
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
              </motion.div>

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
                <motion.button
                  onClick={handleResendOtp}
                  disabled={otpLoading}
                  className="text-xs text-primary hover:text-primary-foreground hover:bg-primary/10 transition-colors font-bold px-3 py-1.5 rounded-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  إعادة إرسال الرمز ✉️
                </motion.button>
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
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
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
                      <label className="text-[10px] font-bold text-muted-foreground tracking-wide block uppercase">
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
                      <label className="text-[10px] font-bold text-muted-foreground tracking-wide block uppercase">
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
                        <label className="text-[10px] font-bold text-muted-foreground tracking-wide block uppercase">
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
                  <label className="text-[10px] font-bold text-muted-foreground tracking-wide block uppercase">
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
                  <label className="text-[10px] font-bold text-muted-foreground tracking-wide block uppercase">
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
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/35 hover:text-foreground transition-all duration-200"
                      whileTap={{ scale: 0.85 }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </motion.button>
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

                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-xs font-bold border-0 text-white shadow-lg hover:shadow-primary/10 transition-all duration-300 relative overflow-hidden group"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  >
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)" }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
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
                </motion.div>
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
          </motion.div>
        )}
      </div>
    </div>
  );
}

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
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden" dir="rtl">
      {/* Styles for sweeping border gradient */}
      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sweeping-border-card {
          position: relative;
          border: 1.5px solid transparent;
          background: linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--card)) 100%) padding-box,
                      linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.1) 40%, hsl(var(--primary) / 0.4) 100%) border-box;
          background-size: 200% 200%;
          animation: gradient-sweep 6s ease infinite;
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
