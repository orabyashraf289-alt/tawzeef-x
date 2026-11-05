export interface ResultEmail {
  candidate_name: string;
  candidate_email: string;
  title: string;
  total_score: number;
  max_score: number;
  passing_score: number;
  answers: {
    question_text: string;
    points_earned: number;
    max_points: number;
    feedback?: string | null;
  }[];
}

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]!);

export function buildResultsEmail(result: ResultEmail): string {
  const percentage = result.max_score > 0
    ? Math.round(result.total_score / result.max_score * 100)
    : 0;
  const passed = percentage >= result.passing_score;
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:650px;margin:auto;color:#1e293b;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
    <h1 style="font-size:24px">نتائج اختبار: ${escapeHtml(result.title)}</h1>
    <p>مرحبًا ${escapeHtml(result.candidate_name)}، نشكرك على إكمال الاختبار.</p>
    <p style="font-size:22px;font-weight:bold">${result.total_score} / ${result.max_score} — ${percentage}%</p>
    <p>${
    passed
      ? "اجتزت الحد المطلوب للاختبار"
      : "لم تصل النتيجة إلى الحد المطلوب للاختبار"
  } (${result.passing_score}%).</p>
    ${
    result.answers.map((a, index) =>
      `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px">
      <p>${index + 1}. ${
        escapeHtml(a.question_text)
      }</p><strong>${a.points_earned} / ${a.max_points}</strong>
      ${
        a.feedback
          ? `<p style="white-space:pre-wrap">${escapeHtml(a.feedback)}</p>`
          : ""
      }
    </div>`
    ).join("")
  }
    <p style="font-size:12px;color:#64748b;margin-top:24px">هذه نتيجة الاختبار المسجلة وقت إرسال الرسالة؛ قرار التوظيف النهائي لفريق التوظيف.</p>
  </div>`;
}
