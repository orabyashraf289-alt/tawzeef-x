// Only a short professional excerpt is retained for a later recruiter-initiated review.
// This is best-effort redaction; applicants can review their source CV before opting in.
export function prepareConsentedResume(text: string, applicantName: string): string {
  const sensitiveLine = /@|https?:\/\/|www\.|linkedin|تاريخ الميلاد|العنوان|رقم الهوية|رقم الجواز|national id|passport|date of birth|marital status|الحالة الاجتماعية/i;
  let excerpt = text.split(/\r?\n/).map(line => line.trim())
    .filter(line => line.length > 2 && !sensitiveLine.test(line))
    .join("\n")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[بريد محذوف]")
    .replace(/(?:\+|00)?\d[\d\s().-]{7,}\d/g, "[رقم محذوف]");

  const name = applicantName.trim();
  if (name.length >= 3) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    excerpt = excerpt.replace(new RegExp(escaped, "gi"), "[اسم محذوف]");
  }
  return excerpt.trim().slice(0, 8000);
}
