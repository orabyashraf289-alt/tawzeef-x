import { ShieldX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { motion } from "framer-motion";

export default function Unauthorized() {
  const { t, dir } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-md space-y-6"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center"
        >
          <ShieldX className="w-10 h-10 text-destructive" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-foreground">403</h1>
          <h2 className="text-xl font-bold text-foreground">{t("unauthorized.title")}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("unauthorized.description")}
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link to="/dashboard">
            {t("unauthorized.backToDashboard")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
