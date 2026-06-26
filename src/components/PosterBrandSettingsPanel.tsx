import { useRef } from "react";
import { Palette, Upload, RotateCcw, Image as ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { DEFAULT_BRAND, type PosterBrandSettings } from "@/lib/posterBrandSettings";
import { toast } from "@/hooks/use-toast";

const FONT_OPTIONS = [
  { label: "Cairo (عربي)", value: "Cairo, sans-serif" },
  { label: "Tajawal (عربي)", value: "Tajawal, sans-serif" },
  { label: "Inter (English)", value: "Inter, sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "System Default", value: "system-ui, sans-serif" },
];

interface PosterBrandSettingsPanelProps {
  /** Optional: called whenever settings change (for live preview without saving). */
  onChange?: (settings: PosterBrandSettings) => void;
  className?: string;
}

export default function PosterBrandSettingsPanel({
  onChange,
  className,
}: PosterBrandSettingsPanelProps) {
  const { brand, update } = useBrandSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PosterBrandSettings>(key: K, value: PosterBrandSettings[K]) => {
    const next = { ...brand, [key]: value };
    update(next);
    onChange?.(next);
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast({
        title: "حجم الملف كبير",
        description: "يجب ألا يتجاوز شعار الشركة 1MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) set("logoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    update(DEFAULT_BRAND);
    onChange?.(DEFAULT_BRAND);
    toast({ title: "تمت إعادة تعيين هوية الملصق ↺" });
  };

  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card p-4 space-y-4 ${
        className ?? ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">إعدادات هوية الملصق</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          title="إعادة التعيين للقيم الافتراضية"
        >
          <RotateCcw className="w-3 h-3" />
          إعادة تعيين
        </Button>
      </div>

      {/* Company name */}
      <div className="space-y-1.5">
        <Label className="text-xs">اسم الشركة على الملصق</Label>
        <Input
          value={brand.companyName}
          onChange={(e) => set("companyName", e.target.value.slice(0, 40))}
          placeholder="Tawzeef-X"
          className="h-9 text-sm"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">اللون الأساسي</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brand.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer"
              aria-label="اللون الأساسي"
            />
            <Input
              value={brand.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">اللون الثانوي</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brand.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer"
              aria-label="اللون الثانوي"
            />
            <Input
              value={brand.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          الخط
        </Label>
        <Select value={brand.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                <span style={{ fontFamily: f.value }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" />
          شعار الشركة (اختياري)
        </Label>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center overflow-hidden shrink-0">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt="logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5 h-9"
          >
            <Upload className="w-3.5 h-3.5" />
            {brand.logoUrl ? "استبدال" : "تحميل شعار"}
          </Button>
          {brand.logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set("logoUrl", null)}
              className="h-9 text-xs text-destructive hover:text-destructive"
            >
              إزالة
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          PNG / SVG شفاف، الحد الأقصى 1MB. سيتم استخدام نفس الشعار في جميع وظائفك.
        </p>
      </div>
    </div>
  );
}
