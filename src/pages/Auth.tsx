import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { useNavigate, useSearchParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, Shield, Zap, BarChart3, FileCheck, Briefcase, Sparkles, Building2, CheckCircle2, KeyRound, Monitor  } from "lucide-react";
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
    <div className="absolute inset-0 overflow-hidden">
      {/* Aurora layer 1 — teal sweep */}
      <motion.div
        className="absolute"
        style={{
          width: "140%", height: "140%", top: "-40%", right: "-30%",
          background: "conic-gradient(from 180deg at 50% 50%, hsl(var(--primary) / 0.12) 0deg, hsl(var(--accent) / 0.06) 120deg, transparent 240deg, hsl(var(--primary) / 0.12) 360deg)",
          filter: "blur(80px)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      {/* Aurora layer 2 — coral bloom */}
      <motion.div
        className="absolute"
        style={{
          width: "120%", height: "120%", bottom: "-30%", left: "-20%",
          background: "conic-gradient(from 0deg at 40% 60%, hsl(var(--accent) / 0.08) 0deg, transparent 120deg, hsl(var(--primary) / 0.07) 240deg, hsl(var(--accent) / 0.08) 360deg)",
          filter: "blur(100px)",
        }}
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      />
      {/* Aurora layer 3 — teal-coral center glow */}
      <motion.div
        className="absolute"
        style={{
          width: "80%", height: "80%", top: "10%", left: "10%",
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.07) 0%, hsl(var(--accent) / 0.03) 50%, transparent 80%)",
          filter: "blur(60px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating particles — teal & coral */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + (i % 4),
            height: 2 + (i % 4),
            left: `${8 + i * 9}%`,
            top: `${12 + (i * 13) % 75}%`,
            background: i % 3 === 0
              ? "hsl(var(--primary) / 0.30)"
              : i % 3 === 1
              ? "hsl(var(--accent) / 0.22)"
              : "hsl(181 70% 45% / 0.20)",
          }}
          animate={{
            y: [0, -30 - i * 3, 0],
            x: [0, (i % 2 === 0 ? 12 : -12), 0],
            opacity: [0.15, 0.55, 0.15],
            scale: [1, 1.6, 1],
          }}
          transition={{ duration: 5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
        />
      ))}
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      {/* Horizon glow — teal bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{
        background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--primary) / 0.03) 50%, transparent 100%)",
      }} />
    </div>
  );
}

/* ─── Left branding panel ─── */
function BrandingPanel() {
  const features = [
    { icon: <Zap className="w-5 h-5" />, title: "تقييم ذكي", desc: "تحليل المرشحين بالذكاء الاصطناعي" },
    { icon: <BarChart3 className="w-5 h-5" />, title: "تقارير لحظية", desc: "لوحة تحكم تحليلية متقدمة" },
    { icon: <Shield className="w-5 h-5" />, title: "أمان متقدم", desc: "تشفير وحماية بيانات كاملة" },
    { icon: <FileCheck className="w-5 h-5" />, title: "عروض رقمية", desc: "إصدار وتوقيع عروض إلكترونياً" },
  ];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, [0, 1], ["-20%", "120%"]);
  const glowY = useTransform(mouseY, [0, 1], ["-20%", "120%"]);

  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full relative overflow-hidden"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
      }}
    >
      {/* Deep gradient background */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, hsl(222 75% 18%) 0%, hsl(222 65% 12%) 40%, hsl(230 50% 6%) 100%)"
      }} />

      {/* Mouse-following glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          left: glowX, top: glowY,
          background: "radial-gradient(circle, hsl(222 70% 50% / 0.12), transparent 60%)",
          filter: "blur(60px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Static glows */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(222 70% 50% / 0.12), transparent 65%)", filter: "blur(80px)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(174 60% 45% / 0.08), transparent 60%)", filter: "blur(60px)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Animated rings */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute rounded-full border"
          style={{ width: 550, height: 550, top: "-12%", right: "-18%", borderColor: "hsl(0 0% 100% / 0.03)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute rounded-full border"
          style={{ width: 380, height: 380, bottom: "-8%", left: "-14%", borderColor: "hsl(0 0% 100% / 0.02)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "radial-gradient(circle, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-12 xl:px-16 pt-14">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4 mb-20"
        >
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border overflow-hidden p-2"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 100% / 0.15), hsl(0 0% 100% / 0.05))",
              borderColor: "hsl(0 0% 100% / 0.12)",
              backdropFilter: "blur(16px)",
            }}
            whileHover={{ scale: 1.1, borderColor: "hsl(174 60% 55% / 0.4)", rotate: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" style={{ filter: "drop-shadow(0 0 6px hsl(0 0% 100% / 0.3))" }} />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[22px] font-black tracking-wide leading-tight" style={{ color: "hsl(0 0% 100% / 0.95)", fontFamily: "'Cairo', sans-serif" }}>Tawzeef-X</span>
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "hsl(174 60% 55% / 0.5)" }}>منصة التوظيف</span>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.07)" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(174 60% 55%)" }} />
            </motion.div>
            <span className="text-[12px] font-bold tracking-wide" style={{ color: "hsl(0 0% 100% / 0.5)", fontFamily: "'Cairo', sans-serif" }}>
              منصة التوظيف الذكية #1
            </span>
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(152 56% 50%)" }}
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          <div className="overflow-hidden">
            <motion.h1
              className="text-[46px] xl:text-[56px] font-black leading-[1.05]"
              style={{ fontFamily: "'Cairo', sans-serif", color: "hsl(0 0% 100% / 0.95)" }}
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              وظّف الأفضل
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.div
              className="text-[46px] xl:text-[56px] font-black leading-[1.05] mt-1"
              style={{
                background: "linear-gradient(135deg, hsl(174 60% 55%), hsl(222 70% 70%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "'Cairo', sans-serif",
              }}
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              بذكاء وسرعة
            </motion.div>
          </div>

          <motion.p
            className="text-[15px] leading-[1.9] max-w-[380px] mb-12 mt-6"
            style={{ color: "hsl(0 0% 100% / 0.35)", fontFamily: "'Cairo', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            منصة متكاملة تعتمد على الذكاء الاصطناعي لأتمتة كامل رحلة التوظيف — من نشر الإعلان حتى توقيع العرض
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3.5 max-w-[420px]">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
              className="group p-4 rounded-2xl cursor-default relative overflow-hidden"
              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.05)" }}
              whileHover={{
                y: -5, scale: 1.04,
                backgroundColor: "hsla(0, 0%, 100%, 0.07)",
                borderColor: "hsla(174, 60%, 55%, 0.2)",
                boxShadow: "0 12px 40px -10px hsla(174, 60%, 55%, 0.12)",
                transition: { duration: 0.25 },
              }}
            >
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(174 60% 55%)" }}
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                {f.icon}
              </motion.div>
              <p className="text-[14px] font-bold mb-0.5" style={{ color: "hsl(0 0% 100% / 0.85)", fontFamily: "'Cairo', sans-serif" }}>
                {f.title}
              </p>
              <p className="text-[12px] font-medium leading-relaxed" style={{ color: "hsl(0 0% 100% / 0.25)", fontFamily: "'Cairo', sans-serif" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative z-10 mx-12 xl:mx-16 mb-12 p-5 rounded-2xl"
        style={{
          background: "hsl(0 0% 100% / 0.03)",
          border: "1px solid hsl(0 0% 100% / 0.05)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between">
          {[
            { val: "AI", label: "تقييم ذكي" },
            { val: "24/7", label: "دعم متواصل" },
            { val: "98%", label: "رضا العملاء" },
            { val: "3X", label: "أسرع توظيفاً" },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="text-center"
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-[24px] xl:text-[28px] font-black leading-tight" style={{
                fontFamily: "'Cairo', sans-serif",
                background: "linear-gradient(180deg, hsl(0 0% 100% / 0.95), hsl(0 0% 100% / 0.55))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {s.val}
              </p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "hsl(0 0% 100% / 0.25)", fontFamily: "'Cairo', sans-serif" }}>
                {s.label}
              </p>
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
      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} className="flex-1">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-[50px] rounded-xl text-[13px] font-bold gap-2.5 bg-card border-2 border-border/70 text-foreground hover:bg-muted/50 hover:border-primary/25 hover:shadow-lg transition-all duration-300"
          style={{ fontFamily: "'Cairo', sans-serif" }}
          onClick={() => handleOAuth("google")}
        >
          {loadingProvider === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} className="flex-1">
        <Button
          type="button"
          variant="outline"
          disabled={!!loadingProvider}
          className="w-full h-[50px] rounded-xl text-[13px] font-bold gap-2.5 bg-foreground text-background border-2 border-foreground hover:bg-foreground/90 hover:shadow-lg transition-all duration-300"
          style={{ fontFamily: "'Cairo', sans-serif" }}
          onClick={() => handleOAuth("apple")}
        >
          {loadingProvider === "apple" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="currentColor">
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
  }, [countdown > 0 ? 1 : 0]);

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
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#2563eb", "#14b8a6", "#f59e0b"] });
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
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#2563eb", "#14b8a6", "#f59e0b"] });
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

          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"] });
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
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#2563eb", "#14b8a6", "#f59e0b"] });
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
      // No auth needed - just call the function directly
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
        ? "bg-card border-primary/50 shadow-[0_0_0_4px_hsl(var(--primary)/0.06)]"
        : "bg-muted/25 border-transparent hover:border-border/50"
    } text-foreground placeholder:text-muted-foreground/40`;

  const iconClass = (field: string) =>
    `absolute right-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] transition-all duration-300 ${
      focused(field) ? "text-primary scale-110" : "text-muted-foreground/35"
    }`;

  return (
    <div className="w-full max-w-[420px] mx-auto px-5 sm:px-6 lg:px-8">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden p-2"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.03))",
              border: "2px solid hsl(var(--primary) / 0.12)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          </motion.div>
          <div>
            <h1 className="text-[20px] font-black text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>Tawzeef-X</h1>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-primary/50">منصة التوظيف</p>
          </div>
        </motion.div>
      </div>

      {emailConfirmation ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 18, delay: 0.1 }}
            className="flex items-center justify-center mx-auto mb-6"
            style={{ width: 80, height: 80, borderRadius: "24px", background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--primary) / 0.08))" }}
          >
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </motion.div>
          <h2 className="text-[26px] font-black text-foreground mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            تحقق من بريدك الإلكتروني ✉️
          </h2>
          <p className="text-muted-foreground text-[15px] font-medium mb-2 max-w-[340px] mx-auto leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
            أرسلنا رابط تأكيد إلى
          </p>
          <p className="font-bold text-foreground text-[15px] mb-6" dir="ltr">{emailConfirmation}</p>
          <p className="text-muted-foreground text-[13px] font-medium mb-6 max-w-[300px] mx-auto" style={{ fontFamily: "'Cairo', sans-serif" }}>
            اضغط على الرابط في البريد لتفعيل حسابك، ثم سجّل دخولك
          </p>
          <Button
            variant="outline"
            onClick={() => { setEmailConfirmation(null); setIsLogin(true); }}
            className="rounded-xl h-[48px] px-8 text-[14px] font-semibold"
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            العودة لتسجيل الدخول
          </Button>
        </motion.div>
      ) : otpStep ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 18, delay: 0.1 }}
            className="flex items-center justify-center mx-auto mb-6"
            style={{ width: 80, height: 80, borderRadius: "24px", background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))" }}
          >
            <KeyRound className="w-10 h-10 text-primary" />
          </motion.div>
          <h2 className="text-[26px] font-black text-foreground mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            التحقق بخطوتين 🔐
          </h2>
          <p className="text-muted-foreground text-[15px] font-medium mb-2 max-w-[340px] mx-auto leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
            أرسلنا رمز تحقق إلى
          </p>
          <p className="font-bold text-foreground text-[15px] mb-6" dir="ltr">{otpEmail}</p>
          
          <div className={`max-w-[280px] mx-auto mb-6 ${otpShake ? "animate-shake" : ""}`}>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={`text-center text-[28px] font-bold tracking-[0.5em] h-[56px] rounded-xl border-2 focus-visible:ring-0 transition-colors duration-300 ${
                otpShake
                  ? "border-destructive bg-destructive/5 focus-visible:border-destructive"
                  : "border-border/70 focus-visible:border-primary/50"
              }`}
              style={{ fontFamily: "monospace" }}
              dir="ltr"
              autoFocus
            />
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpCode.length < 6}
              className="w-full max-w-[280px] h-[50px] rounded-xl text-[15px] font-bold text-primary-foreground"
              style={{
                fontFamily: "'Cairo', sans-serif",
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(222 55% 56%))",
                boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.35)",
              }}
            >
              {otpLoading ? (
                <span className="inline-flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </span>
              ) : "تأكيد الرمز"}
            </Button>
          </motion.div>

          {/* Remember device checkbox */}
          <div className="flex items-center justify-center gap-2.5 mt-4 max-w-[280px] mx-auto">
            <Checkbox
              id="remember-device"
              checked={rememberDevice}
              onCheckedChange={(v) => setRememberDevice(!!v)}
              className="border-border/70"
            />
            <label
              htmlFor="remember-device"
              className="text-[12px] text-muted-foreground font-medium cursor-pointer flex items-center gap-1.5"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <Monitor className="w-3.5 h-3.5" />
              تذكر هذا الجهاز لمدة 30 يوماً
            </label>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5">
            {countdown > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative w-14 h-14">
                  {/* Background circle */}
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" strokeWidth="3" className="stroke-muted/20" />
                    <motion.circle
                      cx="28" cy="28" r="24" fill="none" strokeWidth="3"
                      strokeLinecap="round"
                      className="stroke-primary"
                      style={{
                        strokeDasharray: 2 * Math.PI * 24,
                        strokeDashoffset: 2 * Math.PI * 24 * (1 - countdown / 60),
                        filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.4))",
                      }}
                    />
                  </svg>
                  {/* Timer text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[15px] font-black text-foreground tabular-nums" style={{ fontFamily: "'Cairo', sans-serif" }}>
                      {countdown}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground/50 font-medium" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  إعادة الإرسال
                </span>
              </motion.div>
            ) : (
              <motion.button
                onClick={handleResendOtp}
                disabled={otpLoading}
                className="text-[13px] text-primary/70 hover:text-primary transition-colors font-semibold px-4 py-2 rounded-lg hover:bg-primary/5"
                style={{ fontFamily: "'Cairo', sans-serif" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                إعادة إرسال الرمز ✉️
              </motion.button>
            )}
            <span className="text-muted-foreground/20">|</span>
            <button
              onClick={() => { setOtpStep(false); setOtpCode(""); setOtpEmail(""); setPendingPassword(""); setCountdown(0); setPendingOtp(false); }}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-semibold"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              العودة
            </button>
          </div>
        </motion.div>
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden lg:block mb-10"
        >
          <a href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium group" style={{ fontFamily: "'Cairo', sans-serif" }}>
            <motion.div whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 300 }}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </motion.div>
            العودة للرئيسية
          </a>
        </motion.div>

        {/* Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login-header" : "signup-header"}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
              style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.1)" }}
              whileHover={{ scale: 1.03 }}
            >
              <Briefcase className="w-3.5 h-3.5 text-primary/60" />
              <span className="text-[12px] font-bold text-primary/70 tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {isLogin ? "مرحباً بعودتك" : "انضم إلينا"}
              </span>
            </motion.div>
            <h2 className="text-[28px] sm:text-[32px] font-black text-foreground mb-2 leading-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </h2>
            <p className="text-muted-foreground text-[14px] font-medium leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {isLogin ? "أدخل بياناتك للوصول إلى لوحة التحكم" : "ابدأ رحلتك مع التوظيف الذكي"}
            </p>
          </motion.div>
        </AnimatePresence>




        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, x: isLogin ? -24 : 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: isLogin ? 24 : -24, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="space-y-3.5"
          >
            {!isLogin && (
              <>
                {/* Account Type Toggle */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="text-[11px] font-bold text-foreground/50 mb-2 block tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
                    نوع الحساب
                  </label>
                  <div className="flex bg-muted/30 rounded-xl p-1 border border-border/30 gap-1">
                    {[
                      { type: "company" as const, icon: <Building2 className="w-3.5 h-3.5" />, label: "شركة / HR" },
                      { type: "job_seeker" as const, icon: <User className="w-3.5 h-3.5" />, label: "باحث عن عمل" },
                    ].map((opt) => (
                      <motion.button
                        key={opt.type}
                        type="button"
                        onClick={() => setAccountType(opt.type)}
                        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          accountType === opt.type ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                        }`}
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {opt.icon}
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Full Name */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="text-[11px] font-bold text-foreground/50 mb-1.5 block tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <User className={iconClass("name")} />
                    <Input
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="أدخل اسمك الكامل"
                      className={inputClass("name")}
                      style={{ fontFamily: "'Cairo', sans-serif" }}
                      required
                    />
                  </div>
                </motion.div>

                {/* Company Name (only for company accounts) */}
                {accountType === "company" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-[11px] font-bold text-foreground/50 mb-1.5 block tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
                      اسم الشركة / المؤسسة
                    </label>
                    <div className="relative">
                      <Building2 className={iconClass("companyName")} />
                      <Input
                        value={form.companyName}
                        onChange={e => setForm({ ...form, companyName: e.target.value })}
                        onFocus={() => setFocusedField("companyName")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="مثال: شركة التقنية المتقدمة"
                        className={inputClass("companyName")}
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-foreground/50 mb-1.5 block tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
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
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground/50 mb-1.5 block tracking-wide" style={{ fontFamily: "'Cairo', sans-serif" }}>
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
                  style={{ fontFamily: "'Cairo', sans-serif" }}
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
                  {showPassword ? <EyeOff className="w-[16px] h-[16px]" /> : <Eye className="w-[16px] h-[16px]" />}
                </motion.button>
              </div>
              {/* Password Strength Meter - signup only */}
              {!isLogin && form.password.length > 0 && (() => {
                const strength = checkPasswordStrength(form.password);
                return (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 space-y-1.5"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: i < strength.score ? strength.color : "hsl(var(--muted))",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: strength.color, fontFamily: "'Cairo', sans-serif" }}>
                        {strength.label}
                      </span>
                      {strength.suggestions.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/50" style={{ fontFamily: "'Cairo', sans-serif" }}>
                          {strength.suggestions[0]}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            {isLogin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-primary/70 hover:text-primary transition-colors font-semibold"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  نسيت كلمة المرور؟
                </Link>
              </motion.div>
            )}

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-xl text-[15px] font-bold border-0 transition-all duration-300 text-primary-foreground relative overflow-hidden group"
                style={{
                  fontFamily: "'Cairo', sans-serif",
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(222 55% 56%))",
                  boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.35)",
                }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.1) 50%, transparent 100%)" }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10">
                  {loading ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
                </span>
              </Button>
            </motion.div>
          </motion.form>
        </AnimatePresence>

        {/* Toggle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[13px] text-muted-foreground mt-6"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
          <motion.button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-bold hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            whileTap={{ scale: 0.95 }}
          >
            {isLogin ? "أنشئ حساب جديد" : "سجّل دخولك"}
          </motion.button>
        </motion.p>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[10px] text-muted-foreground/35 mt-4 leading-relaxed"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          بالمتابعة أنت توافق على{" "}
          <span className="text-muted-foreground/50 underline-offset-2 hover:underline cursor-pointer">شروط الاستخدام</span>
          {" "}و{" "}
          <span className="text-muted-foreground/50 underline-offset-2 hover:underline cursor-pointer">سياسة الخصوصية</span>
        </motion.p>

        {/* Mobile back */}
        <motion.div
          className="lg:hidden text-center mt-6 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a href="/" className="text-muted-foreground hover:text-primary text-[13px] inline-flex items-center gap-1.5 transition-colors font-semibold" style={{ fontFamily: "'Cairo', sans-serif" }}>
            العودة للرئيسية
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </a>
        </motion.div>
      </motion.div>
      )}
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
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <AuroraBackground />
      </div>
      <div className="relative z-10 min-h-screen min-h-[100dvh] grid lg:grid-cols-[1fr_1.15fr]">
        <BrandingPanel />
        <div className="flex items-center justify-center py-8 sm:py-12 lg:py-0 px-2">
          <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} setPendingOtp={setPendingOtp} />
        </div>
      </div>
    </div>
  );
}
