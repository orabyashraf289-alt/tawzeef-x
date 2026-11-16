import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { parseInterviewEvaluation, normalizeRecommendation } from "@/lib/interviewAI";
import AIInterviewReportDialog from "@/components/interviews/AIInterviewReportDialog";
import CandidateInterviewPrepDialog from "@/components/candidate/CandidateInterviewPrepDialog";

describe("AI Interview Evaluation Engine & Parser", () => {
  it("normalizes recommendations accurately in Arabic and English", () => {
    expect(normalizeRecommendation("Strong Hire").key).toBe("strong_hire");
    expect(normalizeRecommendation("موصى به بقوة").key).toBe("strong_hire");
    expect(normalizeRecommendation("مقبول").key).toBe("hire");
    expect(normalizeRecommendation("Hire").key).toBe("hire");
    expect(normalizeRecommendation("On Hold").key).toBe("maybe");
    expect(normalizeRecommendation("قيد الانتظار").key).toBe("maybe");
    expect(normalizeRecommendation("No Hire").key).toBe("no_hire");
    expect(normalizeRecommendation("مرفوض").key).toBe("no_hire");
  });

  it("parses AI interview format generated from VideoRoom transcript", () => {
    const aiNotes = `--- تقييم الذكاء الاصطناعي للمقابلة ---
التوصية: مقبول
التقييم العام: 88/100

الملخص:
المرشح يتمتع بخبرة قوية في تطوير واجهات React وتطبيقات الويب السحابية.

نقاط القوة:
- إتقان تقنيات TypeScript وTailwind CSS
- سرعة البديهة والقدرة على التفكير المنطقي
- أسلوب عرض وتواصل منظم

نقاط الضعف:
- يحتاج إلى إلمام أعمق باختبارات الأداء الشاملة E2E

مهارات التواصل:
تواصل احترافي وثقة عالية في النفس.`;

    const parsed = parseInterviewEvaluation(aiNotes);
    expect(parsed.hasEvaluation).toBe(true);
    expect(parsed.scorePercent).toBe(88);
    expect(parsed.starRating).toBe(4);
    expect(parsed.recommendation).toBe("hire");
    expect(parsed.summary).toContain("المرشح يتمتع بخبرة قوية");
    expect(parsed.strengths).toHaveLength(3);
    expect(parsed.strengths[0]).toBe("إتقان تقنيات TypeScript وTailwind CSS");
    expect(parsed.weaknesses).toHaveLength(1);
    expect(parsed.weaknesses[0]).toContain("اختبارات الأداء");
    expect(parsed.communication).toContain("تواصل احترافي");
    expect(parsed.evaluatorType).toBe("ai");
  });

  it("parses Live Scorecard Rubric format from interviewer evaluations", () => {
    const scorecardNotes = `--- بطاقة التقييم اللحظية للمقابلة ---
النتيجة الكلية: 85% (4/5 نجوم)
التوصية: موصى به بقوة (Strong Hire) ⭐

تفاصيل المعايير:
- المهارات الفنية والتخصصية: 5/5
- مهارات التواصل والحضور: 4/5
- حل المشكلات والتفكير النقدي: 4/5
- التوافق الثقافي والدافعية: 4/5

ملاحظات المقيم:
مرشح استثنائي ويمتلك خبرة عملية ملائمة جداً لمتطلبات الفريق.`;

    const parsed = parseInterviewEvaluation(scorecardNotes);
    expect(parsed.hasEvaluation).toBe(true);
    expect(parsed.scorePercent).toBe(85);
    expect(parsed.recommendation).toBe("strong_hire");
    expect(parsed.criteria).toHaveLength(4);
    expect(parsed.criteria.find((c) => c.key === "technical")?.score).toBe(5);
    expect(parsed.interviewerNotes).toContain("مرشح استثنائي");
    expect(parsed.evaluatorType).toBe("human_scorecard");
  });

  it("handles empty or simple fallback notes without throwing", () => {
    const parsed = parseInterviewEvaluation(null, 4);
    expect(parsed.hasEvaluation).toBe(true);
    expect(parsed.starRating).toBe(4);
    expect(parsed.scorePercent).toBe(80);
    expect(parsed.recommendation).toBe("hire");
  });
});

describe("AIInterviewReportDialog Component", () => {
  const sampleInterview = {
    id: "int-101",
    candidate_name: "سارة عبد الله",
    position: "مهندس برمجيات أول",
    date: "2026-11-20",
    time: "14:00",
    rating: 5,
    notes: `--- تقييم الذكاء الاصطناعي للمقابلة ---
التوصية: موصى به بقوة
التقييم العام: 95/100

الملخص:
أداء ممتاز في الإجابة على الأسئلة التقنية والمعمارية.

نقاط القوة:
- إلمام واسع بهيكلة البيانات
- قيادة فرق العمل بنجاح

نقاط الضعف:
- لا توجد فجوات رئيسية

مهارات التواصل:
ممتازة وواضحة.`,
    interviewer: "خالد المنصور",
  };

  it("renders report dialog with candidate details, scores, and print action", () => {
    const handleMove = vi.fn();
    render(
      <BrowserRouter>
        <AIInterviewReportDialog
          open={true}
          onOpenChange={vi.fn()}
          interview={sampleInterview}
          onMoveToOffer={handleMove}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/سارة عبد الله/i)).toBeInTheDocument();
    expect(screen.getByText(/مهندس برمجيات أول/i)).toBeInTheDocument();
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/إلمام واسع بهيكلة البيانات/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /طباعة \/ تصدير التقرير/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إصدار عرض وظيفي/i })).toBeInTheDocument();
  });
});

describe("CandidateInterviewPrepDialog Component", () => {
  it("renders device prep and AI questions tabs for candidate", () => {
    render(
      <BrowserRouter>
        <CandidateInterviewPrepDialog
          open={true}
          onOpenChange={vi.fn()}
          candidateName="عمر الشمري"
          jobTitle="مصمم تجربة مستخدم UI/UX"
          meetingUrl="/meeting/test-room"
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/عمر الشمري/i)).toBeInTheDocument();
    expect(screen.getByText(/فحص الكاميرا والصوت/i)).toBeInTheDocument();
    expect(screen.getByText(/نماذج الأسئلة المتوقعة/i)).toBeInTheDocument();

    // Switch to questions tab
    fireEvent.click(screen.getByText(/نماذج الأسئلة المتوقعة/i));
    expect(screen.getAllByText(/مصمم تجربة مستخدم UI\/UX/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /الانتقال لغرفة المقابلة الآن/i })).toBeInTheDocument();
  });
});
