import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WhatsappSmsData {
  candidateName: string;
  phone: string;
  message: string;
  messageType: string;
}

export default function WhatsappSmsCard({ data }: { data: WhatsappSmsData }) {
  const [messageText, setMessageText] = useState(data.message);
  const [phoneNumber, setPhoneNumber] = useState(data.phone);
  const [copied, setCopied] = useState(false);

  // Clean phone number helper
  const getCleanPhone = (phone: string) => {
    let clean = phone.replace(/[^\d+]/g, ""); // Remove non-digit except +
    if (clean.startsWith("01")) {
      // Egyptian prefix
      clean = "20" + clean.substring(1);
    } else if (clean.startsWith("05")) {
      // Saudi prefix
      clean = "966" + clean.substring(1);
    }
    // Remove leading '+' if present for WhatsApp wa.me link
    if (clean.startsWith("+")) {
      clean = clean.substring(1);
    }
    return clean;
  };

  const cleanPhone = getCleanPhone(phoneNumber);

  const handleWhatsApp = () => {
    const encodedText = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleSMS = () => {
    const encodedText = encodeURIComponent(messageText);
    const url = `sms:${phoneNumber}?body=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary animate-bounce" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              قالب التواصل السريع لـ {data.candidateName}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {data.messageType === "interview" ? "دعوة مقابلة شخصية" :
               data.messageType === "offer" ? "عرض عمل رسمي" :
               data.messageType === "match" ? "توافق سيرة ذاتية" : "رسالة ترحيبية"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground block">رقم الهاتف:</label>
          <input 
            type="text" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="مثال: +9665xxxxxxxx أو +201xxxxxxxxx"
            className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/45 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground block">نص الرسالة:</label>
          <textarea 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/45 leading-relaxed resize-none"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 text-xs h-9 gap-1.5 font-bold border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-600 transition-all"
          onClick={handleWhatsApp}
          disabled={!cleanPhone}
        >
          <Send className="w-3.5 h-3.5 transform -rotate-45" />
          إرسال عبر WhatsApp
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 text-xs h-9 gap-1.5 font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          onClick={handleSMS}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          إرسال رسالة قصيرة SMS
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs h-9 gap-1.5 font-bold hover:bg-muted transition-all"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "تم النسخ" : "نسخ النص"}
        </Button>
      </div>
    </motion.div>
  );
}
