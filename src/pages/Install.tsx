import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Download, Share, Plus, MoreVertical, Smartphone, Monitor, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const steps = {
    ios: isAr
      ? [
          { icon: <Share className="w-5 h-5" />, text: "اضغط على زر المشاركة في أسفل الشاشة" },
          { icon: <Plus className="w-5 h-5" />, text: 'اختر "إضافة إلى الشاشة الرئيسية"' },
          { icon: <Download className="w-5 h-5" />, text: 'اضغط "إضافة" للتأكيد' },
        ]
      : [
          { icon: <Share className="w-5 h-5" />, text: "Tap the Share button at the bottom" },
          { icon: <Plus className="w-5 h-5" />, text: 'Select "Add to Home Screen"' },
          { icon: <Download className="w-5 h-5" />, text: 'Tap "Add" to confirm' },
        ],
    android: isAr
      ? [
          { icon: <MoreVertical className="w-5 h-5" />, text: "اضغط على القائمة (⋮) في أعلى المتصفح" },
          { icon: <Download className="w-5 h-5" />, text: 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"' },
          { icon: <Smartphone className="w-5 h-5" />, text: 'اضغط "تثبيت" للتأكيد' },
        ]
      : [
          { icon: <MoreVertical className="w-5 h-5" />, text: "Tap the menu (⋮) in the browser toolbar" },
          { icon: <Download className="w-5 h-5" />, text: 'Select "Install app" or "Add to Home Screen"' },
          { icon: <Smartphone className="w-5 h-5" />, text: 'Tap "Install" to confirm' },
        ],
    desktop: isAr
      ? [
          { icon: <Monitor className="w-5 h-5" />, text: "افتح التطبيق في متصفح Chrome أو Edge" },
          { icon: <Download className="w-5 h-5" />, text: "اضغط على أيقونة التثبيت في شريط العنوان" },
          { icon: <Smartphone className="w-5 h-5" />, text: 'اضغط "تثبيت" للتأكيد' },
        ]
      : [
          { icon: <Monitor className="w-5 h-5" />, text: "Open the app in Chrome or Edge" },
          { icon: <Download className="w-5 h-5" />, text: "Click the install icon in the address bar" },
          { icon: <Smartphone className="w-5 h-5" />, text: 'Click "Install" to confirm' },
        ],
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border/50">
        <div className="container mx-auto px-4 py-12 text-center max-w-2xl">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {isAr ? "العودة للرئيسية" : "Back to Home"}
            </Link>
          </Button>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Download className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold text-foreground mb-3">
            {isAr ? "ثبّت Tawzeef-X على جهازك" : "Install Tawzeef-X"}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {isAr
              ? "استخدم التطبيق مباشرة من شاشتك الرئيسية بدون الحاجة لمتجر التطبيقات"
              : "Use the app directly from your home screen — no app store needed"}
          </p>

          {isInstalled && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              ✓ {isAr ? "التطبيق مثبّت بالفعل!" : "App is already installed!"}
            </motion.div>
          )}

          {deferredPrompt && !isInstalled && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <Button size="lg" onClick={handleInstall} className="gap-2 text-base px-8">
                <Download className="w-5 h-5" />
                {isAr ? "تثبيت التطبيق الآن" : "Install Now"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        {(["ios", "android", "desktop"] as const).map((platform) => {
          const titles = {
            ios: { icon: "🍎", label: isAr ? "iPhone / iPad" : "iPhone / iPad" },
            android: { icon: "🤖", label: isAr ? "أندرويد" : "Android" },
            desktop: { icon: "💻", label: isAr ? "سطح المكتب" : "Desktop" },
          };

          return (
            <motion.div key={platform} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
              <Card className="overflow-hidden">
                <div className="bg-muted/50 px-6 py-4 border-b border-border/50">
                  <h2 className="text-lg font-semibold flex items-center gap-3">
                    <span className="text-2xl">{titles[platform].icon}</span>
                    {titles[platform].label}
                  </h2>
                </div>
                <CardContent className="p-6 space-y-4">
                  {steps[platform].map((step, i) => (
                    <motion.div key={i} custom={i} variants={fadeUp} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-muted-foreground">{step.icon}</span>
                        <span className="text-foreground">{step.text}</span>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Benefits */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {isAr ? "✨ مميزات التطبيق المثبّت" : "✨ Benefits of Installing"}
            </h3>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {(isAr
                ? ["وصول سريع من الشاشة الرئيسية", "تجربة ملء الشاشة بدون شريط المتصفح", "أداء أسرع وأكثر سلاسة", "يعمل حتى مع اتصال ضعيف"]
                : ["Quick access from home screen", "Full-screen experience without browser bar", "Faster and smoother performance", "Works even with weak connection"]
              ).map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-primary">•</span> {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
