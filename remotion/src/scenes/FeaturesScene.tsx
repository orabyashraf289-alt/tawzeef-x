import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { COLORS } from "../MainVideo";

const features = [
  { icon: "📋", title: "Job Management", titleAr: "إدارة الوظائف", color: "#3b82f6" },
  { icon: "👥", title: "Candidate Tracking", titleAr: "تتبع المرشحين", color: "#10b981" },
  { icon: "📅", title: "Interview Scheduling", titleAr: "جدولة المقابلات", color: "#f59e0b" },
  { icon: "📊", title: "Reports & Analytics", titleAr: "التقارير والتحليلات", color: "#8b5cf6" },
  { icon: "🤖", title: "AI Assistant", titleAr: "مساعد ذكي", color: "#06b6d4" },
  { icon: "📄", title: "Digital Offers", titleAr: "عروض رقمية", color: "#ef4444" },
];

function FeatureCard({ icon, title, titleAr, color, delay }: { icon: string; title: string; titleAr: string; color: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  const scale = interpolate(s, [0, 1], [0.5, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);

  const hover = Math.sin((frame - delay) * 0.05) * 3;

  return (
    <div style={{
      width: 270,
      padding: 24,
      borderRadius: 16,
      background: `${COLORS.bgLight}`,
      border: `1px solid ${color}30`,
      transform: `scale(${scale}) translateY(${y + hover}px)`,
      opacity,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        fontSize: 40,
        width: 64, height: 64,
        borderRadius: 16,
        background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif" }}>
        {title}
      </div>
      <div style={{ fontSize: 15, color: COLORS.textMuted, fontFamily: "sans-serif" }}>
        {titleAr}
      </div>
    </div>
  );
}

export const FeaturesScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(
    spring({ frame, fps, config: { damping: 15 } }),
    [0, 1], [40, 0]
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{
        opacity: headerOpacity,
        transform: `translateY(${headerY}px)`,
        fontSize: 42,
        fontWeight: 800,
        color: COLORS.text,
        fontFamily: "sans-serif",
        marginBottom: 60,
        textAlign: "center",
      }}>
        Key <span style={{ color: COLORS.primary }}>Features</span>
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        justifyContent: "center",
        maxWidth: 1600,
      }}>
        {features.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={15 + i * 12} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
