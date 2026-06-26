import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSpeechService } from "@/hooks/useSpeechService";

/**
 * Voice selector for the browser SpeechSynthesis fallback.
 * Lets the user pick an Arabic (or other) voice and adjust speech rate.
 */
export default function VoiceSelector() {
  const svc = useSpeechService();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const arabicVoices = voices.filter((v) => v.lang.startsWith("ar"));
  const otherVoices = voices.filter((v) => !v.lang.startsWith("ar"));

  const previewVoice = () => {
    svc.cancelAll();
    void svc.speak({
      id: `preview-${Date.now()}`,
      text: "مرحباً، هذا اختبار صوت المتصفح للقراءة العربية.",
    }, { overrideLatest: true });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" title="إعدادات الصوت">
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">الصوت</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <div>
          <h4 className="font-medium text-sm">إعدادات صوت المتصفح</h4>
          <p className="text-[11px] text-muted-foreground">
            تُستخدم عند تعذّر ElevenLabs. يعتمد توفر الأصوات على نظام التشغيل والمتصفح.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">الصوت</Label>
          <Select
            value={svc.voicePref.voiceURI || "auto"}
            onValueChange={(v) => svc.setVoicePref({ voiceURI: v === "auto" ? null : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="تلقائي" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="auto">تلقائي (أول صوت عربي متاح)</SelectItem>
              {arabicVoices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">العربية</div>
                  {arabicVoices.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
                </>
              )}
              {otherVoices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">لغات أخرى</div>
                  {otherVoices.slice(0, 30).map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">السرعة</Label>
            <span className="text-[11px] text-muted-foreground">{svc.voicePref.rate.toFixed(2)}×</span>
          </div>
          <Slider
            min={0.5}
            max={1.5}
            step={0.05}
            value={[svc.voicePref.rate]}
            onValueChange={([v]) => svc.setVoicePref({ rate: v })}
          />
        </div>

        <Button variant="outline" size="sm" onClick={previewVoice} className="w-full h-8 text-xs">
          استماع للمعاينة
        </Button>

        {arabicVoices.length === 0 && (
          <p className="text-[11px] text-amber-600 leading-relaxed">
            ⚠️ لم يتم العثور على صوت عربي على جهازك. قد ترغب بتثبيت حزمة لغة عربية من إعدادات النظام لتحسين الجودة.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
