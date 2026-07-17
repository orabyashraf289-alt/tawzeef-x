import {
  AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence,
  staticFile, Img,
} from "remotion";
import { COLORS } from "./MainVideo";

const AI_COLOR = "#06b6d4";
const VIOLET = "#8b5cf6";

const aiFeatures = [
  { icon: "📄", title: "Smart Resume Parsing", titleAr: "تحليل السيرة الذاتية الذكي", color: "#3b82f6" },
  { icon: "🏆", title: "AI Candidate Ranking", titleAr: "الترتيب الذكي للمرشحين", color: "#10b981" },
  { icon: "⭐", title: "AI Evaluation", titleAr: "تقييم المرشحين بالذكاء الاصطناعي", color: "#f59e0b" },
  { icon: "❓", title: "Interview Questions", titleAr: "أسئلة المقابلة الذكية", color: "#8b5cf6" },
  { icon: "💡", title: "Sentiment Analysis", titleAr: "تحليل المشاعر", color: "#ef4444" },
  { icon: "✍️", title: "Job Description AI", titleAr: "مولّد الوصف الوظيفي", color: "#06b6d4" },
  { icon: "🤖", title: "AI Chat Assistant", titleAr: "مساعد المحادثة الذكي", color: "#6366f1" },
];

const workflowSteps = [
  { icon: "📄", label: "Parse Resume", labelAr: "تحليل السيرة" },
  { icon: "📊", label: "Rank & Score", labelAr: "الترتيب والتسجيل" },
  { icon: "❓", label: "Generate Questions", labelAr: "توليد الأسئلة" },
  { icon: "💡", label: "Analyze Sentiment", labelAr: "تحليل المشاعر" },
  { icon: "✅", label: "AI Recommendations", labelAr: "توصيات AI" },
];

export const AIDetailVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Animated background orbs */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${AI_COLOR}12, transparent 70%)`,
        top: -200, right: -200,
        transform: `translate(${Math.sin(frame * 0.008) * 40}px, ${Math.cos(frame * 0.008) * 30}px)`,
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${VIOLET}10, transparent 70%)`,
        bottom: -100, left: -150,
        transform: `translate(${Math.cos(frame * 0.012) * 30}px, ${Math.sin(frame * 0.01) * 25}px)`,
      }} />

      {/* Scene 1: AI Intro (0-200) */}
      <Sequence from={0} durationInFrames={200}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {(() => {
            const localFrame = frame;
            const brainScale = spring({ frame: localFrame, fps, config: { damping: 10, stiffness: 80 } });
            const brainPulse = 1 + Math.sin(localFrame * 0.08) * 0.04;
            const titleOp = interpolate(localFrame, [30, 80], [0, 1], { extrapolateRight: "clamp" });
            const subtitleOp = interpolate(localFrame, [70, 120], [0, 1], { extrapolateRight: "clamp" });
            const lineW = interpolate(localFrame, [100, 160], [0, 300], { extrapolateRight: "clamp" });
            const badgeOp = interpolate(localFrame, [120, 160], [0, 1], { extrapolateRight: "clamp" });

            // Floating particles
            const particles = Array.from({ length: 6 }, (_, i) => ({
              x: Math.sin(localFrame * 0.02 + i * 1.2) * (200 + i * 40),
              y: Math.cos(localFrame * 0.015 + i * 0.8) * (150 + i * 30),
              size: 6 + i * 2,
              opacity: interpolate(localFrame, [20 + i * 10, 60 + i * 10], [0, 0.3], { extrapolateRight: "clamp" }),
            }));

            return (
              <>
                {particles.map((p, i) => (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%",
                    width: p.size, height: p.size, borderRadius: "50%",
                    background: i % 2 === 0 ? AI_COLOR : VIOLET,
                    opacity: p.opacity,
                    transform: `translate(${p.x}px, ${p.y}px)`,
                  }} />
                ))}
                <div style={{
                  fontSize: 100,
                  transform: `scale(${brainScale * brainPulse})`,
                  filter: `drop-shadow(0 0 30px ${AI_COLOR}40)`,
                }}>
                  🧠
                </div>
                <div style={{
                  opacity: titleOp, fontSize: 56, fontWeight: 900,
                  color: COLORS.text, fontFamily: "sans-serif",
                  marginTop: 20, letterSpacing: -1,
                }}>
                  AI in <span style={{ color: AI_COLOR }}>Tawzeef-X</span>
                </div>
                <div style={{
                  width: lineW, height: 4, borderRadius: 2, marginTop: 16,
                  background: `linear-gradient(90deg, ${AI_COLOR}, ${VIOLET}, ${AI_COLOR})`,
                }} />
                <div style={{
                  opacity: subtitleOp, fontSize: 32, color: COLORS.textMuted,
                  fontFamily: "sans-serif", fontWeight: 600, marginTop: 16,
                }}>
                  الذكاء الاصطناعي في توظيف-X
                </div>
                <div style={{
                  opacity: badgeOp, marginTop: 24, padding: "10px 28px",
                  borderRadius: 30, background: `${AI_COLOR}15`,
                  border: `1px solid ${AI_COLOR}30`,
                  fontSize: 18, color: AI_COLOR, fontFamily: "sans-serif", fontWeight: 600,
                }}>
                  7 AI-Powered Features — ٧ ميزات ذكية
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Features Grid (200-560) */}
      <Sequence from={200} durationInFrames={360}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
          {(() => {
            const localFrame = frame - 200;
            const headerOp = interpolate(localFrame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

            return (
              <>
                <div style={{
                  opacity: headerOp, fontSize: 40, fontWeight: 800,
                  color: COLORS.text, fontFamily: "sans-serif", marginBottom: 50,
                }}>
                  AI-Powered <span style={{ color: AI_COLOR }}>Features</span>
                  <span style={{ fontSize: 24, color: COLORS.textMuted, marginLeft: 16 }}>الميزات الذكية</span>
                </div>

                <div style={{
                  display: "flex", flexDirection: "column", gap: 14,
                  width: "100%", maxWidth: 1000,
                }}>
                  {aiFeatures.map((f, i) => {
                    const delay = 30 + i * 35;
                    const s = spring({ frame: localFrame - delay, fps, config: { damping: 14, stiffness: 120 } });
                    const xDir = i % 2 === 0 ? -1 : 1;
                    const x = interpolate(s, [0, 1], [80 * xDir, 0]);
                    const opacity = interpolate(s, [0, 1], [0, 1]);
                    const highlight = localFrame > delay + 40 && localFrame < delay + 80;
                    const glowAmount = highlight ? interpolate(localFrame, [delay + 40, delay + 60, delay + 80], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

                    return (
                      <div key={f.title} style={{
                        display: "flex", alignItems: "center", gap: 20,
                        padding: "16px 28px", borderRadius: 16,
                        background: COLORS.bgLight,
                        border: `1.5px solid ${f.color}${highlight ? "60" : "20"}`,
                        transform: `translateX(${x}px)`, opacity,
                        boxShadow: glowAmount > 0 ? `0 0 ${20 * glowAmount}px ${f.color}30` : "none",
                      }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 14,
                          background: `${f.color}15`, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: 28, flexShrink: 0,
                        }}>
                          {f.icon}
                        </div>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: f.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, fontWeight: 800, fontFamily: "sans-serif", flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif" }}>
                            {f.title}
                          </div>
                          <div style={{ fontSize: 16, color: f.color, fontFamily: "sans-serif", marginTop: 2, fontWeight: 500 }}>
                            {f.titleAr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: AI Workflow (560-780) */}
      <Sequence from={560} durationInFrames={220}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
          {(() => {
            const localFrame = frame - 560;
            const headerOp = interpolate(localFrame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

            return (
              <>
                <div style={{
                  opacity: headerOp, fontSize: 38, fontWeight: 800,
                  color: COLORS.text, fontFamily: "sans-serif", marginBottom: 20,
                }}>
                  AI <span style={{ color: AI_COLOR }}>Workflow</span>
                </div>
                <div style={{
                  opacity: headerOp, fontSize: 22, color: COLORS.textMuted,
                  fontFamily: "sans-serif", marginBottom: 60, fontWeight: 500,
                }}>
                  سير العمل المدعوم بالذكاء الاصطناعي
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {workflowSteps.map((step, i) => {
                    const delay = 30 + i * 25;
                    const s = spring({ frame: localFrame - delay, fps, config: { damping: 15, stiffness: 100 } });
                    const scale = interpolate(s, [0, 1], [0.5, 1]);
                    const opacity = interpolate(s, [0, 1], [0, 1]);
                    const active = localFrame > delay + 20;
                    const pulse = active ? 1 + Math.sin((localFrame - delay) * 0.1) * 0.03 : 1;

                    return (
                      <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                          transform: `scale(${scale * pulse})`, opacity,
                        }}>
                          <div style={{
                            width: 80, height: 80, borderRadius: 20,
                            background: active ? `${AI_COLOR}20` : COLORS.bgLight,
                            border: `2px solid ${active ? AI_COLOR : COLORS.textMuted}30`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 36,
                            boxShadow: active ? `0 0 20px ${AI_COLOR}20` : "none",
                          }}>
                            {step.icon}
                          </div>
                          <div style={{
                            fontSize: 14, fontWeight: 700, color: COLORS.text,
                            fontFamily: "sans-serif", textAlign: "center", width: 130,
                          }}>
                            {step.label}
                          </div>
                          <div style={{
                            fontSize: 12, color: AI_COLOR, fontFamily: "sans-serif",
                            textAlign: "center", fontWeight: 500,
                          }}>
                            {step.labelAr}
                          </div>
                        </div>
                        {i < workflowSteps.length - 1 && (
                          <div style={{
                            fontSize: 24, color: AI_COLOR,
                            opacity: interpolate(
                              spring({ frame: localFrame - delay - 10, fps, config: { damping: 20 } }),
                              [0, 1], [0, 1]
                            ),
                          }}>
                            →
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Outro (780-900) */}
      <Sequence from={780} durationInFrames={120}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {(() => {
            const localFrame = frame - 780;
            const s = spring({ frame: localFrame, fps, config: { damping: 10 } });
            const pulse = 1 + Math.sin(localFrame * 0.08) * 0.03;
            const tagOp = interpolate(localFrame, [40, 80], [0, 1], { extrapolateRight: "clamp" });
            const featOp = interpolate(localFrame, [60, 100], [0, 1], { extrapolateRight: "clamp" });

            return (
              <>
                <div style={{
                  position: "absolute", width: 500, height: 500, borderRadius: "50%",
                  background: `radial-gradient(circle, ${AI_COLOR}15, transparent 70%)`,
                  transform: `scale(${s})`,
                }} />
                <Img
                  src={staticFile("images/tawzeef-x-logo.png")}
                  style={{
                    width: 130, height: 130,
                    transform: `scale(${s * pulse})`,
                    objectFit: "contain",
                  }}
                />
                <div style={{
                  fontSize: 48, fontWeight: 900, color: COLORS.text,
                  fontFamily: "sans-serif", transform: `scale(${s})`,
                  marginTop: 12, letterSpacing: -1,
                }}>
                  Tawzeef-X
                </div>
                <div style={{
                  opacity: tagOp, fontSize: 26, color: AI_COLOR,
                  fontFamily: "sans-serif", fontWeight: 700, marginTop: 16,
                }}>
                  Powered by AI — مدعوم بالذكاء الاصطناعي
                </div>
                <div style={{
                  opacity: featOp, marginTop: 24,
                  display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
                }}>
                  {aiFeatures.slice(0, 4).map((f, i) => (
                    <div key={f.title} style={{
                      padding: "8px 18px", borderRadius: 20,
                      background: `${f.color}15`, border: `1px solid ${f.color}30`,
                      fontSize: 14, color: f.color, fontFamily: "sans-serif", fontWeight: 600,
                    }}>
                      {f.icon} {f.titleAr}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
