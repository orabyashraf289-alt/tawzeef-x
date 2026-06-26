import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../MainVideo";

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainScale = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(
    spring({ frame: frame - 40, fps, config: { damping: 15 } }),
    [0, 1], [30, 0]
  );

  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 200 + i * 200,
    y: 150 + (i % 3) * 300,
    size: 4 + (i % 3) * 2,
    speed: 0.02 + i * 0.003,
  }));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: p.x + Math.sin(frame * p.speed) * 50,
          top: p.y + Math.cos(frame * p.speed * 0.8) * 40,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          background: i % 2 === 0 ? "#f97316" : "#ec4899",
          opacity: 0.3,
        }} />
      ))}

      {/* Gradient circle behind */}
      <div style={{
        position: "absolute",
        width: 500, height: 500,
        borderRadius: "50%",
        background: `radial-gradient(circle, #f9731620, transparent 70%)`,
        transform: `scale(${mainScale})`,
      }} />

      {/* Logo Image */}
      <Img
        src={staticFile("images/tawzeef-x-logo.png")}
        style={{
          width: 150,
          height: 150,
          transform: `scale(${mainScale})`,
          opacity: titleOpacity,
          objectFit: "contain",
        }}
      />

      <div style={{
        opacity: titleOpacity,
        transform: `scale(${mainScale})`,
        fontSize: 60,
        fontWeight: 900,
        color: COLORS.text,
        fontFamily: "sans-serif",
        letterSpacing: -2,
        textAlign: "center",
        marginTop: 12,
      }}>
        Tawzeef-X
      </div>

      <div style={{
        opacity: ctaOpacity,
        transform: `translateY(${ctaY}px)`,
        marginTop: 24,
        fontSize: 28,
        color: "#f97316",
        fontFamily: "sans-serif",
        fontWeight: 600,
        textAlign: "center",
      }}>
        ابدأ الآن مجاناً
      </div>

      <div style={{
        opacity: ctaOpacity,
        transform: `translateY(${ctaY}px)`,
        marginTop: 12,
        fontSize: 22,
        color: COLORS.textMuted,
        fontFamily: "sans-serif",
        fontWeight: 400,
      }}>
        Start Hiring Smarter Today
      </div>

      {/* Pulsing border */}
      <div style={{
        position: "absolute",
        bottom: 80,
        padding: "12px 40px",
        borderRadius: 50,
        border: `2px solid #f97316`,
        opacity: interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.8]),
        fontSize: 16,
        color: "#f97316",
        fontFamily: "sans-serif",
        fontWeight: 600,
      }}>
        tawzeef-x.com
      </div>
    </AbsoluteFill>
  );
};
