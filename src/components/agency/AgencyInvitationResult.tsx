import { useState } from "react";
import { Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { AgencyInvitation } from "@/lib/agencyInvitation";

export default function AgencyInvitationResult({ result, onClose }: {
  result: AgencyInvitation | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const manual = !!result?.invitationLink;
  return <Dialog open={!!result} onOpenChange={open => { if (!open) { setCopied(false); onClose(); } }}>
    <DialogContent dir="rtl" className="sm:max-w-lg space-y-3">
      <DialogHeader className="text-right">
        <DialogTitle>تم تجهيز حساب {result?.name}</DialogTitle>
        <DialogDescription>
          {result?.isRenewal
            ? "تم إصدار رابط جديد لتعيين كلمة المرور. انسخه وشاركه مع مسؤول المكتب فقط عبر قناة موثوقة. الرابط السابق لا يصلح للاستخدام مرة ثانية."
            : manual
            ? "تعذر إرسال البريد تلقائيًا. انسخ رابط الدعوة المؤقت وشاركه مع مسؤول المكتب فقط عبر قناة موثوقة."
            : "أُرسلت الدعوة إلى بريد مسؤول المكتب ليحدد كلمة مروره."}
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm" dir="ltr">{result?.email}</p>
      {manual && <>
        <Input aria-label="رابط الدعوة المؤقت" dir="ltr" readOnly value={result?.invitationLink || ""} onFocus={event => event.target.select()} />
        <p className="text-xs text-amber-700 dark:text-amber-400">الرابط يمنح الوصول إلى حساب المكتب. لا تنشره علنًا، ولن يظهر مرة أخرى بعد إغلاق النافذة.</p>
        <Button onClick={async () => {
          if (!result?.invitationLink) return;
          try {
            await navigator.clipboard.writeText(result.invitationLink);
            setCopied(true);
            toast({ title: "تم نسخ رابط الدعوة" });
          } catch {
            toast({ title: "تعذر النسخ؛ حدد الرابط يدويًا", variant: "destructive" });
          }
        }}><Copy className="w-4 h-4 ml-2" />{copied ? "تم النسخ" : "نسخ رابط الدعوة"}</Button>
      </>}
    </DialogContent>
  </Dialog>;
}
