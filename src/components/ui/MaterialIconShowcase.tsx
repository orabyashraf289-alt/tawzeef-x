import { useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SAMPLE_MATERIAL_ICONS = [
  { name: "analytics", label: "التحليلات", cat: "إحصائيات" },
  { name: "person_search", label: "بحث المرشحين", cat: "توظيف" },
  { name: "work", label: "الوظائف", cat: "توظيف" },
  { name: "badge", label: "ملف المرشح", cat: "توظيف" },
  { name: "video_call", label: "مقابلة فيديو", cat: "مقابلات" },
  { name: "calendar_month", label: "الجدولة والتقويم", cat: "مقابلات" },
  { name: "psychology", label: "الذكاء الاصطناعي", cat: "AI" },
  { name: "auto_awesome", label: "ابتكار ذكي", cat: "AI" },
  { name: "mail", label: "البريد الإلكتروني", cat: "تواصل" },
  { name: "chat", label: "المحادثة الفورية", cat: "تواصل" },
  { name: "verified", label: "موثق ومُعتمد", cat: "أمان" },
  { name: "shield", label: "حماية البيانات", cat: "أمان" },
  { name: "settings", label: "الإعدادات", cat: "نظام" },
  { name: "tune", label: "تخصيص", cat: "نظام" },
  { name: "notifications", label: "التنبيهات", cat: "نظام" },
  { name: "folder_zip", label: "أرشيف الملفات", cat: "ملفات" },
];

export function MaterialIconShowcase() {
  const [search, setSearch] = useState("");
  const [variant, setVariant] = useState<"outlined" | "rounded" | "sharp">("rounded");
  const [filled, setFilled] = useState(false);

  const filtered = SAMPLE_MATERIAL_ICONS.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.label.includes(search)
  );

  return (
    <Card className="w-full border-primary/20 bg-gradient-to-br from-card to-card/90 shadow-md rounded-2xl overflow-hidden my-4">
      <CardHeader className="border-b border-border/40 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <MaterialIcon name="palette" size={22} variant="rounded" />
            </div>
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                مكتبة أيقونات Google Material Symbols
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                  مُفعلة بالنظام 🎨
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                أيقونات Google الرسمية متوفرة بنمط الخط التفاعلي Outlined & Rounded
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/40 text-xs font-bold">
            <button
              onClick={() => setVariant("rounded")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                variant === "rounded" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Rounded
            </button>
            <button
              onClick={() => setVariant("outlined")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                variant === "outlined" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Outlined
            </button>
            <button
              onClick={() => setFilled(!filled)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filled ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Filled ✨
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <Input
          placeholder="ابحث عن أيقونة Google Material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs text-xs h-9 rounded-xl"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 pt-1">
          {filtered.map((item) => (
            <div
              key={item.name}
              className="p-3 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all text-center space-y-1.5 group cursor-pointer"
            >
              <MaterialIcon
                name={item.name}
                variant={variant}
                filled={filled}
                size={26}
                className="text-foreground group-hover:text-primary group-hover:scale-110 transition-transform"
              />
              <p className="text-[11px] font-bold text-foreground truncate">{item.label}</p>
              <p className="text-[9px] text-muted-foreground font-mono truncate">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
