import { extractStatedExperience, meetsExperienceRequirement, parseEnteredExperience, parseExperienceRequirement } from "./experienceYears";

/** An applicant-facing comparison of published requirements with supplied evidence. */
export type RequirementEvidence = {
  requirement: string;
  source: "resume" | "form" | "unconfirmed";
};

export type ApplicationEvidence = {
  requirements: RequirementEvidence[];
  confirmed: number;
  total: number;
  discrepancies: string[];
  resumeReadable: boolean;
};

type EvidenceInput = {
  requirements?: unknown;
  resumeText: string;
  skills: string[];
  form: {
    email: string;
    phone: string;
    currentTitle: string;
    experience: string;
    universityDegree: string;
    major: string;
    licenseNumber: string;
  };
};

const STOP = new Set([
  "الخبره", "العمل", "مع", "على", "الى", "لمده", "مطلوب", "القدره", "شهاده", "مستوى",
  "جيد", "اجاده", "خبره", "سنوات", "سنه", "المجال", "الوظيفي", "years", "year", "required", "experience", "skills",
  "strong", "with", "and", "the", "for", "minimum", "knowledge", "ability", "degree",
]);

function asciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  });
}

export function normalizeEvidence(value: string): string {
  return asciiDigits(value).toLowerCase().normalize("NFKC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^a-z0-9\u0621-\u064a]+/g, " ").trim();
}

function keywords(value: string): string[] {
  return [...new Set(normalizeEvidence(value).split(/\s+/).filter(word =>
    word.length >= 3 && !STOP.has(word) && !/^\d+$/.test(word)))];
}

function mentions(haystack: string, words: string[]) {
  const tokens = new Set(haystack.split(/\s+/));
  return words.length > 0 && words.filter(word => tokens.has(word)).length / words.length >= 0.7;
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^00/, "");
}

export function analyzeApplicationEvidence(input: EvidenceInput): ApplicationEvidence {
  const resume = normalizeEvidence(input.resumeText);
  const entered = normalizeEvidence([
    input.form.currentTitle, input.form.universityDegree, input.form.major,
    input.form.licenseNumber, ...input.skills,
  ].join(" "));
  const formYears = parseEnteredExperience(input.form.experience);
  const listed = Array.isArray(input.requirements)
    ? input.requirements.filter((item): item is string => typeof item === "string" && !!item.trim()).slice(0, 30)
    : [];
  const requirements = listed.map(requirement => {
    const years = parseExperienceRequirement(requirement);
    if (years !== undefined) {
      if (years === null) return { requirement, source: "unconfirmed" } as RequirementEvidence;
      const otherWords = keywords(years.remaining);
      const hasOtherEvidence = otherWords.length === 0 || mentions(resume, otherWords) || mentions(entered, otherWords);
      return { requirement, source: formYears !== null && meetsExperienceRequirement(formYears, years) && hasOtherEvidence
        ? "form" : "unconfirmed" } as RequirementEvidence;
    }
    const words = keywords(requirement);
    const source = mentions(resume, words) ? "resume" : mentions(entered, words) ? "form" : "unconfirmed";
    return { requirement, source } as RequirementEvidence;
  });

  const discrepancies: string[] = [];
  const cvEmail = input.resumeText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
  if (cvEmail && input.form.email && cvEmail.toLowerCase() !== input.form.email.trim().toLowerCase())
    discrepancies.push("البريد الإلكتروني في السيرة يختلف عن البريد المدخل؛ راجع الصحيح منهما.");
  const cvPhone = input.resumeText.match(/(?:\+|00)?\d[\d\s()-]{8,16}\d/)?.[0];
  if (cvPhone && input.form.phone) {
    const a = phoneDigits(cvPhone), b = phoneDigits(input.form.phone);
    if (a.length >= 9 && b.length >= 9 && a.slice(-9) !== b.slice(-9))
      discrepancies.push("رقم الجوال في السيرة يختلف عن الرقم المدخل؛ راجع الصحيح منهما.");
  }
  const cvYears = extractStatedExperience(input.resumeText);
  if (cvYears !== null && formYears !== null && cvYears !== formYears)
    discrepancies.push("سنوات الخبرة في السيرة تختلف عن الرقم المدخل؛ راجع الصحيح منهما.");
  return {
    requirements,
    confirmed: requirements.filter(item => item.source !== "unconfirmed").length,
    total: requirements.length,
    discrepancies,
    resumeReadable: resume.length >= 80,
  };
}
