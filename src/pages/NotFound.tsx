import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const { locale, dir } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isAr = locale === "ar";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir={dir}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md space-y-6"
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-8xl font-black text-primary/20"
        >
          404
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? "الصفحة غير موجودة" : "Page Not Found"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isAr
              ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
              : "Sorry, the page you're looking for doesn't exist or has been moved."}
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
