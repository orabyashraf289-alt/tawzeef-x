import type { FormEvent } from "react";
import { ArrowRightLeft } from "lucide-react";
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
import { AL_ANDALUS_BRANCHES, type BranchTransferFormState } from "./convertedOrdersConstants";

interface BranchTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BranchTransferFormState;
  onChangeForm: (form: BranchTransferFormState) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export default function BranchTransferDialog({
  open,
  onOpenChange,
  form,
  onChangeForm,
  onSubmit,
  isSubmitting,
}: BranchTransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            طلب تحويل كادر بين الفروع والمجمعات
          </DialogTitle>
          <DialogDescription className="text-xs">
            إصدار أمر انتقال داخلي مع الحفاظ على سجل الموظف وتحديث جهة المباشرة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">اسم الموظف / المعلم *</Label>
            <Input
              required
              value={form.candidate_name}
              onChange={(e) => onChangeForm({ ...form, candidate_name: e.target.value })}
              className="text-xs rounded-xl h-9"
              placeholder="اسم الكادر المنقول"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">من فرع (الحالي)</Label>
              <Select value={form.source_branch} onValueChange={(v) => onChangeForm({ ...form, source_branch: v })}>
                <SelectTrigger className="text-xs rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {AL_ANDALUS_BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">إلى فرع (الجديد)</Label>
              <Select value={form.target_branch} onValueChange={(v) => onChangeForm({ ...form, target_branch: v })}>
                <SelectTrigger className="text-xs rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {AL_ANDALUS_BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">سبب التحويل *</Label>
            <Input
              required
              value={form.transfer_reason}
              onChange={(e) => onChangeForm({ ...form, transfer_reason: e.target.value })}
              className="text-xs rounded-xl h-9"
              placeholder="سد عجز، انتقال عائلي، ترقية..."
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
            >
              اعتماد أمر التحويل 🔄
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
