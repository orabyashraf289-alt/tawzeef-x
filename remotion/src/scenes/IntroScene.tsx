import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../MainVideo";

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 15 } }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 15 } }),
    [0, 1], [40, 0]
  );
  const lineWidth = interpolate(frame, [50, 80], [0, 300], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Animated rings */}
      {[0, 1, 2].map(i => {
        const delay = i * 10;
        const ringScale = spring({ frame: frame - delay, fps, config: { damping: 20 } });
        const ringOpacity = interpolate(frame, [delay, delay + 30], [0, 0.15 - i * 0.04], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            position: "absolute",
            width: 300 + i * 150,
            height: 300 + i * 150,
            borderRadius: "50%",
            border: `2px solid #f97316`,
            opacity: ringOpacity,
            transform: `scale(${ringScale})`,
          }} />
        );
      })}

      {/* Logo Image */}
      <Img
        src={staticFile("images/tawzeef-x-logo.png")}
        style={{
          width: 180,
          height: 180,
          transform: `scale(${logoScale})`,
          objectFit: "contain",
        }}
      />

      {/* Brand name */}
      <div style={{
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
        fontSize: 56,
        fontWeight: 900,
        letterSpacing: -2,
        color: COLORS.text,
        fontFamily: "sans-serif",
        marginTop: 16,
      }}>
        Tawzeef-X
      </div>

      {/* Accent line */}
      <div style={{
        width: lineWidth,
        height: 3,
        background: `linear-gradient(90deg, transparent, #f97316, #ec4899, transparent)`,
        marginTop: 20,
        borderRadius: 2,
      }} />

      {/* Subtitle */}
      <div style={{
        transform: `translateY(${subtitleY}px)`,
        opacity: subtitleOpacity,
        fontSize: 26,
        color: "#f97316",
        marginTop: 20,
        fontFamily: "sans-serif",
        fontWeight: 500,
      }}>
        منصة التوظيف الذكية
      </div>
    </AbsoluteFill>
  );
};
