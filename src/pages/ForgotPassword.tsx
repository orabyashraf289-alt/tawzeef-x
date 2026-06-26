import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(220,30%,98%)] via-[hsl(230,25%,96%)] to-[hsl(210,35%,94%)]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] mx-auto px-6"
      >
        <div className="mb-6">
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-[13px] text-[hsl(222,12%,55%)] hover:text-[hsl(222,20%,35%)] transition-colors font-medium"
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            العودة لتسجيل الدخول
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h1
                className="text-[28px] font-black text-[hsl(222,25%,14%)] mb-2 leading-tight"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                نسيت كلمة المرور؟
              </h1>
              <p
                className="text-[hsl(222,12%,52%)] text-[15px] font-medium mb-8"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="text-[13px] font-bold text-[hsl(222,15%,40%)] mb-2 block"
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  >
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className={`absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${focused ? "text-[hsl(222,65%,50%)]" : "text-[hsl(222,12%,68%)]"}`} />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="example@company.com"
                      className={`h-[50px] pr-12 rounded-2xl text-[15px] font-medium transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                        focused
                          ? "bg-white border-[hsl(222,65%,50%)] shadow-[0_0_0_4px_hsl(222_65%_50%/0.06)]"
                          : "bg-[hsl(220,25%,97.5%)] border-[hsl(220,18%,90%)] hover:border-[hsl(220,18%,82%)]"
                      } text-[hsl(222,25%,18%)] placeholder:text-[hsl(222,10%,68%)]`}
                      style={{ fontFamily: "'Cairo', sans-serif" }}
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] rounded-2xl text-[16px] font-bold border-0 transition-all duration-300 bg-[hsl(222,65%,46%)] hover:bg-[hsl(222,65%,40%)] hover:shadow-[0_8px_25px_-5px_hsl(222_65%_46%/0.35)] text-white"
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2.5">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري الإرسال...
                      </span>
                    ) : (
                      "إرسال رابط إعادة التعيين"
                    )}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-[hsl(152,56%,40%/0.1)] flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle2 className="w-8 h-8 text-[hsl(152,56%,40%)]" />
              </motion.div>
              <h2
                className="text-[22px] font-black text-[hsl(222,25%,14%)] mb-2"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                تم إرسال الرابط ✉️
              </h2>
              <p
                className="text-[hsl(222,12%,52%)] text-[15px] font-medium mb-6 max-w-[320px] mx-auto"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                تحقق من بريدك الإلكتروني <span className="font-bold text-[hsl(222,25%,20%)]" dir="ltr">{email}</span> واتبع الرابط لإعادة تعيين كلمة المرور
              </p>
              <Link to="/auth">
                <Button
                  variant="outline"
                  className="rounded-2xl h-[48px] px-8 text-[14px] font-semibold"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  العودة لتسجيل الدخول
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
