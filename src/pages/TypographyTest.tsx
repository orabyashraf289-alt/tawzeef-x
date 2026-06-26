import { useCallback, useEffect, useRef, useState } from "react";
import { H1, H2, P, Muted } from "@/components/typography";

/**
 * /typography — interactive Arabic glyph clipping test
 *
 * Features:
 *   • Renders sample Arabic with shadda/tanwin/tall diacritics across the type scale.
 *   • Auto-detects clipping by comparing scrollHeight vs clientHeight.
 *   • RTL/LTR toggle to compare font, leading, and tracking differences.
 *   • Font-size scale slider re-runs the test instantly.
 *   • Viewport resize re-runs the test (responsive verification).
 *   • Used by src/test/typography-clipping.test.tsx in CI to fail builds on regression.
 */

const SAMPLES_AR = [
  { label: "شدّة + فتحة", text: "أَهْلًا وَسَهْلًا بِكُمْ فِي تَوْظِيفْ-إكْس" },
  { label: "تنوين + ضمّة", text: "مُرَشَّحٌ مُتَمَيِّزٌ يَسْتَحِقُّ المُقَابَلَةَ" },
  { label: "همزات + ألف خنجرية", text: "إِنَّ هَٰذَا النَّصَّ يَخْتَبِرُ ٱرْتِفَاعَ ٱلْحُرُوفِ" },
  { label: "أرقام + رموز", text: "تمّ توظيف ١٢٣ مرشّحًا في ٢٠٢٦م" },
];

const SAMPLES_EN = [
  { label: "Ascenders/descenders", text: "Hiring brilliant people, fairly & quickly" },
  { label: "Numbers & symbols", text: "Hired 1,234 candidates in Q4 2026" },
  { label: "Long words", text: "Internationalization & Decentralization Pipeline" },
  { label: "Mixed case + punctuation", text: "Tawzeef-X — AI-powered recruitment, end-to-end." },
];

const SIZES: { className: string; tag: keyof JSX.IntrinsicElements; label: string }[] = [
  { className: "text-5xl font-black", tag: "h1", label: "H1 / 5xl" },
  { className: "text-4xl font-bold", tag: "h2", label: "H2 / 4xl" },
  { className: "text-3xl font-bold", tag: "h3", label: "H3 / 3xl" },
  { className: "text-2xl font-semibold", tag: "h4", label: "H4 / 2xl" },
  { className: "text-xl font-semibold", tag: "h5", label: "H5 / xl" },
  { className: "text-base", tag: "p", label: "Body / base" },
  { className: "text-sm", tag: "p", label: "Small / sm" },
];

interface Result {
  key: string;
  ok: boolean;
  contentH: number;
  boxH: number;
}

export default function TypographyTest() {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [scale, setScale] = useState(100);
  const [viewportW, setViewportW] = useState(typeof window !== "undefined" ? window.innerWidth : 0);

  const samples = dir === "rtl" ? SAMPLES_AR : SAMPLES_EN;
  const lang = dir === "rtl" ? "ar" : "en";

  const measure = useCallback(() => {
    const out: Result[] = [];
    Object.entries(refs.current).forEach(([key, el]) => {
      if (!el) return;
      const boxH = el.clientHeight;
      const contentH = el.scrollHeight;
      out.push({ key, ok: contentH <= boxH + 1, contentH, boxH });
    });
    setResults(out);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(measure, 350);
    return () => window.clearTimeout(id);
  }, [dir, scale, measure]);

  useEffect(() => {
    let t: number | undefined;
    const onResize = () => {
      setViewportW(window.innerWidth);
      window.clearTimeout(t);
      t = window.setTimeout(measure, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [measure]);

  const failures = results.filter((r) => !r.ok);

  return (
    <div
      className="min-h-screen bg-background text-foreground p-8 max-w-5xl mx-auto"
      dir={dir}
      lang={lang}
      style={{ fontSize: `${scale}%` }}
      data-testid="typography-test-root"
    >
      <header className="mb-6">
        <H1>{dir === "rtl" ? "اختبار الخطوط" : "Typography test"}</H1>
        <Muted>
          {dir === "rtl"
            ? "تحقق مباشر من عدم قص الحركات (شدّة، فتحة، تنوين) عبر كل المقاسات والاتجاهات."
            : "Live verification of no glyph clipping across every size & direction."}
        </Muted>
      </header>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium min-w-fit">Direction:</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setDir("rtl")}
              className={`px-3 py-1.5 text-sm transition ${
                dir === "rtl" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
              data-testid="dir-rtl"
            >
              RTL · العربية
            </button>
            <button
              type="button"
              onClick={() => setDir("ltr")}
              className={`px-3 py-1.5 text-sm transition ${
                dir === "ltr" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
              data-testid="dir-ltr"
            >
              LTR · English
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium min-w-fit">Scale: {scale}%</label>
          <input
            type="range"
            min={75}
            max={175}
            step={5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-primary"
            data-testid="scale-slider"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Viewport:</span>
          <span className="font-mono" data-testid="viewport-width">{viewportW}px</span>
        </div>
      </div>

      <section
        className={`mb-8 rounded-xl border p-4 ${
          results.length === 0
            ? "bg-muted border-border"
            : failures.length === 0
            ? "bg-success/10 border-success/30"
            : "bg-destructive/10 border-destructive/30"
        }`}
        data-testid="result-banner"
        data-failures={failures.length}
        data-total={results.length}
      >
        <P className="font-semibold">
          {results.length === 0
            ? "جارٍ القياس…"
            : failures.length === 0
            ? `✅ ${results.length}/${results.length} — لا يوجد قص.`
            : `⚠️ ${failures.length} حالة قص من ${results.length}:`}
        </P>
        {failures.length > 0 && (
          <ul className="mt-2 text-sm space-y-1">
            {failures.map((f) => (
              <li key={f.key} data-testid="failure-row">
                <code className="font-mono">{f.key}</code> — content {f.contentH}px / box {f.boxH}px
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-10">
        {SIZES.map((size) => (
          <div key={size.label} className="border-b border-border pb-6">
            <Muted className="text-xs uppercase tracking-wider mb-3">{size.label}</Muted>
            <div className="space-y-3">
              {samples.map((sample) => {
                const key = `${size.label} · ${sample.label}`;
                const Tag = size.tag as any;
                return (
                  <div key={key} className="grid grid-cols-[140px_1fr] gap-4 items-center">
                    <Muted className="text-xs">{sample.label}</Muted>
                    <Tag
                      ref={(el: HTMLElement | null) => (refs.current[key] = el)}
                      className={`${size.className} overflow-hidden`}
                      style={{ outline: "1px dashed hsl(var(--border))" }}
                      data-typography-sample={key}
                    >
                      {sample.text}
                    </Tag>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10 pt-6 border-t border-border">
        <H2>{dir === "rtl" ? "اختبار utilities قاسية" : "Aggressive utilities check"}</H2>
        <P className="mb-4 text-muted-foreground text-sm">
          {dir === "rtl"
            ? "هذه يجب ألا تقص في RTL (مُحايَدة عبر طبقة CSS أمان)."
            : "These should still render fully in LTR."}
        </P>
        <div className="space-y-3">
          <h3
            className="text-3xl font-bold leading-tight tracking-tight overflow-hidden"
            ref={(el) => (refs.current["safety · leading-tight"] = el)}
            data-typography-sample="safety · leading-tight"
          >
            {dir === "rtl" ? "leading-tight: شدّةٌ وفَتْحَةٌ" : "leading-tight: Quick brown fox"}
          </h3>
          <h3
            className="text-3xl font-bold leading-none overflow-hidden"
            ref={(el) => (refs.current["safety · leading-none"] = el)}
            data-typography-sample="safety · leading-none"
          >
            {dir === "rtl" ? "leading-none: مُرَشَّحٌ مُمْتَازٌ" : "leading-none: Hiring excellence"}
          </h3>
          <h3
            className="text-3xl font-bold tracking-tighter overflow-hidden"
            ref={(el) => (refs.current["safety · tracking-tighter"] = el)}
            data-typography-sample="safety · tracking-tighter"
          >
            {dir === "rtl" ? "tracking-tighter: إِنَّ ٱللَّهَ مَعَ ٱلصَّابِرِينَ" : "tracking-tighter: Persistence wins"}
          </h3>
        </div>
      </section>
    </div>
  );
}
