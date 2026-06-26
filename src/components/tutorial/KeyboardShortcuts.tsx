import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Keyboard, Navigation, Zap } from "lucide-react";

const navShortcuts = [
  { key: "dashboard", shortcut: "Alt + D" },
  { key: "jobs", shortcut: "Alt + J" },
  { key: "candidates", shortcut: "Alt + C" },
  { key: "pipeline", shortcut: "Alt + P" },
  { key: "interviews", shortcut: "Alt + I" },
  { key: "reports", shortcut: "Alt + R" },
  { key: "settings", shortcut: "Alt + S" },
];

const actionShortcuts = [
  { key: "search", shortcut: "Ctrl + K" },
  { key: "newJob", shortcut: "Ctrl + N" },
  { key: "notifications", shortcut: "Ctrl + B" },
  { key: "theme", shortcut: "Ctrl + T" },
  { key: "lang", shortcut: "Ctrl + L" },
  { key: "fullscreen", shortcut: "F11" },
  { key: "escape", shortcut: "Escape" },
];

function ShortcutRow({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <kbd className="px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-semibold text-foreground border border-border shadow-sm">
        {shortcut}
      </kbd>
    </div>
  );
}

export default function KeyboardShortcuts() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t("tutorial.shortcuts.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("tutorial.shortcuts.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="w-4 h-4 text-primary" />
                {t("tutorial.shortcuts.nav")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {navShortcuts.map(s => (
                <ShortcutRow key={s.key} label={t(`tutorial.shortcuts.${s.key}`)} shortcut={s.shortcut} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-amber-500" />
                {t("tutorial.shortcuts.actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionShortcuts.map(s => (
                <ShortcutRow key={s.key} label={t(`tutorial.shortcuts.${s.key}`)} shortcut={s.shortcut} />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
