import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../MainVideo";

const aiFeatures = [
  { title: "Resume Parsing", titleAr: "تحليل السير الذاتية", desc: "AI extracts skills & experience automatically", icon: "📄" },
  { title: "Smart Ranking", titleAr: "الترتيب الذكي", desc: "Auto-rank candidates by job fit score", icon: "🎯" },
  { title: "AI Chat", titleAr: "المساعد الذكي", desc: "Ask questions, create offers, get reports", icon: "💬" },
  { title: "Job Description", titleAr: "توليد الوصف الوظيفي", desc: "Generate professional descriptions in seconds", icon: "✨" },
];

export const AIScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Brain animation
  const brainPulse = 1 + Math.sin(frame * 0.1) * 0.05;
  const brainOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{
        opacity: headerOpacity,
        fontSize: 42,
        fontWeight: 800,
        color: COLORS.text,
        fontFamily: "sans-serif",
        marginBottom: 16,
      }}>
        Powered by <span style={{ color: COLORS.violet }}>AI</span>
      </div>
      <div style={{
        opacity: headerOpacity,
        fontSize: 20,
        color: COLORS.textMuted,
        fontFamily: "sans-serif",
        marginBottom: 60,
      }}>
        مدعوم بالذكاء الاصطناعي
      </div>

      {/* AI Brain icon */}
      <div style={{
        fontSize: 80,
        transform: `scale(${brainPulse})`,
        opacity: brainOpacity,
        marginBottom: 50,
      }}>
        🧠
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {aiFeatures.map((f, i) => {
          const delay = 30 + i * 18;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
          const x = interpolate(s, [0, 1], [i % 2 === 0 ? -100 : 100, 0]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={f.title} style={{
              width: 340,
              padding: 24,
              borderRadius: 16,
              background: `${COLORS.bgLight}`,
              border: `1px solid ${COLORS.violet}25`,
              transform: `translateX(${x}px)`,
              opacity,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}>
              <div style={{ fontSize: 32, shrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif" }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: COLORS.accent, fontFamily: "sans-serif", marginTop: 2 }}>
                  {f.titleAr}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "sans-serif", marginTop: 6 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
