import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence, staticFile, Img } from "remotion";
import { COLORS } from "./MainVideo";

type FeatureConfig = {
  title: string;
  titleAr: string;
  icon: string;
  color: string;
  steps: { title: string; titleAr: string; icon: string }[];
};

const FEATURES: Record<string, FeatureConfig> = {
  jobs: {
    title: "Job Management",
    titleAr: "إدارة الوظائف",
    icon: "📋",
    color: "#3b82f6",
    steps: [
      { title: "Create Job Posting", titleAr: "إنشاء إعلان وظيفي", icon: "✏️" },
      { title: "AI Job Description", titleAr: "وصف وظيفي بالذكاء الاصطناعي", icon: "🤖" },
      { title: "Set Requirements", titleAr: "تحديد المتطلبات والمؤهلات", icon: "📋" },
      { title: "Share via LinkedIn & QR", titleAr: "مشاركة عبر LinkedIn ورمز QR", icon: "🔗" },
      { title: "Track Applications", titleAr: "تتبع الطلبات والتقديمات", icon: "📊" },
    ],
  },
  candidates: {
    title: "Candidate Management",
    titleAr: "إدارة المرشحين",
    icon: "👥",
    color: "#10b981",
    steps: [
      { title: "View All Applicants", titleAr: "عرض جميع المتقدمين", icon: "👥" },
      { title: "AI Resume Analysis", titleAr: "تحليل السيرة الذاتية بالذكاء الاصطناعي", icon: "🔍" },
      { title: "Smart Ranking", titleAr: "الترتيب الذكي والتقييم", icon: "🎯" },
      { title: "Kanban Pipeline", titleAr: "لوحة كانبان لتتبع المراحل", icon: "📌" },
      { title: "Candidate Portal", titleAr: "بوابة المرشح للمتابعة", icon: "🌐" },
    ],
  },
  interviews: {
    title: "Interview Scheduling",
    titleAr: "جدولة المقابلات",
    icon: "📅",
    color: "#f59e0b",
    steps: [
      { title: "Schedule Interview", titleAr: "جدولة مقابلة جديدة", icon: "📅" },
      { title: "Video Call (Jitsi)", titleAr: "مكالمة فيديو مباشرة", icon: "📹" },
      { title: "Auto Email Invitation", titleAr: "دعوة بريدية تلقائية", icon: "✉️" },
      { title: "AI Interview Questions", titleAr: "أسئلة مقابلة بالذكاء الاصطناعي", icon: "🤖" },
      { title: "Notes, Rating & Calendar", titleAr: "ملاحظات وتقييم وتقويم", icon: "⭐" },
    ],
  },
  offers: {
    title: "Offer Management",
    titleAr: "إدارة العروض الوظيفية",
    icon: "📄",
    color: "#ef4444",
    steps: [
      { title: "Salary Breakdown", titleAr: "توزيع الراتب: أساسي + بدلات", icon: "💰" },
      { title: "Send & Track Offers", titleAr: "إرسال وتتبع حالة العروض", icon: "📨" },
      { title: "Withdraw & Re-send", titleAr: "سحب العرض وإعادة إرساله", icon: "🔄" },
      { title: "PDF & Excel Export", titleAr: "تصدير PDF و Excel احترافي", icon: "📥" },
      { title: "E-Signature Portal", titleAr: "بوابة التوقيع الإلكتروني", icon: "✍️" },
    ],
  },
  pipeline: {
    title: "Hiring Pipeline",
    titleAr: "مسار التوظيف",
    icon: "📌",
    color: "#8b5cf6",
    steps: [
      { title: "Drag & Drop Kanban Board", titleAr: "لوحة سحب وإفلات كانبان", icon: "📌" },
      { title: "Custom Stage Management", titleAr: "إدارة مراحل مخصصة", icon: "⚙️" },
      { title: "Auto Stage Notifications", titleAr: "إشعارات تلقائية عند تغيير المرحلة", icon: "🔔" },
      { title: "Bulk Actions & Filters", titleAr: "إجراءات جماعية وفلاتر", icon: "🎛️" },
      { title: "Real-time Progress Tracking", titleAr: "تتبع التقدم في الوقت الحقيقي", icon: "📊" },
    ],
  },
  ai: {
    title: "AI Assistant",
    titleAr: "مساعد الذكاء الاصطناعي",
    icon: "🤖",
    color: "#06b6d4",
    steps: [
      { title: "AI Resume Parsing", titleAr: "تحليل السيرة الذاتية بالذكاء الاصطناعي", icon: "📄" },
      { title: "Smart Candidate Ranking", titleAr: "ترتيب المرشحين الذكي", icon: "🏆" },
      { title: "AI Job Description Writer", titleAr: "كتابة وصف وظيفي بالذكاء الاصطناعي", icon: "✍️" },
      { title: "Interview Questions Generator", titleAr: "توليد أسئلة مقابلات ذكية", icon: "❓" },
      { title: "Sentiment Analysis", titleAr: "تحليل المشاعر والتقييم", icon: "💡" },
    ],
  },
  reports: {
    title: "Reports & Analytics",
    titleAr: "التقارير والتحليلات",
    icon: "📊",
    color: "#f97316",
    steps: [
      { title: "Hiring Funnel Analytics", titleAr: "تحليلات قمع التوظيف", icon: "📈" },
      { title: "Time-to-Hire Metrics", titleAr: "مقاييس وقت التوظيف", icon: "⏱️" },
      { title: "Source Performance", titleAr: "أداء مصادر التوظيف", icon: "🔍" },
      { title: "Department Breakdown", titleAr: "تحليل حسب الأقسام", icon: "🏢" },
      { title: "Export to Excel & PDF", titleAr: "تصدير إلى Excel و PDF", icon: "📥" },
    ],
  },
  hiring: {
    title: "Hiring Plan",
    titleAr: "خطة التوظيف",
    icon: "🎯",
    color: "#ec4899",
    steps: [
      { title: "Set Monthly Targets", titleAr: "تحديد أهداف التوظيف الشهرية", icon: "📅" },
      { title: "Track Goal Progress", titleAr: "تتبع تقدم الأهداف", icon: "📊" },
      { title: "Candidate Targets", titleAr: "أهداف استقطاب المرشحين", icon: "👥" },
      { title: "Interview Targets", titleAr: "أهداف المقابلات", icon: "📹" },
      { title: "Offer & Hire Targets", titleAr: "أهداف العروض والتعيينات", icon: "✅" },
    ],
  },
  share: {
    title: "Job Sharing",
    titleAr: "مشاركة الوظائف",
    icon: "🔗",
    color: "#6366f1",
    steps: [
      { title: "Public Career Page", titleAr: "صفحة وظائف عامة", icon: "🌐" },
      { title: "QR Code Generation", titleAr: "توليد رمز QR للمشاركة", icon: "📱" },
      { title: "Social Media Sharing", titleAr: "مشاركة عبر وسائل التواصل", icon: "📢" },
      { title: "Embeddable Apply Form", titleAr: "نموذج تقديم قابل للتضمين", icon: "📝" },
      { title: "Application Tracking", titleAr: "تتبع مصادر التقديمات", icon: "📈" },
    ],
  },
  settings: {
    title: "Settings & Config",
    titleAr: "الإعدادات والتكوين",
    icon: "⚙️",
    color: "#64748b",
    steps: [
      { title: "Team Roles & Permissions", titleAr: "أدوار الفريق والصلاحيات", icon: "🛡️" },
      { title: "Email SMTP Configuration", titleAr: "إعداد البريد الإلكتروني SMTP", icon: "✉️" },
      { title: "Webhook Integrations", titleAr: "تكاملات Webhooks الخارجية", icon: "🔌" },
      { title: "Bilingual Support (AR/EN)", titleAr: "دعم ثنائي اللغة", icon: "🌍" },
      { title: "Dark / Light Mode", titleAr: "الوضع الداكن والفاتح", icon: "🌗" },
    ],
  },
};

export const FeatureVideo: React.FC<{ feature: string }> = ({ feature }) => {
  const config = FEATURES[feature] || FEATURES.jobs;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: Title (frames 0-150)
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [50, 100], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [80, 140], [0, 200], { extrapolateRight: "clamp" });

  // Scene 2: Steps (frames 150-480)
  // Scene 3: Summary (frames 480-600)

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${config.color}15, transparent 70%)`,
        top: -100, right: -100,
        transform: `translate(${Math.sin(frame * 0.01) * 20}px, ${Math.cos(frame * 0.01) * 15}px)`,
      }} />

      {/* Scene 1: Title */}
      <Sequence from={0} durationInFrames={150}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            fontSize: 72, transform: `scale(${titleScale})`, opacity: titleOpacity,
          }}>
            {config.icon}
          </div>
          <div style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontSize: 52, fontWeight: 800, color: COLORS.text, fontFamily: "sans-serif",
            marginTop: 20,
          }}>
            {config.title}
          </div>
          <div style={{
            width: lineWidth, height: 3, borderRadius: 2, marginTop: 20,
            background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
          }} />
          <div style={{
            opacity: subtitleOpacity, fontSize: 30, color: config.color,
            fontFamily: "sans-serif", fontWeight: 600, marginTop: 20,
          }}>
            {config.titleAr}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Steps */}
      <Sequence from={150} durationInFrames={330}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 100 }}>
          <div style={{
            fontSize: 36, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif",
            marginBottom: 50, opacity: interpolate(frame - 150, [0, 40], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            How it <span style={{ color: config.color }}>Works</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 900 }}>
            {config.steps.map((step, i) => {
              const delay = 30 + i * 40;
              const localFrame = frame - 150;
              const s = spring({ frame: localFrame - delay, fps, config: { damping: 15, stiffness: 120 } });
              const x = interpolate(s, [0, 1], [-60, 0]);
              const opacity = interpolate(s, [0, 1], [0, 1]);

              return (
                <div key={step.title} style={{
                  display: "flex", alignItems: "center", gap: 20,
                  padding: "16px 24px", borderRadius: 14,
                  background: `${COLORS.bgLight}`,
                  border: `1px solid ${config.color}20`,
                  transform: `translateX(${x}px)`, opacity,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${config.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: config.color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, fontFamily: "sans-serif", flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, fontFamily: "sans-serif" }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "sans-serif", marginTop: 2 }}>
                      {step.titleAr}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Summary / CTA */}
      <Sequence from={480} durationInFrames={120}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {(() => {
            const localFrame = frame - 480;
            const s = spring({ frame: localFrame, fps, config: { damping: 10 } });
            const pulse = 1 + Math.sin(localFrame * 0.1) * 0.03;
            return (
              <>
                <div style={{
                  position: "absolute", width: 400, height: 400, borderRadius: "50%",
                  background: `radial-gradient(circle, ${config.color}15, transparent 70%)`,
                  transform: `scale(${s})`,
                }} />
                <Img
                  src={staticFile("images/tawzeef-x-logo.png")}
                  style={{
                    width: 120, height: 120,
                    transform: `scale(${s * pulse})`,
                    objectFit: "contain",
                  }}
                />
                <div style={{
                  fontSize: 44, fontWeight: 900, color: COLORS.text, fontFamily: "sans-serif",
                  transform: `scale(${s})`, marginTop: 12, letterSpacing: -1,
                }}>
                  Tawzeef-X
                </div>
                <div style={{
                  fontSize: 22, color: config.color, fontFamily: "sans-serif",
                  fontWeight: 600, marginTop: 12,
                  opacity: interpolate(localFrame, [30, 70], [0, 1], { extrapolateRight: "clamp" }),
                }}>
                  {config.titleAr}
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
