import { motion } from "framer-motion";
import { Mail, CheckCircle, XCircle } from "lucide-react";

export default function EmailSentCard({ email }: { email: { candidate_name: string; to: string; subject: string; success: boolean } }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-3 p-4 rounded-xl border space-y-2 ${
        email.success
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
      }`}
    >
      <div className="flex items-center gap-2">
        {email.success ? (
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
        )}
        <div className="flex-1 text-xs">
          <p className={`font-bold ${email.success ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
            {email.success ? "تم إرسال البريد" : "فشل الإرسال"}
          </p>
          <p className={email.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            <Mail className="w-3 h-3 inline ml-1" />
            إلى {email.candidate_name} ({email.to})
          </p>
        </div>
      </div>
      <div className="text-[11px] bg-white/50 dark:bg-background/30 rounded-lg px-2.5 py-1.5">
        <span className="text-muted-foreground">الموضوع:</span> <span className="font-medium">{email.subject}</span>
      </div>
    </motion.div>
  );
}
