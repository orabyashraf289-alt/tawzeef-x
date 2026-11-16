import type { FormEvent } from "react";
import { FileCheck2 } from "lucide-react";
import SARSymbol from "@/components/SARSymbol";
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
import type { CandidateRow } from "@/hooks/useJobs";
import { COMPANY_DEFAULT_BRANCHES, type DirectOrderFormState } from "./convertedOrdersConstants";

interface NewDirectOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: DirectOrderFormState;
  onChangeForm: (form: DirectOrderFormState) => void;
  candidates: CandidateRow[];
  onSelectCandidate: (candidateId: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export default function NewDirectOrderDialog({
  open,
  onOpenChange,
  form,
  onChangeForm,
  candidates,
  onSelectCandidate,
  onSubmit,
  isSubmitting,
}: NewDirectOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            إصدار أمر تعيين ومباشرة جديد (Direct Employment Order)
          </DialogTitle>
          <DialogDescription className="text-xs">
            يمكنك اختيار مرشح مقبول من المنصة أو إدخال بيانات مرشح جديد مباشرة لإنشاء القرار وتحديد المزايا.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">اختيار مرشح من المنصة (اختياري للربط السريع)</Label>
            <Select value={form.candidate_id || undefined} onValueChange={onSelectCandidate}>
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue placeholder="اختر المرشح للربط التلقائي..." />
              </SelectTrigger>
              <SelectContent align="end">
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.role || "مرشح"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">اسم المرشح الكامل *</Label>
              <Input
                required
                value={form.candidate_name}
                onChange={(e) => onChangeForm({ ...form, candidate_name: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="الاسم الثلاثي أو الرباعي"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">رقم الهوية / الإقامة</Label>
              <Input
                value={form.candidate_national_id}
                onChange={(e) => onChangeForm({ ...form, candidate_national_id: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="10XXXXXXXX"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">الجنسية</Label>
              <Input
                value={form.candidate_nationality}
                onChange={(e) => onChangeForm({ ...form, candidate_nationality: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="سعودي"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">رقم الجوال</Label>
              <Input
                value={form.candidate_phone}
                onChange={(e) => onChangeForm({ ...form, candidate_phone: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-bold">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={form.candidate_email}
                onChange={(e) => onChangeForm({ ...form, candidate_email: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="candidate@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">المسمى الوظيفي *</Label>
              <Input
                required
                value={form.job_title}
                onChange={(e) => onChangeForm({ ...form, job_title: e.target.value })}
                className="text-xs rounded-xl h-9"
                placeholder="معلم لغة عربية، مطور..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">الفرع / المجمع الموجه إليه</Label>
              <Select value={form.target_branch} onValueChange={(v) => onChangeForm({ ...form, target_branch: v })}>
                <SelectTrigger className="text-xs rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {[...new Set([form.target_branch, ...COMPANY_DEFAULT_BRANCHES])].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl space-y-3 border">
            <p className="text-xs font-black text-foreground">الحزمة المالية الشهرية ({form.currency})</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <Label className="text-[11px]">الراتب الأساسي</Label>
                <Input
                  type="number"
                  value={form.basic_salary}
                  onChange={(e) => onChangeForm({ ...form, basic_salary: Number(e.target.value) })}
                  className="text-xs rounded-lg h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px]">بدل السكن</Label>
                <Input
                  type="number"
                  value={form.housing_allowance}
                  onChange={(e) => onChangeForm({ ...form, housing_allowance: Number(e.target.value) })}
                  className="text-xs rounded-lg h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px]">بدل النقل</Label>
                <Input
                  type="number"
                  value={form.transport_allowance}
                  onChange={(e) => onChangeForm({ ...form, transport_allowance: Number(e.target.value) })}
                  className="text-xs rounded-lg h-8 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <span>إجمالي الراتب الشهري المتوقع:</span>
              <span className="font-black text-sm">
                {(
                  Number(form.basic_salary) +
                  Number(form.housing_allowance) +
                  Number(form.transport_allowance) +
                  Number(form.other_allowances)
                ).toLocaleString()}{" "}
                {form.currency === "SAR" ? <SARSymbol /> : form.currency}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">تاريخ المباشرة المتوقع</Label>
              <Input
                type="date"
                value={form.joining_date}
                onChange={(e) => onChangeForm({ ...form, joining_date: e.target.value })}
                className="text-xs rounded-xl h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">فترة التجربة (بالأشهر)</Label>
              <Input
                type="number"
                value={form.probation_period_months}
                onChange={(e) => onChangeForm({ ...form, probation_period_months: Number(e.target.value) })}
                className="text-xs rounded-xl h-9"
              />
            </div>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              {isSubmitting ? "جاري الإصدار..." : "إصدار قرار التعيين ✅"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
