import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, MessageSquare, Mail, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveMessageSimulatorProps {
  channel: 'whatsapp' | 'email' | 'sms';
  content: {
    whatsappText?: string;
    emailSubject?: string;
    emailBodyHtml?: string;
    smsText?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    companyName?: string;
  };
  className?: string;
}

export default function InteractiveMessageSimulator({
  channel,
  content,
  className,
}: InteractiveMessageSimulatorProps) {
  const recipientName = content.recipientName || 'المرشح الكريم';
  const companyName = content.companyName || 'توظيف إكس (Tawzeef X)';

  if (channel === 'whatsapp') {
    const formattedLines = (content.whatsappText || 'نص الرسالة سيظهر هنا...').split('\n');

    return (
      <div className={cn("w-full max-w-md mx-auto rounded-3xl overflow-hidden border-2 border-slate-700/20 dark:border-slate-800 shadow-2xl bg-[#efeae2] dark:bg-[#0b141a]", className)}>
        {/* WhatsApp Top Header Bar */}
        <div className="bg-[#075e54] dark:bg-[#202c33] text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow">
              {companyName.slice(0, 2)}
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight flex items-center gap-1">
                <span>{companyName}</span>
                <Badge variant="secondary" className="bg-emerald-100 text-[#075e54] text-[10px] px-1 py-0 h-4 border-none">
                  حساب معتمد ✓
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-100 dark:text-slate-400">
                {content.recipientPhone || 'متصل الآن عبر توظيف إكس'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-200" />
          </div>
        </div>

        {/* WhatsApp Chat Canvas */}
        <div className="p-4 space-y-3 min-h-[300px] flex flex-col justify-end bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Encryption Notice */}
          <div className="bg-[#ffeecd] dark:bg-[#182229] border border-[#f7e0b5] dark:border-slate-800 text-[#54656f] dark:text-[#8696a0] text-[10px] py-1.5 px-3 rounded-lg text-center max-w-[85%] mx-auto shadow-xs flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>الرسائل مشفرة تماماً وموثقة برقم المنشأة الرسمي</span>
          </div>

          {/* Outbound WhatsApp Message Bubble */}
          <div className="self-end max-w-[88%] bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-2xl rounded-tr-none p-3 shadow-md border border-emerald-200/40 dark:border-emerald-600/30 text-xs sm:text-sm">
            <div className="space-y-1.5 leading-relaxed font-sans whitespace-pre-wrap select-text">
              {formattedLines.map((line, idx) => (
                <p key={idx} className={line === '' ? 'h-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-800/80 dark:text-emerald-200/70 font-mono">
              <span>الآن</span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (channel === 'email') {
    return (
      <div className={cn("w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-border/80 shadow-xl bg-card", className)}>
        {/* Email Header Preview */}
        <div className="bg-muted/70 border-b border-border p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">معاينة البريد الإلكتروني</span>
            </div>
            <Badge variant="outline" className="text-[10px]">HTML Responsive</Badge>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">إلى:</span> {recipientName} &lt;{content.recipientEmail || 'candidate@example.com'}&gt;</p>
            <p><span className="font-medium text-foreground">الموضوع:</span> {content.emailSubject || '(بدون عنوان)'}</p>
          </div>
        </div>

        {/* Email Body Iframe / Render */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 overflow-y-auto max-h-[360px]">
          {content.emailBodyHtml ? (
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
              dangerouslySetInnerHTML={{ __html: content.emailBodyHtml }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8 text-xs">لا يوجد محتوى بريد إلكتروني مدخل</p>
          )}
        </div>
      </div>
    );
  }

  // SMS View
  return (
    <div className={cn("w-full max-w-sm mx-auto rounded-3xl p-4 border-2 border-border shadow-lg bg-card space-y-3", className)}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">رسالة نصية (SMS)</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {content.smsText ? `${content.smsText.length}/160 حرف` : '0/160'}
        </Badge>
      </div>

      <div className="bg-muted/40 p-3 rounded-2xl border border-border/50 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {content.smsText || 'نص رسالة SMS...'}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        تُرسل عبر البوابة المعتمدة برقم المنشأة الرسمي
      </p>
    </div>
  );
}
