import { useState } from "react";
import { Mail, FileText, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Lazy imports for sub-components
import EmailSettingsForm from "@/components/email/EmailSettingsForm";
import EmailTemplateEditor from "@/components/email/EmailTemplateEditor";
import EmailAnalytics from "@/components/email/EmailAnalytics";
import ScheduledEmails from "@/components/email/ScheduledEmails";

const TABS = [
  { id: "settings", label: "الإعدادات", icon: Mail },
  { id: "templates", label: "القوالب", icon: FileText },
  { id: "analytics", label: "التحليلات", icon: TrendingUp },
  { id: "scheduled", label: "المجدولة", icon: Clock },
];

export default function EmailSettings() {
  const [tab, setTab] = useState("settings");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-foreground">نظام البريد الإلكتروني</h3>
          <p className="text-xs text-muted-foreground">إعدادات SMTP، القوالب، التحليلات، والجدولة</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-border/40">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "settings" && <EmailSettingsForm />}
        {tab === "templates" && <EmailTemplateEditor />}
        {tab === "analytics" && <EmailAnalytics />}
        {tab === "scheduled" && <ScheduledEmails />}
      </motion.div>
    </div>
  );
}
