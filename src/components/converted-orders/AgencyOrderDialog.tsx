import type { FormEvent } from "react";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_DEFAULT_BRANCHES, type AgencyOrderFormState } from "./convertedOrdersConstants";

interface AgencyOption {
  id: string;
  name: string;
}

interface AgencyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AgencyOrderFormState;
  onChangeForm: (form: AgencyOrderFormState) => void;
  agencies: AgencyOption[];
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export default function AgencyOrderDialog({
  open,
  onOpenChange,
  form,
  onChangeForm,
  agencies,
  onSubmit,
  isSubmitting,
}: AgencyOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <Handshake className="w-5 h-5 text-purple-600" />
            تحويل طلب استقدام وتوريد لوكالة معتمدة
          </DialogTitle>
          <DialogDescription className="text-xs">
            إرسال احتياج وظيفي رسمي لمكتب استقدام معتمد مع تحديد الكوتا والمواصفات.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">اختيار مكتب الاستقدام / التوظيف *</Label>
            <Select value={form.agency_id} onValueChange={(v) => onChangeForm({ ...form, agency_id: v })}>
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue placeholder="اختر المكتب..." />
              </SelectTrigger>
              <SelectContent align="end">
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">المسمى الوظيفي المطلوب *</Label>
              <Input
                required
                value={form.job_title}
                onChange={(e) => onChangeForm({ ...form, job_title: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="معلمات لغة إنجليزية، فيزياء..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">العدد المطلوب (الكوتا)</Label>
              <Input
                type="number"
                min={1}
                value={form.quota}
                onChange={(e) => onChangeForm({ ...form, quota: Number(e.target.value) })}
                className="text-xs rounded-xl h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">الفرع الموجه إليه</Label>
            <Select value={form.target_branch} onValueChange={(v) => onChangeForm({ ...form, target_branch: v })}>
              <SelectTrigger className="text-xs rounded-xl h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {COMPANY_DEFAULT_BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">ملاحظات واشتراطات خاصة للوكالة</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => onChangeForm({ ...form, notes: e.target.value })}
              placeholder="مثال: خبرة لا تقل عن 3 سنوات في المناهج الدولية وإتقان تام للغة الإنجليزية..."
              className="text-xs rounded-xl min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs"
            >
              إرسال أمر الاستقدام 🚀
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
