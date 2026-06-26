import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../MainVideo";

const steps = [
  { title: "Post Job", titleAr: "نشر الوظيفة", color: "#3b82f6" },
  { title: "Applications", titleAr: "استقبال الطلبات", color: "#10b981" },
  { title: "AI Screening", titleAr: "الفرز الذكي", color: "#06b6d4" },
  { title: "Pipeline", titleAr: "مسار التوظيف", color: "#8b5cf6" },
  { title: "Interview", titleAr: "المقابلة", color: "#f59e0b" },
  { title: "Offer", titleAr: "العرض الوظيفي", color: "#ef4444" },
  { title: "Hired!", titleAr: "تم التعيين!", color: "#10b981" },
];

export const WorkflowScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{
        opacity: headerOpacity,
        fontSize: 42,
        fontWeight: 800,
        color: COLORS.text,
        fontFamily: "sans-serif",
        marginBottom: 80,
      }}>
        Recruitment <span style={{ color: COLORS.accent }}>Workflow</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {steps.map((step, i) => {
          const delay = 20 + i * 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
          const scale = interpolate(s, [0, 1], [0, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          const pulse = i === steps.length - 1 ? 1 + Math.sin(frame * 0.08) * 0.03 : 1;

          return (
            <div key={step.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 160,
                padding: "20px 16px",
                borderRadius: 12,
                background: `${step.color}15`,
                border: `2px solid ${step.color}40`,
                transform: `scale(${scale * pulse})`,
                opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: step.color,
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, fontFamily: "sans-serif",
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif", textAlign: "center" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "sans-serif" }}>
                  {step.titleAr}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  opacity: interpolate(frame, [delay + 10, delay + 20], [0, 1], { extrapolateRight: "clamp" }),
                  fontSize: 20,
                  color: COLORS.textMuted,
                }}>
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
