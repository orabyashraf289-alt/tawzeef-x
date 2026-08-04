import { useEffect, useState } from "react";
import { Check, ChevronDown, Sparkles, Zap, Brain, Gauge, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModelChoice =
  | "auto"
  | "google/gemini-3.6-flash"
  | "google/gemini-3-flash-preview"
  | "google/gemini-2.5-pro"
  | "openai/gpt-5-mini"
  | "openai/gpt-5";

const STORAGE_KEY = "tawzeef-x_ai_model_choice";

export const MODEL_OPTIONS: {
  value: ModelChoice;
  label: string;
  short: string;
  description: string;
  provider: "Auto" | "Google" | "OpenAI";
  icon: typeof Zap;
}[] = [
  { value: "auto", label: "توجيه تلقائي ذكي (Gemini 3.6 Flash)", short: "تلقائي (3.6)", description: "أعلى دقة وسرعة تنفذية باستعمال أحدث نموذج ذكاء", provider: "Auto", icon: Sparkles },
  { value: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash ⚡", short: "Gemini 3.6", description: "أحدث وأسرع إصدار فائق السرعة والاستجابة الذكية", provider: "Google", icon: Zap },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", short: "Gemini 3", description: "معالجة سريعة للمحادثات والمهام اليومية", provider: "Google", icon: Zap },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", short: "Gemini Pro", description: "تفكير معقد وتحليل عميق للسير الذاتية", provider: "Google", icon: Brain },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", short: "GPT-5 Mini", description: "دقة عالية وتوازن استثنائي", provider: "OpenAI", icon: Gauge },
  { value: "openai/gpt-5", label: "GPT-5", short: "GPT-5", description: "أعلى دقة لمهام الاستنتاج والتقارير المعقدة", provider: "OpenAI", icon: Cpu },
];

export function getStoredModelChoice(): ModelChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && MODEL_OPTIONS.some((o) => o.value === v)) return v as ModelChoice;
  } catch {}
  return "auto";
}

interface Props {
  value: ModelChoice;
  onChange: (v: ModelChoice) => void;
  size?: "sm" | "md";
}

export default function ModelSelector({ value, onChange, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODEL_OPTIONS.find((o) => o.value === value) ?? MODEL_OPTIONS[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  }, [value]);

  const Icon = current.icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-[11px] font-medium border-primary/20 hover:border-primary/40 hover:bg-primary/5",
            size === "sm" ? "h-8 px-2.5" : "h-9 px-3"
          )}
        >
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline text-foreground">{current.short}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          اختر مزود/موديل الذكاء الاصطناعي
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODEL_OPTIONS.map((opt) => {
          const OptIcon = opt.icon;
          const active = opt.value === value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="flex items-start gap-2.5 py-2 cursor-pointer"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                <OptIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {opt.provider}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {opt.description}
                </p>
              </div>
              {active && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
