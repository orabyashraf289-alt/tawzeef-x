import { useState, memo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail, Lock, User, Building, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Sparkles, CheckCircle2, Shield, AlertTriangle, RefreshCw, KeyRound, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import confetti from "canvas-confetti";
import { sanitizeInput, detectSuspiciousInput, isValidEmail, translateAuthError, checkPasswordStrength, isRateLimited, logAuditEvent } from "@/lib/security";

/* ─── Device Trust Helper ─── */
function isDeviceTrusted(email: string): boolean {
  try {
    const trusted = localStorage.getItem(`trusted_device_${email}`);
    if (!trusted) return false;
    const expiry = parseInt(trusted, 10);
    return !isNaN(expiry) && Date.now() < expiry;
  } catch {
    return false;
  }
}

function trustDevice(email: string) {
  try {
    // Trust device for 30 days
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(`trusted_device_${email}`, expiry.toString());
  } catch {
    // Ignore localStorage errors
  }
}

/* ─── Animated Background ─── */
const BackgroundDecoration = memo(function BackgroundDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[130px]" />
    </div>
  );
});

/* ─── Social Buttons ─── */
const SocialButtons = memo(function SocialButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple" | "azure") => {
    setLoadingProvider(provider);
    try {
      // 1. Try Supabase Native OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === "azure" ? "azure" : (provider as any),
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        // Fallback to Lovable Gateway OAuth
        const { error: lovableErr } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
        if (lovableErr) throw lovableErr;
      }
    } catch (err: any) {
      toast({
        title: `خطأ في تسجيل الدخول عبر ${provider === "google" ? "Google" : provider === "azure" ? "Microsoft" : "Apple"}`,
        description: err.message || "يرجى التأكد من إعدادات المفتاح وتفعيل المورد في منصة التحقق",
        variant: "destructive",
      });
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
  const [otpMode, setOtpMode] = useState(false);
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
    // Try Edge Function OTP request or Supabase Native OTP
    try {
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
      if (!res.ok || data?.error) {
        // Fallback to Native Supabase OTP
        const { error: supaErr } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
        });
        if (supaErr) throw supaErr;
      }
    } catch (err: any) {
      const { error: supaErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
      });
      if (supaErr) throw new Error(supaErr.message || "فشل إرسال رمز التحقق OTP");
    }
  }, []);

  const triggerOtpRequest = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast({ title: "خطأ", description: "يرجى إدخال بريد إلكتروني صحيح أولاً", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await requestLoginOtp(normalizedEmail);
      setOtpEmail(normalizedEmail);
      setOtpStep(true);
      setPendingOtp(true);
      setCountdown(60);
      toast({ title: "تم إرسال رمز التحقق (OTP) 📱", description: "يرجى كتابة الرمز المكون من 6 أرقام للتحقق" });
    } catch (err: any) {
      toast({ title: "خطأ في إرسال الرمز", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
        if (otpMode) {
          await triggerOtpRequest();
          return;
        }

        setPendingOtp(true);
        setPendingPassword(form.password);
        let { data: loginData, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: form.password });

        // Smart Candidate Phone Password Fallback
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

        setPendingPassword("");
        setPendingOtp(false);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
        toast({ title: "تم تسجيل الدخول بنجاح ✅", description: userRole === "candidate" ? "مرحباً بك في بوابة المتقدمين" : "مرحباً بك في منصة Tawzeef-X" });
        logAuditEvent({ eventType: "login.success", userId: loginData.user?.id, userEmail: normalizedEmail, details: { method: "direct_login_instant" } });
        navigate(userRole === "candidate" ? "/portal" : userRole === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
        return;
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
          toast({ title: "مرحباً بك! 🎉", description: "تم إنشاء حسابك بنجاح — تحقق من بريدك الإلكتروني" });
          navigate("/onboarding");
        }
      }
    } catch (error: any) {
      setPendingPassword("");
      setPendingOtp(false);
      toast({ title: "خطأ", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setLoading(false); }
  }, [isLogin, form, navigate, accountType, otpMode, setPendingOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length < 6) {
      toast({ title: "يرجى إدخال الرمز المكون من 6 أرقام", variant: "destructive" });
      return;
    }

    setOtpLoading(true);
    try {
      // 1. Try verify-login-otp Edge Function
      let success = false;
      try {
        const { data, error } = await supabase.functions.invoke("verify-login-otp", {
          body: { email: otpEmail, code: otpCode },
        });
        if (!error && data?.success) success = true;
      } catch {}

      // 2. Try Supabase Native OTP verify
      if (!success) {
        const { data: supaVerify, error: supaErr } = await supabase.auth.verifyOtp({
          email: otpEmail,
          token: otpCode,
          type: "email",
        });

        if (!supaErr && supaVerify.session) {
          success = true;
          setPendingPassword("");
          setPendingOtp(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
          toast({ title: "تم التحقق بنجاح ✅" });
          const role = supaVerify.session?.user?.user_metadata?.account_type;
          navigate(role === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
          return;
        }
      }

      if (success && pendingPassword) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: otpEmail,
          password: pendingPassword,
        });
        if (loginError) throw loginError;

        if (rememberDevice) trustDevice(otpEmail);
        setPendingPassword("");
        setPendingOtp(false);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#06b6d4", "#f59e0b"] });
        toast({ title: "تم التحقق وتسجيل الدخول بنجاح ✅" });
        const accountType = loginData.session?.user?.user_metadata?.account_type;
        navigate(accountType === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
        return;
      }

      if (!success) throw new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
    } catch (error: any) {
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 600);
      toast({ title: "خطأ في التحقق", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setOtpLoading(false); }
  }, [otpCode, pendingPassword, otpEmail, rememberDevice, navigate, setPendingOtp]);

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setOtpLoading(true);
    try {
      await requestLoginOtp(otpEmail);
      setCountdown(60);
      toast({ title: "تم إعادة إرسال الرمز ✉️", description: "تحقق من بريدك الإلكتروني" });
    } catch (error: any) {
      toast({ title: "خطأ", description: translateAuthError(error.message), variant: "destructive" });
    } finally { setOtpLoading(false); }
  }, [countdown, otpEmail, requestLoginOtp]);

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
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 mb-4 p-3"
        >
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-full h-full object-contain filter drop-shadow-sm" />
        </motion.div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {otpStep ? "تأكيد رمز الأمان OTP 🔐" : isLogin ? "مرحباً بعودتك! 👋" : "إنشاء حساب جديد 🚀"}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {otpStep
            ? `أدخل رمز 6 أرقام المرسل إلى ${otpEmail}`
            : isLogin
            ? "سجّل دخولك للوصول إلى لوحة التحكم والخدمات"
            : "انضم إلى منصة التوظيف الذكية الأحدث في الوطن العربي"}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xl shadow-slate-200/50">
        {!otpStep ? (
          <>
            {/* Account type toggle for Sign Up */}
            {!isLogin && (
              <div className="mb-6">
                <Tabs value={accountType} onValueChange={(v) => setAccountType(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-2 h-11 bg-slate-100/80 p-1 rounded-2xl">
                    <TabsTrigger value="company" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                      <Building className="w-3.5 h-3.5" />
                      صاحب شركة / جهة
                    </TabsTrigger>
                    <TabsTrigger value="job_seeker" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                      <User className="w-3.5 h-3.5" />
                      باحث عن عمل
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Social Logins */}
            <SocialButtons />

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">أو باستخدام البريد</span>
            </div>

            {/* Auth Mode Toggle for Login: Password vs OTP */}
            {isLogin && (
              <div className="flex items-center justify-between mb-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  تسجيل الدخول عبر رمز OTP المباشر
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={otpMode ? "default" : "outline"}
                  onClick={() => setOtpMode(!otpMode)}
                  className="h-7 text-[10px] font-bold rounded-lg px-3"
                >
                  {otpMode ? "رمز OTP نشط 📲" : "تفعيل OTP 🔑"}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">الاسم الكامل</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      placeholder="أدخل اسمك الثلاثي"
                      value={form.fullName}
                      onFocus={() => setFocusedField("fullName")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className={inputClass("fullName")}
                    />
                    <User className={iconClass("fullName")} />
                  </div>
                </div>
              )}

              {!isLogin && accountType === "company" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">اسم الشركة / المؤسسة</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      placeholder="أدخل اسم الشركة"
                      value={form.companyName}
                      onFocus={() => setFocusedField("companyName")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className={inputClass("companyName")}
                    />
                    <Building className={iconClass("companyName")} />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">البريد الإلكتروني</Label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={form.email}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass("email")}
                  />
                  <Mail className={iconClass("email")} />
                </div>
              </div>

              {(!isLogin || !otpMode) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">كلمة المرور</Label>
                    {isLogin && (
                      <Link to="/forgot-password" className="text-[11px] font-bold text-primary hover:underline">
                        نسيت كلمة المرور؟
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required={!otpMode}
                      placeholder="••••••••"
                      value={form.password}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={inputClass("password")}
                    />
                    <Lock className={iconClass("password")} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all duration-300 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : otpMode ? (
                  "إرسال رمز التحقق OTP 📲"
                ) : isLogin ? (
                  "تسجيل الدخول 🔑"
                ) : (
                  "إنشاء الحساب مجاناً 🚀"
                )}
              </Button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-black text-primary hover:underline"
              >
                {isLogin ? "إنشاء حساب جديد" : "تسجيل الدخول"}
              </button>
            </div>
          </>
        ) : (
          /* OTP Verification Form */
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <KeyRound className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 block">أدخل رمز الأمان المكون من 6 أرقام</Label>
              <Input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="h-14 text-center text-2xl font-black tracking-[0.5em] rounded-2xl border-2 border-emerald-500/30 focus-visible:ring-emerald-500"
              />
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpCode.length < 6}
              className="w-full h-12 rounded-xl font-extrabold text-sm bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
            >
              {otpLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "تأكيد الرمز والدخول ✅"}
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || otpLoading}
                className="text-primary font-bold hover:underline disabled:opacity-50"
              >
                {countdown > 0 ? `إعادة الإرسال خلال (${countdown}s)` : "إعادة إرسال الرمز ✉️"}
              </button>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setPendingOtp(false); setOtpCode(""); }}
                className="text-slate-500 hover:text-slate-800 font-bold"
              >
                إلغاء والعودة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [pendingOtp, setPendingOtp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !pendingOtp) {
        const role = data.session.user?.user_metadata?.account_type;
        navigate(role === "job_seeker" ? "/seeker-dashboard" : "/dashboard");
      }
    });
  }, [navigate, pendingOtp]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <BackgroundDecoration />
      <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} setPendingOtp={setPendingOtp} />
    </div>
  );
}
