import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { WorkflowScene } from "./scenes/WorkflowScene";
import { AIScene } from "./scenes/AIScene";
import { OutroScene } from "./scenes/OutroScene";

export const COLORS = {
  primary: "#0ea5e9",
  primaryDark: "#0284c7",
  accent: "#f59e0b",
  bg: "#0f172a",
  bgLight: "#1e293b",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  success: "#10b981",
  violet: "#8b5cf6",
};

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Persistent animated background */}
      <AbsoluteFill>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}15, transparent 70%)`,
          top: -100, right: -100,
          transform: `translate(${Math.sin(frame * 0.01) * 30}px, ${Math.cos(frame * 0.01) * 20}px)`,
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.violet}10, transparent 70%)`,
          bottom: -50, left: -50,
          transform: `translate(${Math.cos(frame * 0.015) * 25}px, ${Math.sin(frame * 0.012) * 20}px)`,
        }} />
      </AbsoluteFill>

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <FeaturesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <WorkflowScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <AIScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
