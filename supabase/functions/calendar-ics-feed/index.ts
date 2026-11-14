// Read-only RFC 5545 iCalendar (.ics) subscription feed for upcoming company interviews.
// Supports authenticated Bearer JWT requests and HMAC-SHA256 signed subscription tokens (?token=).
// Uses Web Crypto API and guards Deno.serve via import.meta.main so Vitest can import helpers safely.

export interface CalendarInterviewRecord {
  id: string;
  candidate_name: string;
  position: string;
  date: string;
  time: string;
  starts_at?: string | null;
  time_zone?: string | null;
  duration_minutes?: number | null;
  type?: string | null;
  interviewer?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  status?: string | null;
  updated_at?: string | null;
  company_id?: string | null;
  user_id?: string | null;
}

export interface CalendarFeedTokenPayload {
  v: 1;
  sub: string;
  companyId: string | null;
  iat: number;
  exp: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: CalendarFeedTokenPayload;
  reason?: string;
}

export interface BuildIcsFeedOptions {
  calendarName?: string;
  companyName?: string;
  now?: Date;
  defaultDurationMinutes?: number;
  prodId?: string;
}

export interface SignTokenInput {
  sub: string;
  companyId: string | null;
  ttlSeconds?: number;
  nowSeconds?: number;
}

interface DenoLike {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
}

interface QueryError {
  message?: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

export interface SupabaseFilterBuilder<T> extends PromiseLike<QueryResult<T[]>> {
  select(columns: string): SupabaseFilterBuilder<T>;
  eq(column: string, value: string): SupabaseFilterBuilder<T>;
  in(column: string, values: string[]): SupabaseFilterBuilder<T>;
  or(filters: string): SupabaseFilterBuilder<T>;
  gte(column: string, value: string): SupabaseFilterBuilder<T>;
  not(column: string, operator: string, value: string): SupabaseFilterBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseFilterBuilder<T>;
  limit(count: number): SupabaseFilterBuilder<T>;
  maybeSingle(): Promise<QueryResult<T>>;
}

export interface MinimalSupabaseClient {
  auth: {
    getUser(token?: string): Promise<{
      data: { user: { id: string; is_anonymous?: boolean } | null };
      error: QueryError | null;
    }>;
  };
  from<T = Record<string, unknown>>(table: string): SupabaseFilterBuilder<T>;
}

export interface CalendarFeedRuntimeDeps {
  createClient: (
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ) => MinimalSupabaseClient;
  getCorsHeaders: (req: Request) => Record<string, string>;
  getEnv: (key: string) => string | undefined;
  now?: () => Date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_DURATION_MINUTES = 30;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 480;
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MIN_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

const EXCLUDED_STATUSES = new Set([
  "ملغاة",
  "ملغي",
  "مكتملة",
  "مكتمل",
  "cancelled",
  "canceled",
  "completed",
  "done",
]);

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

function getDenoRuntime(): DenoLike | undefined {
  return (globalThis as { Deno?: DenoLike }).Deno;
}

function requireSecret(secret: string): string {
  if (typeof secret !== "string" || secret.trim().length === 0) {
    throw new Error("Calendar feed signing secret is required");
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(encoded: string): Uint8Array | null {
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function importHmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  const validSecret = requireSecret(secret);
  const keyBytes = new TextEncoder().encode(validSecret);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signCalendarFeedToken(
  input: SignTokenInput,
  secret: string,
): Promise<string> {
  requireSecret(secret);

  if (!isValidUuid(input.sub)) {
    throw new Error("Invalid subject user ID for calendar feed token");
  }
  if (input.companyId !== null && !isValidUuid(input.companyId)) {
    throw new Error("Invalid company ID for calendar feed token");
  }

  const iat = typeof input.nowSeconds === "number" && Number.isFinite(input.nowSeconds)
    ? Math.floor(input.nowSeconds)
    : Math.floor(Date.now() / 1000);
  const rawTtl = typeof input.ttlSeconds === "number" && Number.isFinite(input.ttlSeconds)
    ? Math.floor(input.ttlSeconds)
    : DEFAULT_TTL_SECONDS;
  const clampedTtl = Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, rawTtl));

  const payload: CalendarFeedTokenPayload = {
    v: 1,
    sub: input.sub.trim(),
    companyId: input.companyId ? input.companyId.trim() : null,
    iat,
    exp: iat + clampedTtl,
  };

  const payloadEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret, "sign");
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadEncoded),
  );
  const sigEncoded = base64UrlEncode(new Uint8Array(sigBuffer));
  return `${payloadEncoded}.${sigEncoded}`;
}

export async function verifyCalendarFeedToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<TokenVerificationResult> {
  if (typeof secret !== "string" || secret.trim().length === 0) {
    return { valid: false, reason: "missing_secret" };
  }
  if (typeof token !== "string" || token.trim().length === 0) {
    return { valid: false, reason: "missing_token" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "malformed_token" };
  }

  const [payloadEncoded, sigEncoded] = parts;
  const providedSig = base64UrlDecode(sigEncoded);
  if (!providedSig) {
    return { valid: false, reason: "malformed_signature" };
  }

  const key = await importHmacKey(secret, "sign");
  const expectedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadEncoded),
  );
  const expectedSig = new Uint8Array(expectedSigBuffer);

  if (!timingSafeEqualBytes(providedSig, expectedSig)) {
    return { valid: false, reason: "invalid_signature" };
  }

  const payloadBytes = base64UrlDecode(payloadEncoded);
  if (!payloadBytes) {
    return { valid: false, reason: "malformed_payload" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { valid: false, reason: "invalid_json" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { valid: false, reason: "invalid_payload" };
  }

  const candidate = parsed as Partial<CalendarFeedTokenPayload>;
  if (
    candidate.v !== 1 ||
    !isValidUuid(candidate.sub) ||
    (candidate.companyId !== null && !isValidUuid(candidate.companyId)) ||
    typeof candidate.exp !== "number" ||
    !Number.isFinite(candidate.exp) ||
    typeof candidate.iat !== "number" ||
    !Number.isFinite(candidate.iat)
  ) {
    return { valid: false, reason: "invalid_claims" };
  }

  if (candidate.exp <= nowSeconds) {
    return { valid: false, reason: "token_expired" };
  }

  return {
    valid: true,
    payload: {
      v: 1,
      sub: candidate.sub.trim(),
      companyId: candidate.companyId ? candidate.companyId.trim() : null,
      iat: candidate.iat,
      exp: candidate.exp,
    },
  };
}

function stripControlCharacters(value: string, allowTabAndNewlines: boolean): string {
  let result = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    const isAllowed = allowTabAndNewlines && (code === 0x09 || code === 0x0a || code === 0x0d);
    const isControl = (code >= 0x00 && code <= 0x1f) || code === 0x7f;
    if (!isControl || isAllowed) {
      result += ch;
    }
  }
  return result;
}

/**
 * Escapes RFC 5545 TEXT values and strips unsafe control characters to prevent ICS property injection.
 */
export function escapeIcsText(value: string): string {
  const withoutUnsafeControl = stripControlCharacters(value, true);
  return withoutUnsafeControl
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function sanitizeIcsUri(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const cleaned = stripControlCharacters(rawUrl, false).trim();
  if (!cleaned) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Folds an ICS content line to <= 75 UTF-8 octets per RFC 5545 Section 3.1
 * without splitting multi-byte Unicode characters.
 */
export function foldIcsLine(line: string, maxOctets = 75): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const lines: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const limit = lines.length === 0 ? maxOctets : maxOctets - 1; // continuation line has leading space
    if (currentBytes + chBytes > limit && current.length > 0) {
      lines.push(current);
      current = ch;
      currentBytes = chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.map((part, idx) => (idx === 0 ? part : ` ${part}`)).join("\r\n");
}

export function formatIcsDateUtc(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid Date passed to formatIcsDateUtc");
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
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
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = Number(part.value);
    }
  }
  const zonedAsUtc = Date.UTC(
    map.year,
    (map.month || 1) - 1,
    map.day || 1,
    map.hour === 24 ? 0 : map.hour || 0,
    map.minute || 0,
    map.second || 0,
  );
  return zonedAsUtc - utcMs;
}

function wallClockToUtcDate(
  dateStr: string,
  timeStr: string,
  timeZone?: string | null,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec((timeStr || "09:00:00").trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");

  const wallUtcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(wallUtcGuess)) return null;

  const zone = timeZone?.trim();
  if (!zone) {
    return new Date(wallUtcGuess);
  }

  try {
    const firstOffset = getTimeZoneOffsetMs(wallUtcGuess, zone);
    const refined = wallUtcGuess - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(refined, zone);
    return new Date(wallUtcGuess - secondOffset);
  } catch {
    // Unknown/invalid IANA timezone falls back to UTC cleanly
    return new Date(wallUtcGuess);
  }
}

export function resolveInterviewWindow(
  interview: CalendarInterviewRecord,
  defaultDurationMinutes = DEFAULT_DURATION_MINUTES,
): { start: Date; end: Date } | null {
  let start: Date | null = null;

  if (interview.starts_at) {
    const parsed = new Date(interview.starts_at);
    if (Number.isFinite(parsed.getTime())) {
      start = parsed;
    }
  }

  if (!start && interview.date) {
    start = wallClockToUtcDate(interview.date, interview.time || "09:00:00", interview.time_zone);
  }

  if (!start || !Number.isFinite(start.getTime())) {
    return null;
  }

  const rawDuration = typeof interview.duration_minutes === "number" &&
      Number.isFinite(interview.duration_minutes) &&
      interview.duration_minutes > 0
    ? interview.duration_minutes
    : defaultDurationMinutes;
  const clampedDuration = Math.max(MIN_DURATION_MINUTES, Math.min(MAX_DURATION_MINUTES, rawDuration));
  const end = new Date(start.getTime() + clampedDuration * 60_000);
  return { start, end };
}

export function isCancelledOrCompletedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return EXCLUDED_STATUSES.has(status.trim().toLowerCase());
}

export function filterUpcomingInterviews(
  interviews: CalendarInterviewRecord[],
  now = new Date(),
  defaultDurationMinutes = DEFAULT_DURATION_MINUTES,
): CalendarInterviewRecord[] {
  const nowMs = now.getTime();
  const withWindows = interviews
    .filter((row) => !isCancelledOrCompletedStatus(row.status))
    .map((row) => ({ row, window: resolveInterviewWindow(row, defaultDurationMinutes) }))
    .filter((item): item is { row: CalendarInterviewRecord; window: { start: Date; end: Date } } =>
      item.window !== null && item.window.end.getTime() >= nowMs
    );

  withWindows.sort((a, b) => a.window.start.getTime() - b.window.start.getTime());
  return withWindows.map((item) => item.row);
}

function sanitizeUidPart(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "");
  return cleaned || "event";
}

export function buildIcsFeed(
  interviews: CalendarInterviewRecord[],
  options: BuildIcsFeedOptions = {},
): string {
  const now = options.now && Number.isFinite(options.now.getTime()) ? options.now : new Date();
  const defaultDuration = options.defaultDurationMinutes ?? DEFAULT_DURATION_MINUTES;
  const prodId = options.prodId || "-//Tawzeef-X//Interview Calendar Feed//EN";
  const calName = options.calendarName ||
    (options.companyName
      ? `Tawzeef-X Interviews - ${options.companyName}`
      : "Tawzeef-X Interviews");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${escapeIcsText(prodId)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const interview of interviews) {
    const window = resolveInterviewWindow(interview, defaultDuration);
    if (!window) continue;

    const updatedAt = interview.updated_at ? new Date(interview.updated_at) : now;
    const dtStamp = Number.isFinite(updatedAt.getTime()) ? updatedAt : now;
    const safeMeetingUrl = sanitizeIcsUri(interview.meeting_url);

    const summary = `Interview: ${interview.candidate_name} - ${interview.position}`;
    const descParts: string[] = [
      `Candidate: ${interview.candidate_name}`,
      `Position: ${interview.position}`,
    ];
    if (interview.type) descParts.push(`Format: ${interview.type}`);
    if (interview.interviewer) descParts.push(`Interviewer: ${interview.interviewer}`);
    if (interview.status) descParts.push(`Status: ${interview.status}`);
    if (safeMeetingUrl) descParts.push(`Meeting Link: ${safeMeetingUrl}`);
    if (interview.notes) descParts.push(`Notes: ${interview.notes}`);

    const location = safeMeetingUrl ||
      (interview.type === "عن بُعد" ? "Remote / عن بُعد" : interview.type || "Interview");
    const statusLower = (interview.status || "").trim().toLowerCase();
    const icsStatus = statusLower.includes("tentative") || statusLower.includes("مبدئ")
      ? "TENTATIVE"
      : "CONFIRMED";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:interview-${sanitizeUidPart(interview.id)}@tawzeefx.com`);
    lines.push(`DTSTAMP:${formatIcsDateUtc(dtStamp)}`);
    lines.push(`DTSTART:${formatIcsDateUtc(window.start)}`);
    lines.push(`DTEND:${formatIcsDateUtc(window.end)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join("\n"))}`);
    lines.push(`LOCATION:${escapeIcsText(location)}`);
    if (safeMeetingUrl) {
      lines.push(`URL:${safeMeetingUrl}`);
    }
    lines.push(`STATUS:${icsStatus}`);
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map((line) => foldIcsLine(line)).join("\r\n")}\r\n`;
}

interface CompanyRow {
  id: string;
  name?: string | null;
  status: string;
  parent_company_id?: string | null;
  owner_user_id?: string | null;
  user_id?: string | null;
}

interface MembershipRow {
  company_id: string;
  member_role?: string;
}

interface PlatformRoleRow {
  role: string;
}

interface UserRoleRow {
  role: string;
}

interface AuthorizedScopeResult {
  authorized: boolean;
  status: number;
  error?: string;
  code?: string;
  companyId: string | null;
  companyName?: string;
  isSuperAdmin?: boolean;
}

async function resolveAuthorizedCompanyScope(
  adminClient: MinimalSupabaseClient,
  userId: string,
  requestedCompanyId: string | null,
): Promise<AuthorizedScopeResult> {
  if (!isValidUuid(userId)) {
    return {
      authorized: false,
      status: 401,
      error: "Invalid user identifier",
      code: "INVALID_USER",
      companyId: null,
    };
  }

  if (requestedCompanyId !== null && !isValidUuid(requestedCompanyId)) {
    return {
      authorized: false,
      status: 400,
      error: "Invalid company identifier",
      code: "INVALID_COMPANY_ID",
      companyId: null,
    };
  }

  const { data: platformRole, error: platformErr } = await adminClient
    .from<PlatformRoleRow>("platform_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (platformErr) {
    return {
      authorized: false,
      status: 500,
      error: "Failed to verify platform authorization",
      code: "AUTH_LOOKUP_FAILED",
      companyId: null,
    };
  }

  const isSuperAdmin = platformRole?.role === "super_admin";

  if (requestedCompanyId) {
    const { data: company, error: compErr } = await adminClient
      .from<CompanyRow>("companies")
      .select("id, name, status, parent_company_id, owner_user_id, user_id")
      .eq("id", requestedCompanyId)
      .maybeSingle();

    if (compErr || !company) {
      return {
        authorized: false,
        status: 403,
        error: "Tenant company not found or permanently deleted",
        code: "COMPANY_NOT_FOUND",
        companyId: null,
      };
    }

    if (company.status !== "active") {
      return {
        authorized: false,
        status: 403,
        error: `Tenant company is ${company.status}`,
        code: `COMPANY_${(company.status || "inactive").toUpperCase()}`,
        companyId: null,
      };
    }

    if (isSuperAdmin) {
      return {
        authorized: true,
        status: 200,
        companyId: company.id,
        companyName: company.name || undefined,
        isSuperAdmin: true,
      };
    }

    const validCompanyIds = [company.id];
    if (company.parent_company_id) validCompanyIds.push(company.parent_company_id);

    const { data: membership, error: memberErr } = await adminClient
      .from<MembershipRow>("company_members")
      .select("company_id, member_role")
      .eq("user_id", userId)
      .in("company_id", validCompanyIds)
      .maybeSingle();

    if (memberErr) {
      return {
        authorized: false,
        status: 500,
        error: "Failed to verify company membership",
        code: "MEMBERSHIP_LOOKUP_FAILED",
        companyId: null,
      };
    }

    const isOwner = company.owner_user_id === userId || company.user_id === userId;
    if (!membership && !isOwner) {
      return {
        authorized: false,
        status: 403,
        error: "User is not a member of the requested company",
        code: "TENANT_ACCESS_DENIED",
        companyId: null,
      };
    }

    return {
      authorized: true,
      status: 200,
      companyId: company.id,
      companyName: company.name || undefined,
    };
  }

  // No explicit companyId requested: locate active membership or owned company
  const { data: memberships, error: membershipsErr } = await adminClient
    .from<MembershipRow>("company_members")
    .select("company_id, member_role")
    .eq("user_id", userId);

  if (membershipsErr) {
    return {
      authorized: false,
      status: 500,
      error: "Failed to resolve tenant membership",
      code: "MEMBERSHIP_LOOKUP_FAILED",
      companyId: null,
    };
  }

  const memberCompanyIds = (memberships || []).map((m) => m.company_id).filter(isValidUuid);
  if (memberCompanyIds.length > 0) {
    const { data: activeCompanies, error: compListErr } = await adminClient
      .from<CompanyRow>("companies")
      .select("id, name, status")
      .in("id", memberCompanyIds)
      .eq("status", "active")
      .limit(1);

    if (compListErr) {
      return {
        authorized: false,
        status: 500,
        error: "Failed to verify company status",
        code: "COMPANY_LOOKUP_FAILED",
        companyId: null,
      };
    }

    if (activeCompanies && activeCompanies.length > 0) {
      return {
        authorized: true,
        status: 200,
        companyId: activeCompanies[0].id,
        companyName: activeCompanies[0].name || undefined,
        isSuperAdmin,
      };
    }
  }

  const { data: ownedCompanies, error: ownedErr } = await adminClient
    .from<CompanyRow>("companies")
    .select("id, name, status")
    .eq("status", "active")
    .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
    .limit(1);

  if (ownedErr) {
    return {
      authorized: false,
      status: 500,
      error: "Failed to verify owned companies",
      code: "COMPANY_LOOKUP_FAILED",
      companyId: null,
    };
  }

  if (ownedCompanies && ownedCompanies.length > 0) {
    return {
      authorized: true,
      status: 200,
      companyId: ownedCompanies[0].id,
      companyName: ownedCompanies[0].name || undefined,
      isSuperAdmin,
    };
  }

  if (isSuperAdmin) {
    return {
      authorized: true,
      status: 200,
      companyId: null,
      isSuperAdmin: true,
    };
  }

  // Reject candidates/job_seekers or users without any active company membership
  const { data: userRole } = await adminClient
    .from<UserRoleRow>("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    authorized: false,
    status: 403,
    error: userRole?.role === "job_seeker"
      ? "Calendar subscription feed is restricted to company recruiters and hiring managers"
      : "User does not belong to any active company",
    code: "TENANT_ACCESS_DENIED",
    companyId: null,
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function loadRuntimeDeps(): Promise<CalendarFeedRuntimeDeps> {
  const [{ createClient }, { getCorsHeaders }] = await Promise.all([
    import(/* @vite-ignore */ "https://esm.sh/@supabase/supabase-js@2.95.3"),
    import("../_shared/cors.ts"),
  ]);
  const denoRuntime = getDenoRuntime();
  return {
    createClient: createClient as unknown as CalendarFeedRuntimeDeps["createClient"],
    getCorsHeaders,
    getEnv: (key: string) => denoRuntime?.env.get(key),
    now: () => new Date(),
  };
}

export async function handleCalendarFeedRequest(
  req: Request,
  overrideDeps?: CalendarFeedRuntimeDeps,
): Promise<Response> {
  const deps = overrideDeps ?? await loadRuntimeDeps();
  const corsHeaders = deps.getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = deps.getEnv("SUPABASE_URL") || "";
  const anonKey = deps.getEnv("SUPABASE_ANON_KEY") || deps.getEnv("SUPABASE_PUBLISHABLE_KEY") || "";
  const publishableKey = deps.getEnv("SUPABASE_PUBLISHABLE_KEY") || "";
  const serviceKey = deps.getEnv("SUPABASE_SERVICE_ROLE_KEY") || "";
  const feedSecret = deps.getEnv("CALENDAR_FEED_SECRET")?.trim() || "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server configuration missing" }, 500, corsHeaders);
  }

  const adminClient = deps.createClient(supabaseUrl, serviceKey);
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const hasNonServiceBearer = Boolean(
    bearerToken &&
      bearerToken !== anonKey &&
      bearerToken !== publishableKey &&
      bearerToken !== serviceKey,
  );

  // POST: Mint a signed .ics subscription URL for the authenticated company user
  if (req.method === "POST") {
    if (!hasNonServiceBearer) {
      return jsonResponse({ error: "Authentication required" }, 401, corsHeaders);
    }
    if (!feedSecret) {
      return jsonResponse({ error: "CALENDAR_FEED_SECRET is not configured" }, 503, corsHeaders);
    }

    const authClient = deps.createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(bearerToken);
    if (authError || !user || user.is_anonymous) {
      return jsonResponse({ error: "Invalid or expired authorization token" }, 401, corsHeaders);
    }

    let requestedCompanyId: string | null = req.headers.get("X-Company-ID")?.trim() || null;
    let ttlSeconds: number | undefined;
    try {
      const bodyText = await req.text();
      if (bodyText.trim()) {
        const body = JSON.parse(bodyText) as { companyId?: unknown; ttlSeconds?: unknown };
        if (typeof body.companyId === "string" && body.companyId.trim()) {
          requestedCompanyId = body.companyId.trim();
        }
        if (typeof body.ttlSeconds === "number" && Number.isFinite(body.ttlSeconds)) {
          ttlSeconds = body.ttlSeconds;
        }
      }
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400, corsHeaders);
    }

    const scope = await resolveAuthorizedCompanyScope(adminClient, user.id, requestedCompanyId);
    if (!scope.authorized) {
      return jsonResponse({ error: scope.error || "Forbidden", code: scope.code }, scope.status, corsHeaders);
    }

    const nowSeconds = Math.floor((deps.now?.() ?? new Date()).getTime() / 1000);
    const signedToken = await signCalendarFeedToken(
      { sub: user.id, companyId: scope.companyId, ttlSeconds, nowSeconds },
      feedSecret,
    );
    const verification = await verifyCalendarFeedToken(signedToken, feedSecret, nowSeconds);
    const feedUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/calendar-ics-feed?token=${encodeURIComponent(signedToken)}`;

    return jsonResponse(
      {
        token: signedToken,
        feedUrl,
        companyId: scope.companyId,
        companyName: scope.companyName || null,
        expiresAt: verification.payload
          ? new Date(verification.payload.exp * 1000).toISOString()
          : null,
      },
      200,
      corsHeaders,
    );
  }

  // GET / HEAD: Render RFC 5545 .ics calendar feed
  const reqUrl = new URL(req.url);
  const queryToken = reqUrl.searchParams.get("token")?.trim() || "";
  const queryCompanyId = reqUrl.searchParams.get("companyId")?.trim() ||
    req.headers.get("X-Company-ID")?.trim() ||
    null;

  let authenticatedUserId = "";
  let targetCompanyId: string | null = queryCompanyId;

  if (hasNonServiceBearer) {
    const authClient = deps.createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(bearerToken);
    if (authError || !user || user.is_anonymous) {
      return jsonResponse({ error: "Invalid or expired authorization token" }, 401, corsHeaders);
    }
    authenticatedUserId = user.id;
  } else if (queryToken) {
    if (!feedSecret) {
      return jsonResponse({ error: "CALENDAR_FEED_SECRET is not configured" }, 503, corsHeaders);
    }
    const nowSeconds = Math.floor((deps.now?.() ?? new Date()).getTime() / 1000);
    const verified = await verifyCalendarFeedToken(queryToken, feedSecret, nowSeconds);
    if (!verified.valid || !verified.payload) {
      return jsonResponse(
        { error: "Invalid or expired calendar subscription token", reason: verified.reason },
        401,
        corsHeaders,
      );
    }
    if (queryCompanyId && queryCompanyId !== verified.payload.companyId) {
      return jsonResponse({ error: "Token company scope mismatch" }, 403, corsHeaders);
    }
    authenticatedUserId = verified.payload.sub;
    targetCompanyId = verified.payload.companyId;
  } else {
    return jsonResponse({ error: "Authentication required" }, 401, corsHeaders);
  }

  const scope = await resolveAuthorizedCompanyScope(adminClient, authenticatedUserId, targetCompanyId);
  if (!scope.authorized) {
    return jsonResponse({ error: scope.error || "Forbidden", code: scope.code }, scope.status, corsHeaders);
  }

  const now = deps.now?.() ?? new Date();
  // Look back 24h in DB query so timezone offsets near midnight aren't truncated prematurely
  const lookbackDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let interviewsQuery = adminClient
    .from<CalendarInterviewRecord>("interviews")
    .select(
      "id, candidate_name, position, date, time, starts_at, time_zone, duration_minutes, type, interviewer, meeting_url, notes, status, updated_at, company_id, user_id",
    );

  if (scope.companyId) {
    interviewsQuery = interviewsQuery.eq("company_id", scope.companyId);
  } else {
    interviewsQuery = interviewsQuery.eq("user_id", authenticatedUserId);
  }

  const { data: rows, error: queryError } = await interviewsQuery
    .gte("date", lookbackDate)
    .not("status", "in", '("ملغاة","ملغي","مكتملة","مكتمل","cancelled","canceled","completed","done")')
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(200);

  if (queryError) {
    return jsonResponse({ error: "Failed to load interviews" }, 500, corsHeaders);
  }

  const upcoming = filterUpcomingInterviews(rows || [], now);
  const icsContent = buildIcsFeed(upcoming, {
    companyName: scope.companyName,
    now,
  });

  return new Response(req.method === "HEAD" ? null : icsContent, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tawzeefx-interviews.ics"',
      "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const denoRuntime = getDenoRuntime();
const isEntrypoint = Boolean((import.meta as { main?: boolean }).main);
if (denoRuntime && isEntrypoint) {
  denoRuntime.serve((req: Request) => handleCalendarFeedRequest(req));
}
