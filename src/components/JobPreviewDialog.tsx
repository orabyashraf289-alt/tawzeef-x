import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Pencil,
  CheckCircle2,
  Download,
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  Sparkles,
  QrCode,
  Loader2,
  Wallet,
  Copy as CopyIcon,
  ScanLine,
  Palette,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import SARSymbol from "@/components/SARSymbol";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import PosterBrandSettingsPanel from "@/components/PosterBrandSettingsPanel";
import { useBrandSettings } from "@/hooks/useBrandSettings";

export interface JobPreviewData {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  experience: string;
}

interface JobPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  data: JobPreviewData;
  onConfirm: (finalData: JobPreviewData) => void;
  onEdit: () => void;
  isPosting?: boolean;
}

export default function JobPreviewDialog({
  open,
  onClose,
  data,
  onConfirm,
  onEdit,
  isPosting = false,
}: JobPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"details" | "poster">("details");
  const [inlineEdit, setInlineEdit] = useState(false);
  const [showBrandPanel, setShowBrandPanel] = useState(false);
  const [editable, setEditable] = useState<{ description: string; requirements: string }>({
    description: data.description,
    requirements: data.requirements,
  });
  const [posterKey, setPosterKey] = useState(0);
  const posterRef = useRef<HTMLDivElement>(null);
  const { brand } = useBrandSettings();

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setActiveTab("details");
      setInlineEdit(false);
      setShowBrandPanel(false);
      setEditable({
        description: data.description,
        requirements: data.requirements,
      });
    }
  }, [open, data.description, data.requirements]);

  // Pre-publish QR points to a placeholder — the REAL QR with real /apply/<id> link
  // is generated automatically the moment the job is saved (see useAddJob hook).
  const previewUrl = useMemo(() => `${window.location.origin}/apply/preview`, []);

  const merged: JobPreviewData = {
    ...data,
    description: editable.description,
    requirements: editable.requirements,
  };

  const requirementsList = useMemo(
    () =>
      Array.isArray(merged.requirements)
        ? merged.requirements
        : typeof merged.requirements === "string"
          ? merged.requirements.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
    [merged.requirements]
  );

  if (!open) return null;

  const handleCopyDetails = async () => {
    const txt = [
      `📌 ${merged.title}`,
      `🏢 ${merged.department} • 📍 ${merged.location} • 🕒 ${merged.type}`,
      merged.experience ? `🎓 ${merged.experience}` : "",
      merged.salaryMin || merged.salaryMax
        ? `💰 ${merged.salaryMin || "—"} - ${merged.salaryMax || "—"} ر.س`
        : "",
      "",
      merged.description,
      "",
      requirementsList.length ? "المتطلبات:" : "",
      ...requirementsList.map((r) => `• ${r}`),
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(txt);
    toast({ title: "تم نسخ تفاصيل الإعلان ✅" });
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `job-poster-${merged.title.replace(/[^\w\u0600-\u06FF]+/g, "-")}.png`;
      link.click();
      toast({ title: "تم تحميل الملصق ✨" });
    } catch (e: any) {
      toast({
        title: "تعذّر تحميل الملصق",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleRegeneratePoster = () => {
    setPosterKey((k) => k + 1);
    toast({ title: "تم تحديث الملصق بالتعديلات الأخيرة 🔄" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/50 backdrop-blur-md"
        onClick={isPosting ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden border border-border/60 flex flex-col"
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-border/60 bg-gradient-to-l from-primary/5 via-card to-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-display font-bold truncate">
                معاينة الإعلان الوظيفي
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                راجع التفاصيل، عدّل النص أو الهوية، ثم انشر في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPosting}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border/40">
          <div className="inline-flex bg-muted/60 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "details"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              تفاصيل الإعلان
            </button>
            <button
              onClick={() => setActiveTab("poster")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "poster"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="w-4 h-4" />
              ملصق QR
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "details" ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-6"
              >
                {/* Hero card */}
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6">
                  <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="relative">
                    <Badge className="bg-primary/15 text-primary border-primary/20 mb-3">
                      مسودة جاهزة للنشر
                    </Badge>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                      {merged.title || "—"}
                    </h3>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-primary" />
                        {merged.department || "—"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        {merged.location || "—"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" />
                        {merged.type || "—"}
                      </span>
                      {merged.experience && (
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          {merged.experience}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Salary */}
                {(merged.salaryMin || merged.salaryMax) && (
                  <div className="rounded-2xl border border-border/60 bg-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        نطاق الراتب الشهري
                      </h4>
                    </div>
                    <div className="flex items-baseline gap-2 text-foreground">
                      <span className="text-2xl font-bold">{merged.salaryMin || "—"}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-2xl font-bold">{merged.salaryMax || "—"}</span>
                      <SARSymbol className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                )}

                {/* Inline editor toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {inlineEdit
                      ? "أنت في وضع التحرير السريع — التغييرات تُحفظ فور النشر."
                      : "يمكنك تعديل الوصف والمتطلبات سريعاً قبل النشر."}
                  </p>
                  <Button
                    type="button"
                    variant={inlineEdit ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInlineEdit((v) => !v)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {inlineEdit ? "إنهاء التحرير" : "تحرير سريع"}
                  </Button>
                </div>

                {/* Description (view or edit) */}
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    نبذة عن الوظيفة
                  </h4>
                  {inlineEdit ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        وصف الوظيفة
                      </Label>
                      <Textarea
                        value={editable.description}
                        onChange={(e) =>
                          setEditable((s) => ({ ...s, description: e.target.value }))
                        }
                        rows={6}
                        maxLength={2000}
                        className="text-sm leading-7"
                        placeholder="اكتب وصفاً تفصيلياً للوظيفة..."
                      />
                      <p className="text-[10px] text-muted-foreground text-end">
                        {editable.description.length}/2000
                      </p>
                    </div>
                  ) : merged.description ? (
                    <p className="text-sm text-muted-foreground leading-7 whitespace-pre-wrap">
                      {merged.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      (لا يوجد وصف بعد — فعّل التحرير السريع لإضافته)
                    </p>
                  )}
                </div>

                {/* Requirements (view or edit) */}
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    المتطلبات والمؤهلات
                  </h4>
                  {inlineEdit ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        كل متطلب في سطر منفصل
                      </Label>
                      <Textarea
                        value={editable.requirements}
                        onChange={(e) =>
                          setEditable((s) => ({ ...s, requirements: e.target.value }))
                        }
                        rows={6}
                        maxLength={2000}
                        className="text-sm leading-7"
                        placeholder="خبرة في React/TypeScript&#10;Tailwind CSS&#10;..."
                      />
                    </div>
                  ) : requirementsList.length > 0 ? (
                    <ul className="space-y-2">
                      {requirementsList.map((req, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="leading-6">{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      (لا توجد متطلبات بعد)
                    </p>
                  )}
                </div>

                {/* Quick action */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDetails}
                    className="gap-1.5"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                    نسخ التفاصيل
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="poster"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  {/* Poster preview */}
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div
                        key={posterKey}
                        ref={posterRef}
                        className="w-full max-w-[360px] aspect-[3/4] rounded-3xl p-6 flex flex-col items-center justify-between shadow-xl"
                        style={{
                          background: `linear-gradient(160deg, ${brand.primaryColor} 0%, ${brand.primaryColor}D9 60%, ${brand.accentColor} 100%)`,
                          fontFamily: brand.fontFamily,
                        }}
                      >
                        <div className="text-center text-white w-full">
                          <div className="flex items-center justify-center gap-2 mb-3 opacity-95">
                            <img
                              src={brand.logoUrl || tawzeefLogo}
                              alt={brand.companyName}
                              className="w-7 h-7 object-contain rounded"
                              crossOrigin="anonymous"
                            />
                            <span className="text-xs font-bold tracking-wider">
                              {brand.companyName || "Tawzeef-X"}
                            </span>
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">
                            We're hiring
                          </p>
                          <h3 className="text-lg font-bold leading-tight px-2 mb-1 line-clamp-2">
                            {merged.title || "وظيفة جديدة"}
                          </h3>
                          <p className="text-[11px] opacity-90">
                            {[merged.department, merged.location, merged.type]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl p-3 shadow-lg">
                          <QRCodeSVG
                            value={previewUrl}
                            size={150}
                            level="H"
                            fgColor={brand.qrForeground}
                            bgColor="#ffffff"
                          />
                        </div>

                        <div className="text-center text-white">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <ScanLine className="w-3.5 h-3.5" />
                            <p className="text-xs font-semibold">امسح الرمز للتقديم</p>
                          </div>
                          <p className="text-[10px] opacity-75">
                            سيتم تفعيل الرابط الحقيقي بعد النشر
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegeneratePoster}
                        className="flex-1 gap-1.5"
                        title="إعادة توليد الملصق بالتعديلات الأخيرة"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        إعادة توليد
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPoster}
                        className="flex-1 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        تحميل (معاينة)
                      </Button>
                    </div>
                  </div>

                  {/* Side info */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-card p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-semibold text-foreground">
                            ملصق احترافي بهوية شركتك
                          </h4>
                        </div>
                        <Button
                          variant={showBrandPanel ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowBrandPanel((v) => !v)}
                          className="gap-1.5 h-8 text-xs"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          {showBrandPanel ? "إخفاء الإعدادات" : "تخصيص الهوية"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-6">
                        ألوانك وشعارك يُحفظان تلقائياً ويُستخدمان في كل وظيفة جديدة.
                        رمز QR الحقيقي المرتبط برابط التقديم الفعلي يُولَّد ويُحفظ
                        تلقائياً فور نشر الوظيفة.
                      </p>
                    </div>

                    {showBrandPanel && (
                      <PosterBrandSettingsPanel
                        onChange={() => setPosterKey((k) => k + 1)}
                      />
                    )}

                    {!showBrandPanel && (
                      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          مزايا الملصق
                        </h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          {[
                            "هوية موحدة عبر كل وظائفك (ألوان، خط، شعار)",
                            "QR عالي الجودة (مستوى تصحيح H)",
                            "PNG عالي الدقة + SVG قابل للتكبير بدون فقدان جودة",
                            "رابط حقيقي مفعّل لحظة النشر",
                          ].map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/30 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <Sparkles className="inline w-3 h-3 text-primary ml-1" />
            بعد النشر سيتم توليد QR حقيقي مرتبط برابط التقديم وحفظه تلقائياً.
          </p>
          <div className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onEdit}
              disabled={isPosting}
              className="gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              العودة للنموذج
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(merged)}
              disabled={isPosting}
              className="gap-1.5 gradient-primary border-0 text-primary-foreground hover:opacity-90 min-w-[160px]"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري النشر...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  نشر الوظيفة في النظام
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
