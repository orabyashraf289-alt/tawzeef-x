import { parseJobCustomSpecs } from "./jobSpecsHelper";

const ARABIC_MONTHS: Record<string, number> = {
  "يناير": 0, "كانون الثاني": 0,
  "فبراير": 1, "شباط": 1,
  "مارس": 2, "آذار": 2,
  "أبريل": 3, "ابريل": 3, "نيسان": 3,
  "مايو": 4, "أيار": 4, "ايار": 4,
  "يونيو": 5, "حزيران": 5,
  "يوليو": 6, "تموز": 6,
  "أغسطس": 7, "اغسطس": 7, "آب": 7,
  "سبتمبر": 8, "أيلول": 8, "ايلول": 8,
  "أكتوبر": 9, "اكتوبر": 9, "تشرين الأول": 9, "تشرين الاول": 9,
  "نوفمبر": 10, "تشرين الثاني": 10,
  "ديسمبر": 11, "كانون الأول": 11, "كانون الاول": 11,
};

/**
 * Normalizes Eastern Arabic numerals (٠-٩) to standard ASCII digits (0-9).
 */
export function normalizeArabicNumerals(str: string): string {
  if (!str) return "";
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * Parses a deadline date string supporting ISO, standard slash/dash formats, and Arabic textual date strings.
 * E.g., "15 أغسطس 2026", "2026-10-31", "30/11/2026".
 */
export function parseDeadlineDate(raw?: string | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const str = normalizeArabicNumerals(raw.trim());
  if (!str) return null;

  // 1. Direct JS Date parsing
  const direct = new Date(str);
  if (!isNaN(direct.getTime()) && /\d{4}/.test(str)) {
    return direct;
  }

  // 2. Arabic textual months
  for (const [mName, mIdx] of Object.entries(ARABIC_MONTHS)) {
    if (str.includes(mName)) {
      const parts = str.match(/\d+/g);
      if (parts && parts.length >= 2) {
        let day = parseInt(parts[0], 10);
        let year = parseInt(parts[1], 10);
        if (day > 1000) {
          const temp = day;
          day = year;
          year = temp;
        }
        return new Date(Date.UTC(year, mIdx, day, 23, 59, 59));
      }
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    return new Date(Date.UTC(year, month, day, 23, 59, 59));
  }

  return null;
}

export interface JobAvailability {
  isOpen: boolean;
  isExpired: boolean;
  validThroughIso: string;
  reason?: string;
}

/**
 * Assesses whether a job is currently active, open for applications, or expired according to Google JobPosting standards.
 */
export function getJobAvailability(job: any): JobAvailability {
  if (!job) {
    return { isOpen: false, isExpired: false, validThroughIso: "", reason: "not_found" };
  }

  const rawStatus = (job.status || "").trim().toLowerCase();
  const isActiveStatus = rawStatus === "نشطة" || rawStatus === "active";
  if (!isActiveStatus) {
    return {
      isOpen: false,
      isExpired: false,
      validThroughIso: "",
      reason: `inactive_status_${job.status || "unknown"}`,
    };
  }

  const createdTime = job.created_at ? new Date(job.created_at).getTime() : Date.now();
  // Standard Google Jobs expiration window is 90 days from posting if no explicit deadline is set
  const defaultValidThroughTime = createdTime + 90 * 24 * 60 * 60 * 1000;

  const { specs } = parseJobCustomSpecs(job);
  const parsedDeadline = parseDeadlineDate(specs?.application_deadline);

  let finalValidThroughTime = defaultValidThroughTime;
  // If an explicit deadline was provided and it was not set earlier than the job creation date (template placeholder safeguard)
  if (parsedDeadline && parsedDeadline.getTime() >= createdTime) {
    finalValidThroughTime = parsedDeadline.getTime();
  }

  const now = Date.now();
  const isExpired = now > finalValidThroughTime;

  return {
    isOpen: !isExpired,
    isExpired,
    validThroughIso: new Date(finalValidThroughTime).toISOString(),
    reason: isExpired ? "deadline_passed" : undefined,
  };
}

/**
 * Returns true if a job is public, active, and has not passed its expiration deadline.
 */
export function isJobActiveAndOpen(job: any): boolean {
  const availability = getJobAvailability(job);
  return availability.isOpen;
}
