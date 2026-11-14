export const DEFAULT_INTERVIEW_TIMEZONE = "Asia/Riyadh";
export const CAIRO_TIMEZONE = "Africa/Cairo";
export const DEFAULT_REMINDER_MIN_EXCLUSIVE = 30;
export const DEFAULT_REMINDER_MAX_INCLUSIVE = 90;

export interface ReminderAuthInput {
  authorizationHeader: string | null;
  cronSecretHeader: string | null;
  cronSecret?: string | null;
  serviceRoleKey?: string | null;
}

export interface CompanyTimezoneSource {
  time_zone?: string | null;
  timezone?: string | null;
  country?: string | null;
  brand_settings?: Record<string, unknown> | null;
}

export interface InterviewReminderRecord {
  id: string;
  user_id: string;
  interviewer_id?: string | null;
  company_id?: string | null;
  candidate_name: string;
  position: string;
  date: string;
  time: string;
  time_zone?: string | null;
  timezone?: string | null;
  starts_at?: string | null;
  status?: string | null;
  interviewer?: string | null;
  meeting_url?: string | null;
}

export interface ReminderWindowOptions {
  now?: Date;
  company?: CompanyTimezoneSource | null;
  defaultTimeZone?: string;
  minExclusiveMinutes?: number;
  maxInclusiveMinutes?: number;
}

export interface ReminderWindowEvaluation {
  eligible: boolean;
  reason: "in_window" | "out_of_window" | "invalid_time";
  timeZone: string;
  startsAtUtc: Date | null;
  minutesUntil: number | null;
}

export interface ReminderEvaluationItem {
  interview_id: string;
  candidate_name: string;
  time_zone: string;
  starts_at_utc: string | null;
  minutes_until: number | null;
  status:
    | "sent"
    | "skipped_out_of_window"
    | "skipped_duplicate"
    | "skipped_invalid_time"
    | "failed";
  email_sent?: boolean;
  recipients_notified?: number;
  reason?: string;
}

export interface ReminderRunSummary {
  success: boolean;
  evaluated_at: string;
  window_minutes: { minExclusive: number; maxInclusive: number };
  total_evaluated: number;
  eligible_in_window: number;
  reminders_created: number;
  emails_sent: number;
  skipped_duplicate: number;
  skipped_out_of_window: number;
  skipped_invalid: number;
  failed: number;
  details: ReminderEvaluationItem[];
}

/**
 * Constant-time UTF-8 string comparison to avoid leaking secret prefix/length via timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLen; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

/**
 * Fail-closed authorization check for interview reminder invocations.
 * Only accepts exact CRON_SECRET (Bearer or x-cron-secret) or exact service role Bearer token.
 * Never accepts anon keys or substring matches.
 */
export function isReminderAuthorized(input: ReminderAuthInput): boolean {
  const authHeader = input.authorizationHeader ?? "";
  const xCronSecret = input.cronSecretHeader ?? "";
  const cronSecret = input.cronSecret ?? "";
  const serviceRoleKey = input.serviceRoleKey ?? "";

  let authorized = false;

  if (cronSecret.length > 0) {
    if (authHeader.length > 0 && constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
      authorized = true;
    }
    if (xCronSecret.length > 0 && constantTimeEqual(xCronSecret, cronSecret)) {
      authorized = true;
    }
  }

  if (serviceRoleKey.length > 0 && authHeader.length > 0) {
    if (constantTimeEqual(authHeader, `Bearer ${serviceRoleKey}`)) {
      authorized = true;
    }
  }

  return authorized;
}

export function normalizeTimeZoneAlias(timeZone: string): string {
  const trimmed = timeZone.trim();
  if (trimmed === "Asia/Cairo") {
    return CAIRO_TIMEZONE;
  }
  return trimmed;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function inferTimeZoneFromCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  if (!normalized) return null;

  if (["eg", "egypt", "مصر", "جمهورية مصر العربية"].includes(normalized)) {
    return CAIRO_TIMEZONE;
  }
  if (
    ["sa", "ksa", "saudi", "saudi arabia", "السعودية", "المملكة العربية السعودية"].includes(
      normalized,
    )
  ) {
    return "Asia/Riyadh";
  }
  if (["ae", "uae", "united arab emirates", "الإمارات", "الامارات"].includes(normalized)) {
    return "Asia/Dubai";
  }
  if (["kw", "kuwait", "الكويت"].includes(normalized)) {
    return "Asia/Kuwait";
  }
  if (["qa", "qatar", "قطر"].includes(normalized)) {
    return "Asia/Qatar";
  }
  if (["bh", "bahrain", "البحرين"].includes(normalized)) {
    return "Asia/Bahrain";
  }
  if (["om", "oman", "عمان", "سلطنة عمان"].includes(normalized)) {
    return "Asia/Muscat";
  }
  if (["jo", "jordan", "الأردن", "الاردن"].includes(normalized)) {
    return "Asia/Amman";
  }

  return null;
}

export function resolveInterviewTimeZone(
  interview: Pick<InterviewReminderRecord, "time_zone" | "timezone">,
  company?: CompanyTimezoneSource | null,
  defaultTimeZone: string = DEFAULT_INTERVIEW_TIMEZONE,
): string {
  const brandTz =
    company?.brand_settings && typeof company.brand_settings === "object"
      ? (company.brand_settings.time_zone ?? company.brand_settings.timezone)
      : null;

  const candidates: Array<string | null | undefined> = [
    interview.time_zone,
    interview.timezone,
    company?.time_zone,
    company?.timezone,
    typeof brandTz === "string" ? brandTz : null,
    inferTimeZoneFromCountry(company?.country),
    defaultTimeZone,
    DEFAULT_INTERVIEW_TIMEZONE,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const normalized = normalizeTimeZoneAlias(candidate);
    if (isValidIanaTimeZone(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_INTERVIEW_TIMEZONE;
}

function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(utcMs));
  const readPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const raw = parts.find((p) => p.type === type)?.value;
    return raw ? Number(raw) : 0;
  };

  const year = readPart("year");
  const month = readPart("month");
  const day = readPart("day");
  const rawHour = readPart("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = readPart("minute");
  const second = readPart("second");

  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtcMs - utcMs;
}

/**
 * Converts a wall-clock ISO date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) in the given IANA timezone
 * into an exact UTC Date, handling midnight crossovers, timezone offsets, and DST transitions.
 */
export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] ? Number(timeMatch[3]) : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    utcGuess.getUTCFullYear() !== year ||
    utcGuess.getUTCMonth() !== month - 1 ||
    utcGuess.getUTCDate() !== day
  ) {
    return null;
  }

  const resolvedTz = normalizeTimeZoneAlias(timeZone);
  if (!isValidIanaTimeZone(resolvedTz)) return null;

  const utcGuessMs = utcGuess.getTime();
  const offset1 = getTimeZoneOffsetMs(utcGuessMs, resolvedTz);
  const candidate1 = utcGuessMs - offset1;
  const offset2 = getTimeZoneOffsetMs(candidate1, resolvedTz);
  const finalMs = offset1 === offset2 ? candidate1 : utcGuessMs - offset2;

  return new Date(finalMs);
}

/**
 * Returns UTC date strings covering [-1, +2] days around `now` so interviews stored
 * in local dates across any timezone (UTC-12 to UTC+14) are included near midnight.
 */
export function getCandidateDateStrings(now: Date = new Date()): string[] {
  const dates: string[] = [];
  for (const dayOffset of [-1, 0, 1, 2]) {
    const shifted = new Date(now.getTime() + dayOffset * 86_400_000);
    dates.push(shifted.toISOString().slice(0, 10));
  }
  return dates;
}

export function resolveInterviewStartUtc(
  interview: Pick<
    InterviewReminderRecord,
    "date" | "time" | "time_zone" | "timezone" | "starts_at"
  >,
  company?: CompanyTimezoneSource | null,
  defaultTimeZone: string = DEFAULT_INTERVIEW_TIMEZONE,
): { startsAtUtc: Date; timeZone: string } | null {
  const timeZone = resolveInterviewTimeZone(interview, company, defaultTimeZone);

  if (interview.starts_at && interview.starts_at.trim().length > 0) {
    const parsed = new Date(interview.starts_at);
    if (!Number.isNaN(parsed.getTime())) {
      return { startsAtUtc: parsed, timeZone };
    }
  }

  if (!interview.date || !interview.time) {
    return null;
  }

  const startsAtUtc = zonedDateTimeToUtc(interview.date, interview.time, timeZone);
  if (!startsAtUtc) return null;
  return { startsAtUtc, timeZone };
}

export function evaluateReminderWindow(
  interview: Pick<
    InterviewReminderRecord,
    "date" | "time" | "time_zone" | "timezone" | "starts_at"
  >,
  options: ReminderWindowOptions = {},
): ReminderWindowEvaluation {
  const now = options.now ?? new Date();
  const minExclusive = options.minExclusiveMinutes ?? DEFAULT_REMINDER_MIN_EXCLUSIVE;
  const maxInclusive = options.maxInclusiveMinutes ?? DEFAULT_REMINDER_MAX_INCLUSIVE;
  const resolved = resolveInterviewStartUtc(
    interview,
    options.company,
    options.defaultTimeZone ?? DEFAULT_INTERVIEW_TIMEZONE,
  );

  if (!resolved) {
    return {
      eligible: false,
      reason: "invalid_time",
      timeZone: resolveInterviewTimeZone(
        interview,
        options.company,
        options.defaultTimeZone ?? DEFAULT_INTERVIEW_TIMEZONE,
      ),
      startsAtUtc: null,
      minutesUntil: null,
    };
  }

  const diffMs = resolved.startsAtUtc.getTime() - now.getTime();
  const minutesUntil = diffMs / 60_000;
  const eligible = minutesUntil > minExclusive && minutesUntil <= maxInclusive;

  return {
    eligible,
    reason: eligible ? "in_window" : "out_of_window",
    timeZone: resolved.timeZone,
    startsAtUtc: resolved.startsAtUtc,
    minutesUntil,
  };
}

export function formatInterviewLocalTime(startsAtUtc: Date, timeZone: string): string {
  const resolvedTz = isValidIanaTimeZone(normalizeTimeZoneAlias(timeZone))
    ? normalizeTimeZoneAlias(timeZone)
    : DEFAULT_INTERVIEW_TIMEZONE;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: resolvedTz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return formatter.format(startsAtUtc);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildReminderEmailHtml(
  interview: Pick<
    InterviewReminderRecord,
    "candidate_name" | "position" | "interviewer" | "meeting_url"
  >,
  localTime: string,
  timeZone: string,
): string {
  const candidateName = escapeHtml(interview.candidate_name);
  const position = escapeHtml(interview.position);
  const safeTime = escapeHtml(localTime);
  const safeTimeZone = escapeHtml(timeZone);
  const interviewer = interview.interviewer ? escapeHtml(interview.interviewer) : "";
  const safeMeetingUrl =
    interview.meeting_url && /^https?:\/\//i.test(interview.meeting_url.trim())
      ? escapeHtml(interview.meeting_url.trim())
      : "";

  return `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <div style="background: linear-gradient(135deg, #f59e0b, #eab308); padding: 24px 32px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">⏰ تذكير بموعد مقابلة</h1>
      </div>
      <div style="background: white; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p style="font-size: 16px; color: #1e293b;">لديك مقابلة قادمة خلال <strong>ساعة</strong>:</p>
        <div style="background: #fffbeb; padding: 16px 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #fde68a;">
          <p style="margin: 6px 0; font-size: 14px; color: #92400e;">👤 <strong>المرشح:</strong> ${candidateName}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #92400e;">💼 <strong>الوظيفة:</strong> ${position}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #92400e;">⏰ <strong>الوقت:</strong> ${safeTime} (${safeTimeZone})</p>
          ${interviewer ? `<p style="margin: 6px 0; font-size: 14px; color: #92400e;">🎤 <strong>المحاور:</strong> ${interviewer}</p>` : ""}
        </div>
        ${
          safeMeetingUrl
            ? `
          <a href="${safeMeetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: bold;">
            🎥 انضم للمقابلة الآن
          </a>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 12px; word-break: break-all;">${safeMeetingUrl}</p>
        `
            : ""
        }
      </div>
    </div>
  `;
}
