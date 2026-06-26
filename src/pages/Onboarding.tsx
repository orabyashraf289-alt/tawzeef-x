import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, User, Briefcase, ArrowLeft, Loader2, Sparkles, ImagePlus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { id: 1, title: "بيانات الملف الشخصي", desc: "أكمل بياناتك الأساسية" },
  { id: 2, title: "بيانات الشركة", desc: "عرّفنا على شركتك" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: user?.user_metadata?.full_name || "",
    jobTitle: "",
    companyName: user?.user_metadata?.company_name || "",
    department: "",
  });

  const focused = (field: string) => focusedField === field;

  const inputCls = (field: string) =>
    `h-[50px] pr-12 rounded-2xl text-[15px] font-medium transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0 ${
      focused(field)
        ? "bg-white border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.06)]"
        : "bg-muted/30 border-border/50 hover:border-border"
    } text-foreground placeholder:text-muted-foreground/50`;

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الشعار يجب أن يكون أقل من 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة صالحة", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;
    setUploadingLogo(true);
    try {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `${user.id}/company-logo.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, logoFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      console.error("Logo upload error:", err);
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Upload logo if selected
      const logoUrl = await uploadLogo();

      // Update profile with company data
      const updateData: Record<string, any> = {
        full_name: form.fullName,
        job_title: form.jobTitle,
        company_name: form.companyName,
      };
      if (logoUrl) updateData.company_logo = logoUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: form.fullName,
          job_title: form.jobTitle,
          company_name: form.companyName,
          department: form.department,
          onboarding_completed: true,
        },
      });

      toast({ title: "مرحباً بك! 🎉", description: "تم إعداد حسابك بنجاح" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[500px] mx-auto px-6"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles className="w-7 h-7 text-primary" />
          </motion.div>
          <h1 className="text-[28px] font-black text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
            مرحباً بك في Tawzeef-X 👋
          </h1>
          <p className="text-muted-foreground text-[15px] font-medium mt-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
            دعنا نعدّ حسابك في دقيقة واحدة
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((s) => (
            <div key={s.id} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= s.id ? "bg-primary" : "bg-border"}`} />
              <p className={`text-[11px] font-bold mt-2 transition-colors ${step >= s.id ? "text-primary" : "text-muted-foreground"}`} style={{ fontFamily: "'Cairo', sans-serif" }}>
                {s.title}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div>
                <label className="text-[13px] font-bold text-muted-foreground mb-2 block" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  الاسم الكامل
                </label>
                <div className="relative">
                  <User className={`absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${focused("name") ? "text-primary" : "text-muted-foreground/50"}`} />
                  <Input
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="أدخل اسمك الكامل"
                    className={inputCls("name")}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground mb-2 block" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  المسمى الوظيفي
                </label>
                <div className="relative">
                  <Briefcase className={`absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${focused("title") ? "text-primary" : "text-muted-foreground/50"}`} />
                  <Input
                    value={form.jobTitle}
                    onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                    onFocus={() => setFocusedField("title")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="مثال: مدير الموارد البشرية"
                    className={inputCls("title")}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!form.fullName}
                  className="w-full h-[52px] rounded-2xl text-[16px] font-bold border-0 transition-all duration-300 gradient-primary text-primary-foreground"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  التالي
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Company Logo Upload */}
              <div>
                <label className="text-[13px] font-bold text-muted-foreground mb-2 block" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  شعار الشركة
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center overflow-hidden transition-colors bg-muted/20 group"
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="شعار الشركة" className="w-full h-full object-contain p-2" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-[9px] font-bold">رفع شعار</span>
                      </div>
                    )}
                  </motion.button>
                  <div className="flex-1">
                    <p className="text-[12px] text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                      ارفع شعار شركتك ليظهر في المنصة وصفحات التقديم
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG — حد أقصى 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground mb-2 block" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  اسم الشركة
                </label>
                <div className="relative">
                  <Building2 className={`absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${focused("company") ? "text-primary" : "text-muted-foreground/50"}`} />
                  <Input
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    onFocus={() => setFocusedField("company")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="اسم الشركة أو المؤسسة"
                    className={inputCls("company")}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground mb-2 block" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  القسم
                </label>
                <div className="relative">
                  <Briefcase className={`absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${focused("dept") ? "text-primary" : "text-muted-foreground/50"}`} />
                  <Input
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    onFocus={() => setFocusedField("dept")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="مثال: الموارد البشرية"
                    className={inputCls("dept")}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-[52px] rounded-2xl text-[14px] font-semibold px-6 flex items-center gap-2"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  رجوع
                </Button>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={handleFinish}
                    disabled={loading || uploadingLogo}
                    className="w-full h-[52px] rounded-2xl text-[16px] font-bold border-0 transition-all duration-300 gradient-primary text-primary-foreground"
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  >
                    {loading || uploadingLogo ? (
                      <span className="inline-flex items-center gap-2.5">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {uploadingLogo ? "جاري رفع الشعار..." : "جاري الحفظ..."}
                      </span>
                    ) : (
                      "ابدأ الآن 🚀"
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Skip */}
              <p className="text-center mt-3">
                <button
                  onClick={() => {
                    supabase.auth.updateUser({ data: { onboarding_completed: true } });
                    navigate("/dashboard");
                  }}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  تخطي هذه الخطوة
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
