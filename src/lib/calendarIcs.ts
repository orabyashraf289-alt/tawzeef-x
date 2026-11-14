/**
 * Standards-compliant RFC 5545 (.ics) calendar generator and download helpers
 * for tasks (due dates) and interviews.
 */

export interface IcsEventInput {
  uid?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  start: Date;
  end: Date;
  createdAt?: Date;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  categories?: string[];
}

export interface TaskIcsInput {
  id: string;
  title: string;
  dueDate: string;
  description?: string | null;
  expectedOutcome?: string | null;
  assigneeName?: string | null;
  priority?: string | null;
  status?: string | null;
  timeZone?: string | null;
  startTime?: string;
  durationMinutes?: number;
  url?: string | null;
  createdAt?: Date;
}

export interface InterviewIcsInput {
  id?: string;
  title?: string | null;
  candidateName?: string | null;
  position?: string | null;
  date: string;
  time?: string | null;
  startsAt?: string | null;
  timeZone?: string | null;
  durationMinutes?: number | null;
  interviewer?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt?: Date;
}

const MAX_ICS_LINE_OCTETS = 75;
const utf8Encoder = new TextEncoder();

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeTimeZoneAlias(timeZone: string): string {
  const trimmed = timeZone.trim();
  return trimmed === "Asia/Cairo" ? "Africa/Cairo" : trimmed;
}

function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
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
    const val = parts.find((part) => part.type === type)?.value;
    return val ? Number(val) : 0;
  };
  const year = readPart("year");
  const month = readPart("month");
  const day = readPart("day");
  const rawHour = readPart("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = readPart("minute");
  const second = readPart("second");
  return Date.UTC(year, month - 1, day, hour, minute, second) - utcMs;
}

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
  if (!isValidTimeZone(resolvedTz)) return null;

  const utcGuessMs = utcGuess.getTime();
  const offset1 = getTimeZoneOffsetMs(utcGuessMs, resolvedTz);
  const candidate1 = utcGuessMs - offset1;
  const offset2 = getTimeZoneOffsetMs(candidate1, resolvedTz);
  return new Date(offset1 === offset2 ? candidate1 : utcGuessMs - offset2);
}

/**
 * Formats a Date as RFC 5545 UTC DATE-TIME: YYYYMMDDTHHMMSSZ.
 */
export function formatIcsUtcDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid calendar date");
  }
  return (
    `${date.getUTCFullYear()}` +
    `${pad2(date.getUTCMonth() + 1)}` +
    `${pad2(date.getUTCDate())}T` +
    `${pad2(date.getUTCHours())}` +
    `${pad2(date.getUTCMinutes())}` +
    `${pad2(date.getUTCSeconds())}Z`
  );
}

function stripControlCharacters(
  value: string,
  allowTabAndNewlines: boolean,
  stripDel: boolean,
  replacement = ""
): string {
  let result = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    const isAllowed = allowTabAndNewlines && (code === 0x09 || code === 0x0a || code === 0x0d);
    const isControl = (code >= 0x00 && code <= 0x1f) || (stripDel && code === 0x7f);
    result += isControl && !isAllowed ? replacement : ch;
  }
  return result;
}

/**
 * Escapes RFC 5545 TEXT values: backslash, newlines, semicolons, commas, and unsafe control chars.
 */
export function escapeIcsText(value: string): string {
  return stripControlCharacters(value, true, true, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Folds an RFC 5545 content line at 75 UTF-8 octets on Unicode codepoint boundaries.
 */
export function foldIcsLine(line: string, maxOctets: number = MAX_ICS_LINE_OCTETS): string {
  if (utf8Encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = utf8Encoder.encode(char).length;
    const isFirstSegment = segments.length === 0;
    const limit = isFirstSegment ? maxOctets : Math.max(1, maxOctets - 1);

    if (currentBytes + charBytes > limit && current.length > 0) {
      segments.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments.join("\r\n ");
}

function sanitizeUidToken(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned || `event-${Date.now()}`;
}

function sanitizeFilename(name: string): string {
  const stripped = stripControlCharacters(name, false, false, "-")
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const base = stripped || "calendar-event";
  return base.toLowerCase().endsWith(".ics") ? base : `${base}.ics`;
}

function sanitizeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/[\r\n]/g, "");
  }
  return null;
}

/**
 * Generates an RFC 5545 VCALENDAR string with one or more VEVENT components in UTC.
 */
export function generateIcsCalendar(events: IcsEventInput | IcsEventInput[]): string {
  const list = Array.isArray(events) ? events : [events];
  if (list.length === 0) {
    throw new Error("At least one calendar event is required");
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tawzeef-X//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of list) {
    const startUtc = formatIcsUtcDate(event.start);
    const endDate =
      event.end.getTime() > event.start.getTime()
        ? event.end
        : new Date(event.start.getTime() + 30 * 60_000);
    const endUtc = formatIcsUtcDate(endDate);
    const dtStamp = formatIcsUtcDate(event.createdAt ?? new Date());
    const uid =
      event.uid && event.uid.trim()
        ? event.uid.trim().replace(/[\r\n]/g, "")
        : `${Date.now()}-${Math.random().toString(36).slice(2)}@tawzeef-x.com`;

    lines.push("BEGIN:VEVENT");
    lines.push(foldIcsLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${startUtc}`);
    lines.push(`DTEND:${endUtc}`);
    lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(event.title || "Event")}`));

    if (event.description && event.description.trim()) {
      lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(event.description.trim())}`));
    }

    if (event.location && event.location.trim()) {
      lines.push(foldIcsLine(`LOCATION:${escapeIcsText(event.location.trim())}`));
    }

    const safeUrl = sanitizeHttpUrl(event.url);
    if (safeUrl) {
      lines.push(foldIcsLine(`URL:${safeUrl}`));
    }

    if (event.categories && event.categories.length > 0) {
      const escapedCats = event.categories
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => escapeIcsText(c));
      if (escapedCats.length > 0) {
        lines.push(foldIcsLine(`CATEGORIES:${escapedCats.join(",")}`));
      }
    }

    lines.push(`STATUS:${event.status ?? "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function resolveTaskStartUtc(task: TaskIcsInput): Date {
  const timeZone = task.timeZone?.trim() || "UTC";
  const startTime = task.startTime?.trim() || "09:00";

  if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate.trim())) {
    const zoned = zonedDateTimeToUtc(task.dueDate.trim(), startTime, timeZone);
    if (zoned) return zoned;
    const utcFallback = zonedDateTimeToUtc(task.dueDate.trim(), startTime, "UTC");
    if (utcFallback) return utcFallback;
  }

  const parsed = new Date(task.dueDate);
  if (Number.isFinite(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Invalid task due date: ${task.dueDate}`);
}

export function generateTaskIcs(task: TaskIcsInput): string {
  const start = resolveTaskStartUtc(task);
  const durationMinutes =
    task.durationMinutes && task.durationMinutes > 0 ? task.durationMinutes : 60;
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const descParts: string[] = [];
  if (task.expectedOutcome?.trim()) {
    descParts.push(`Expected outcome: ${task.expectedOutcome.trim()}`);
  }
  if (task.description?.trim()) {
    descParts.push(task.description.trim());
  }
  if (task.assigneeName?.trim()) {
    descParts.push(`Assignee: ${task.assigneeName.trim()}`);
  }
  if (task.priority?.trim()) {
    descParts.push(`Priority: ${task.priority.trim()}`);
  }
  if (task.status?.trim()) {
    descParts.push(`Status: ${task.status.trim()}`);
  }

  return generateIcsCalendar({
    uid: `task-${sanitizeUidToken(task.id)}@tawzeef-x.com`,
    title: task.title,
    description: descParts.join("\n"),
    url: task.url,
    start,
    end,
    createdAt: task.createdAt,
    categories: ["Task"],
    status: "CONFIRMED",
  });
}

function resolveInterviewStartUtc(interview: InterviewIcsInput): Date {
  if (interview.startsAt && interview.startsAt.trim()) {
    const parsed = new Date(interview.startsAt);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  const timeZone = interview.timeZone?.trim() || "Asia/Riyadh";
  const time = interview.time?.trim() || "09:00";
  const zoned = zonedDateTimeToUtc(interview.date, time, timeZone);
  if (zoned) return zoned;

  const utcFallback = zonedDateTimeToUtc(interview.date, time, "UTC");
  if (utcFallback) return utcFallback;

  throw new Error(`Invalid interview schedule: ${interview.date} ${time}`);
}

export function generateInterviewIcs(interview: InterviewIcsInput): string {
  const start = resolveInterviewStartUtc(interview);
  const durationMinutes =
    interview.durationMinutes && interview.durationMinutes > 0
      ? interview.durationMinutes
      : 30;
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const summary =
    interview.title?.trim() ||
    (interview.candidateName?.trim()
      ? `Interview: ${interview.candidateName.trim()}${
          interview.position?.trim() ? ` (${interview.position.trim()})` : ""
        }`
      : "Interview");

  const descParts: string[] = [];
  if (interview.description?.trim()) descParts.push(interview.description.trim());
  if (interview.candidateName?.trim()) descParts.push(`Candidate: ${interview.candidateName.trim()}`);
  if (interview.position?.trim()) descParts.push(`Position: ${interview.position.trim()}`);
  if (interview.interviewer?.trim()) descParts.push(`Interviewer: ${interview.interviewer.trim()}`);
  if (interview.meetingUrl?.trim()) descParts.push(`Meeting URL: ${interview.meetingUrl.trim()}`);
  if (interview.notes?.trim()) descParts.push(interview.notes.trim());

  return generateIcsCalendar({
    uid: interview.id
      ? `interview-${sanitizeUidToken(interview.id)}@tawzeef-x.com`
      : undefined,
    title: summary,
    description: descParts.join("\n"),
    location: interview.location?.trim() || interview.meetingUrl?.trim() || "",
    url: interview.meetingUrl,
    start,
    end,
    createdAt: interview.createdAt,
    categories: ["Interview"],
    status: "CONFIRMED",
  });
}

/**
 * Triggers a client-side .ics file download in the browser.
 */
export function downloadIcsFile(icsContent: string, filename: string = "event.ics"): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = sanitizeFilename(filename);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function downloadTaskIcs(task: TaskIcsInput): void {
  const ics = generateTaskIcs(task);
  downloadIcsFile(ics, `task-${task.title || task.id}`);
}

export function downloadInterviewIcs(interview: InterviewIcsInput): void {
  const ics = generateInterviewIcs(interview);
  const baseName = interview.candidateName
    ? `interview-${interview.candidateName}`
    : interview.title || "interview";
  downloadIcsFile(ics, baseName);
}
