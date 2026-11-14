import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

export type OutboundActionType = "send_email" | "send_whatsapp" | "send_sms" | "trigger_webhook";
export type QueueItemStatus = "pending" | "dispatched" | "failed" | "skipped_unconfigured";

export interface QueueItemRow {
  id: string;
  company_id: string;
  rule_id: string | null;
  log_id: string | null;
  candidate_id: string | null;
  action_type: OutboundActionType;
  action_index: number;
  payload: Record<string, unknown>;
  status: QueueItemStatus;
  attempt_count: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
}

interface CompanyRow {
  id: string;
  name: string;
  name_en: string | null;
  contact_email: string | null;
  owner_user_id: string | null;
  user_id: string | null;
  parent_company_id: string | null;
  status: string;
}

interface CandidateRow {
  id: string;
  company_id: string | null;
  job_id: string | null;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  stage: string | null;
  status: string;
  ai_score: number | null;
  tracking_code: string | null;
}

interface JobRow {
  id: string;
  company_id: string | null;
  title: string;
  department: string | null;
  location: string | null;
}

interface RuleActionEntry {
  type: string;
  payload: Record<string, unknown>;
}

interface AutomationRuleRow {
  id: string;
  company_id: string;
  title: string;
  trigger_event: string;
  actions: RuleActionEntry[];
  is_active: boolean;
  created_by: string | null;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface QueryChain<T> extends PromiseLike<QueryResult<T>> {
  select(columns: string): QueryChain<T>;
  eq(column: string, value: string): QueryChain<T>;
  in(column: string, values: string[]): QueryChain<T>;
  maybeSingle(): Promise<QueryResult<T>>;
  single(): Promise<QueryResult<T>>;
}

interface InsertChain<T> {
  select(columns?: string): QueryChain<T>;
  then: PromiseLike<QueryResult<T>>["then"];
}

export interface RuntimeAdminClient {
  auth: {
    getUser(token: string): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: { message: string } | null }>;
    admin: {
      getUserById(userId: string): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: { message: string } | null }>;
    };
  };
  from(table: string): {
    select(columns: string): QueryChain<unknown>;
    insert(values: Record<string, unknown>): InsertChain<unknown>;
  };
  rpc(fn: string, args?: Record<string, unknown>): Promise<QueryResult<unknown>>;
}

export type DnsResolver = (hostname: string, recordType: "A" | "AAAA") => Promise<string[]>;
export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface RuntimeDeps {
  getEnv?: (key: string) => string | undefined;
  createSupabaseClient?: (url: string, key: string) => RuntimeAdminClient;
  fetcher?: FetchFn;
  resolveDns?: DnsResolver;
}

export interface WebhookUrlValidationResult {
  valid: boolean;
  url?: URL;
  reason?: string;
}

export interface ActionExecutionResult {
  queueId: string;
  actionType: OutboundActionType;
  status: QueueItemStatus;
  code: string;
  error?: string;
}

interface DenoGlobalShape {
  env?: { get(key: string): string | undefined };
  resolveDns?: DnsResolver;
  serve?: (handler: (req: Request) => Promise<Response> | Response) => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDenoGlobal(): DenoGlobalShape | undefined {
  return (globalThis as { Deno?: DenoGlobalShape }).Deno;
}

function defaultGetEnv(key: string): string | undefined {
  return getDenoGlobal()?.env?.get(key);
}

function defaultResolveDns(): DnsResolver | undefined {
  const resolveFn = getDenoGlobal()?.resolveDns;
  return typeof resolveFn === "function" ? resolveFn.bind(getDenoGlobal()) : undefined;
}

function defaultCreateClient(url: string, key: string): RuntimeAdminClient {
  return createClient(url, key) as unknown as RuntimeAdminClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchWithTimeout(
  fetcher: FetchFn,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return await fetcher(input, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function escapeHtml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>,
  htmlEscape = false,
): string {
  let rendered = template;
  for (const [key, rawValue] of Object.entries(variables)) {
    const safeVal = htmlEscape ? escapeHtml(rawValue) : rawValue;
    rendered = rendered.split(`{{${key}}}`).join(safeVal);
    rendered = rendered.split(`{${key}}`).join(safeVal);
  }
  return rendered;
}

export function formatEmailHtmlBody(
  rawBody: string,
  variables: Record<string, string>,
): string {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(rawBody);
  if (looksLikeHtml) {
    return renderTemplate(rawBody, variables, true);
  }
  const escapedBody = escapeHtml(rawBody);
  const withPlaceholders = renderTemplate(escapedBody, variables, true);
  const htmlParagraphs = withPlaceholders.replace(/\r?\n/g, "<br />");
  return `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.7; color: #1f2937;">${htmlParagraphs}</div>`;
}

export function normalizeWhatsappPhone(raw: string): string | null {
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (!/^[0-9]{7,15}$/.test(digits)) {
    return null;
  }
  return digits;
}

export async function computeHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseIpv4Octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const num = Number(part);
    if (num < 0 || num > 255) return null;
    octets.push(num);
  }
  return octets;
}

function isPrivateOrReservedIpv4Octets(octets: number[]): boolean {
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved/broadcast
  return false;
}

function expandIpv6(rawIp: string): number[] | null {
  const noZone = rawIp.split("%")[0].toLowerCase();
  if (!noZone.includes(":")) return null;

  const doubleColonParts = noZone.split("::");
  if (doubleColonParts.length > 2) return null;

  const parseSide = (side: string): number[] | null => {
    if (!side) return [];
    const tokens = side.split(":");
    const groups: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.includes(".")) {
        if (i !== tokens.length - 1) return null;
        const ipv4 = parseIpv4Octets(token);
        if (!ipv4) return null;
        groups.push((ipv4[0] << 8) | ipv4[1]);
        groups.push((ipv4[2] << 8) | ipv4[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(token)) return null;
        groups.push(parseInt(token, 16));
      }
    }
    return groups;
  };

  const left = parseSide(doubleColonParts[0]);
  if (!left) return null;

  if (doubleColonParts.length === 1) {
    return left.length === 8 ? left : null;
  }

  const right = parseSide(doubleColonParts[1]);
  if (!right) return null;

  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;

  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4Octets(cleaned);
  if (ipv4) {
    return isPrivateOrReservedIpv4Octets(ipv4);
  }

  const ipv6 = expandIpv6(cleaned);
  if (!ipv6) {
    return true; // Fail closed if IP cannot be parsed safely.
  }

  const firstSixZero = ipv6.slice(0, 6).every((g) => g === 0);
  if (firstSixZero && ipv6[6] === 0 && (ipv6[7] === 0 || ipv6[7] === 1)) {
    return true; // :: and ::1
  }

  // IPv4-mapped (::ffff:0:0/96) or IPv4-compatible (::/96)
  if ((ipv6.slice(0, 5).every((g) => g === 0) && ipv6[5] === 0xffff) || firstSixZero) {
    const embedded = [
      (ipv6[6] >> 8) & 0xff,
      ipv6[6] & 0xff,
      (ipv6[7] >> 8) & 0xff,
      ipv6[7] & 0xff,
    ];
    return isPrivateOrReservedIpv4Octets(embedded);
  }

  // NAT64 (64:ff9b::/96 or 64:ff9b:1::/48)
  if (ipv6[0] === 0x0064 && ipv6[1] === 0xff9b) {
    return true;
  }

  const g0 = ipv6[0];
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-Local
  if ((g0 & 0xffc0) === 0xfec0) return true; // fec0::/10 Deprecated Site-Local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 Multicast
  if (g0 === 0x0100 && ipv6[1] === 0 && ipv6[2] === 0 && ipv6[3] === 0) return true; // 100::/64 Discard
  if (g0 === 0x2001 && ipv6[1] === 0x0db8) return true; // 2001:db8::/32 Documentation

  return false;
}

function isIpLiteral(hostname: string): boolean {
  const unbracketed = hostname.replace(/^\[|\]$/g, "");
  return parseIpv4Octets(unbracketed) !== null || expandIpv6(unbracketed) !== null;
}

export async function validateWebhookUrl(
  rawUrl: string,
  resolveDnsFn?: DnsResolver,
): Promise<WebhookUrlValidationResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { valid: false, reason: "Webhook URL is missing or exceeds maximum length" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "Invalid webhook URL syntax" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "Webhook URL must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "Webhook URL must not contain embedded credentials" };
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const unbracketedHost = host.replace(/^\[|\]$/g, "");
  if (!unbracketedHost) {
    return { valid: false, reason: "Webhook URL hostname is empty" };
  }

  // Block integer, hex, or octal-obfuscated IPv4 labels.
  if (
    /^\d+$/.test(unbracketedHost) ||
    /^0x[0-9a-f]+$/i.test(unbracketedHost) ||
    unbracketedHost.split(".").some((label) => /^0x/i.test(label) || /^0[0-9]+$/.test(label))
  ) {
    return { valid: false, reason: "Obfuscated IP hostnames are not allowed" };
  }

  const blockedHosts = new Set([
    "localhost",
    "metadata",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
  ]);

  if (
    blockedHosts.has(unbracketedHost) ||
    unbracketedHost.endsWith(".localhost") ||
    unbracketedHost.endsWith(".local") ||
    unbracketedHost.endsWith(".internal") ||
    unbracketedHost.endsWith(".localdomain")
  ) {
    return { valid: false, reason: "Local or metadata hostnames are blocked" };
  }

  if (isIpLiteral(unbracketedHost)) {
    if (isPrivateOrReservedIp(unbracketedHost)) {
      return { valid: false, reason: "Private, loopback, or reserved IP addresses are blocked" };
    }
    return { valid: true, url: parsed };
  }

  // Perform DNS resolution when available to prevent DNS rebinding / internal CNAME SSRF.
  if (resolveDnsFn) {
    const resolvedIps: string[] = [];
    for (const recordType of ["A", "AAAA"] as const) {
      try {
        const records = await resolveDnsFn(unbracketedHost, recordType);
        if (Array.isArray(records)) {
          for (const ip of records) {
            if (typeof ip === "string" && ip.trim()) {
              resolvedIps.push(ip.trim());
            }
          }
        }
      } catch {
        // Individual A or AAAA record type may not exist; evaluate combined records below.
      }
    }

    if (resolvedIps.length === 0) {
      return { valid: false, reason: "Webhook hostname could not be resolved via DNS" };
    }

    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        return { valid: false, reason: "Webhook hostname resolved to a private or reserved IP" };
      }
    }
  }

  return { valid: true, url: parsed };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildCandidateVariables(
  item: QueueItemRow,
  company: CompanyRow | null,
  candidate: CandidateRow | null,
  job: JobRow | null,
  rule: AutomationRuleRow | null,
): Record<string, string> {
  const snapshot = isRecord(item.payload.snapshot) ? item.payload.snapshot : {};
  const triggerEvent =
    typeof item.payload.trigger_event === "string"
      ? item.payload.trigger_event
      : rule?.trigger_event || "";
  const ruleTitle =
    typeof item.payload.rule_title === "string"
      ? item.payload.rule_title
      : rule?.title || "";

  const stageVal = candidate?.stage || (typeof snapshot.stage === "string" ? snapshot.stage : "");
  const statusVal = candidate?.status || (typeof snapshot.status === "string" ? snapshot.status : "");
  const aiScore =
    candidate?.ai_score != null
      ? String(candidate.ai_score)
      : typeof snapshot.ai_score === "number"
        ? String(snapshot.ai_score)
        : "";

  return {
    candidate_name: candidate?.name || "",
    candidate_email: candidate?.email || "",
    candidate_phone: candidate?.phone || "",
    stage: stageVal,
    stage_name: stageVal,
    status: statusVal,
    job_title: job?.title || candidate?.role || "",
    department: job?.department || "",
    location: job?.location || "",
    company_name: company?.name || "",
    tracking_code: candidate?.tracking_code || "",
    ai_score: aiScore,
    rule_title: ruleTitle,
    trigger_event: triggerEvent,
  };
}

async function completeQueueItem(
  adminClient: RuntimeAdminClient,
  queueId: string,
  status: QueueItemStatus,
  lastError: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  const { error } = await adminClient.rpc("complete_automation_outbound_item", {
    _queue_id: queueId,
    _status: status,
    _last_error: lastError,
    _details: details,
  });
  if (error) {
    console.error(`Failed completing automation_outbound_queue item ${queueId}:`, error.message);
  }
}

async function loadExecutionContext(
  adminClient: RuntimeAdminClient,
  item: QueueItemRow,
): Promise<{
  company: CompanyRow | null;
  candidate: CandidateRow | null;
  job: JobRow | null;
  rule: AutomationRuleRow | null;
}> {
  const [companyRes, candidateRes, ruleRes] = await Promise.all([
    adminClient
      .from("companies")
      .select("id, name, name_en, contact_email, owner_user_id, user_id, parent_company_id, status")
      .eq("id", item.company_id)
      .maybeSingle(),
    item.candidate_id
      ? adminClient
          .from("candidates")
          .select("id, company_id, job_id, user_id, name, email, phone, role, stage, status, ai_score, tracking_code")
          .eq("id", item.candidate_id)
          .eq("company_id", item.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    item.rule_id
      ? adminClient
          .from("automation_rules")
          .select("id, company_id, title, trigger_event, actions, is_active, created_by")
          .eq("id", item.rule_id)
          .eq("company_id", item.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const company = (companyRes.data as CompanyRow | null) || null;
  const candidate = (candidateRes.data as CandidateRow | null) || null;
  const rule = (ruleRes.data as AutomationRuleRow | null) || null;

  const snapshot = isRecord(item.payload.snapshot) ? item.payload.snapshot : {};
  const jobId =
    candidate?.job_id ||
    (typeof snapshot.job_id === "string" && UUID_REGEX.test(snapshot.job_id) ? snapshot.job_id : null);

  let job: JobRow | null = null;
  if (jobId) {
    const jobRes = await adminClient
      .from("jobs")
      .select("id, company_id, title, department, location")
      .eq("id", jobId)
      .eq("company_id", item.company_id)
      .maybeSingle();
    job = (jobRes.data as JobRow | null) || null;
  }

  return { company, candidate, job, rule };
}

async function processWebhookItem(
  adminClient: RuntimeAdminClient,
  item: QueueItemRow,
  context: { company: CompanyRow | null; candidate: CandidateRow | null; job: JobRow | null; rule: AutomationRuleRow | null },
  fetcher: FetchFn,
  resolveDnsFn: DnsResolver | undefined,
): Promise<ActionExecutionResult> {
  const actionPayload = isRecord(item.payload.action_payload) ? item.payload.action_payload : item.payload;
  const rawUrl = typeof actionPayload.url === "string" ? actionPayload.url.trim() : "";
  const eventName =
    typeof actionPayload.event_name === "string" && actionPayload.event_name.trim()
      ? actionPayload.event_name.trim()
      : typeof item.payload.trigger_event === "string" && item.payload.trigger_event.trim()
        ? item.payload.trigger_event.trim()
        : context.rule?.trigger_event || "automation.triggered";

  const deliveryUserId =
    context.rule?.created_by ||
    context.company?.owner_user_id ||
    context.company?.user_id ||
    context.candidate?.user_id ||
    null;

  const timestamp = new Date().toISOString();
  const webhookPayload: Record<string, unknown> = {
    event: eventName,
    timestamp,
    company_id: item.company_id,
    rule_id: item.rule_id,
    log_id: item.log_id,
    data: {
      candidate_id: context.candidate?.id || item.candidate_id || null,
      candidate_name: context.candidate?.name || null,
      candidate_email: context.candidate?.email || null,
      candidate_phone: context.candidate?.phone || null,
      stage: context.candidate?.stage || null,
      status: context.candidate?.status || null,
      job_id: context.job?.id || context.candidate?.job_id || null,
      job_title: context.job?.title || context.candidate?.role || null,
      ai_score: context.candidate?.ai_score ?? null,
      tracking_code: context.candidate?.tracking_code || null,
    },
  };

  const urlCheck = await validateWebhookUrl(rawUrl, resolveDnsFn);
  if (!urlCheck.valid || !urlCheck.url) {
    const blockedReason = urlCheck.reason || "Blocked webhook URL";
    await adminClient.from("webhook_deliveries").insert({
      company_id: item.company_id,
      rule_id: item.rule_id,
      queue_id: item.id,
      endpoint_id: null,
      user_id: deliveryUserId,
      event_type: eventName,
      payload: webhookPayload,
      status: "failed",
      status_code: null,
      response_body: null,
      error_message: `WEBHOOK_URL_BLOCKED: ${blockedReason}`,
    });

    await completeQueueItem(adminClient, item.id, "failed", `WEBHOOK_URL_BLOCKED: ${blockedReason}`, {
      code: "webhook_url_blocked",
    });

    return {
      queueId: item.id,
      actionType: "trigger_webhook",
      status: "failed",
      code: "webhook_url_blocked",
      error: blockedReason,
    };
  }

  // Prefer reading HMAC secret from the authoritative rule definition rather than queue payload.
  let hmacSecret = "";
  const ruleAction = context.rule?.actions?.[item.action_index];
  if (ruleAction && isRecord(ruleAction.payload)) {
    if (typeof ruleAction.payload.secret === "string") {
      hmacSecret = ruleAction.payload.secret;
    } else if (typeof ruleAction.payload.hmac_secret === "string") {
      hmacSecret = ruleAction.payload.hmac_secret;
    }
  }
  if (!hmacSecret) {
    if (typeof actionPayload.secret === "string") {
      hmacSecret = actionPayload.secret;
    } else if (typeof actionPayload.hmac_secret === "string") {
      hmacSecret = actionPayload.hmac_secret;
    }
  }

  const payloadString = JSON.stringify(webhookPayload);
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tawzeef-Timestamp": timestamp,
    "X-Tawzeef-Event": eventName,
    "User-Agent": "TawzeefX-Automation-Runtime/1.0",
  };

  if (hmacSecret) {
    const signature = await computeHmacSignature(hmacSecret, payloadString);
    requestHeaders["X-Tawzeef-Signature"] = `sha256=${signature}`;
  }

  let succeeded = false;
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetchWithTimeout(
      fetcher,
      urlCheck.url.toString(),
      {
        method: "POST",
        headers: requestHeaders,
        body: payloadString,
        redirect: "manual",
      },
      10000,
    );

    statusCode = response.status;
    responseBody = (await response.text().catch(() => "")).slice(0, 2000) || null;

    if (response.status >= 300 && response.status < 400) {
      succeeded = false;
      errorMessage = `HTTP ${statusCode}: Redirect blocked for SSRF safety`;
    } else if (!response.ok) {
      succeeded = false;
      errorMessage = `HTTP ${statusCode}`;
    } else {
      succeeded = true;
    }
  } catch (err: unknown) {
    succeeded = false;
    errorMessage = err instanceof Error ? err.message : "Webhook request failed";
  }

  const { error: deliveryErr } = await adminClient.from("webhook_deliveries").insert({
    company_id: item.company_id,
    rule_id: item.rule_id,
    queue_id: item.id,
    endpoint_id: null,
    user_id: deliveryUserId,
    event_type: eventName,
    payload: webhookPayload,
    status: succeeded ? "success" : "failed",
    status_code: statusCode,
    response_body: responseBody,
    error_message: errorMessage,
  });
  if (deliveryErr) {
    console.warn("Failed recording webhook_deliveries:", deliveryErr.message);
  }

  const finalStatus: QueueItemStatus = succeeded ? "dispatched" : "failed";
  const finalCode = succeeded ? "completed" : "webhook_delivery_failed";
  await completeQueueItem(adminClient, item.id, finalStatus, errorMessage, {
    code: finalCode,
    status_code: statusCode,
  });

  return {
    queueId: item.id,
    actionType: "trigger_webhook",
    status: finalStatus,
    code: finalCode,
    ...(errorMessage ? { error: errorMessage } : {}),
  };
}

async function processEmailItem(
  adminClient: RuntimeAdminClient,
  item: QueueItemRow,
  context: { company: CompanyRow | null; candidate: CandidateRow | null; job: JobRow | null; rule: AutomationRuleRow | null },
  supabaseUrl: string,
  serviceKey: string,
  fetcher: FetchFn,
): Promise<ActionExecutionResult> {
  const actionPayload = isRecord(item.payload.action_payload) ? item.payload.action_payload : item.payload;
  const recipientType =
    typeof actionPayload.recipient_type === "string" && actionPayload.recipient_type.trim()
      ? actionPayload.recipient_type.trim()
      : "candidate";

  let recipientEmail = "";
  const senderUserId =
    context.rule?.created_by ||
    context.company?.owner_user_id ||
    context.company?.user_id ||
    context.candidate?.user_id ||
    undefined;

  if (recipientType === "custom") {
    recipientEmail =
      typeof actionPayload.to_email === "string"
        ? actionPayload.to_email.trim()
        : typeof actionPayload.to === "string"
          ? actionPayload.to.trim()
          : "";
  } else if (recipientType === "recruiter") {
    if (senderUserId) {
      const { data: userLookup } = await adminClient.auth.admin.getUserById(senderUserId);
      recipientEmail = userLookup?.user?.email?.trim() || "";
    }
    if (!recipientEmail && context.company?.contact_email) {
      recipientEmail = context.company.contact_email.trim();
    }
  } else {
    recipientEmail = context.candidate?.email?.trim() || "";
  }

  if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
    const errMsg = "EMAIL_RECIPIENT_MISSING: No valid recipient email address";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "email_recipient_missing",
    });
    return {
      queueId: item.id,
      actionType: "send_email",
      status: "failed",
      code: "email_recipient_missing",
      error: errMsg,
    };
  }

  const variables = buildCandidateVariables(item, context.company, context.candidate, context.job, context.rule);
  const rawSubject = typeof actionPayload.subject === "string" ? actionPayload.subject : "";
  const rawBody =
    typeof actionPayload.body_html === "string"
      ? actionPayload.body_html
      : typeof actionPayload.body === "string"
        ? actionPayload.body
        : typeof actionPayload.html === "string"
          ? actionPayload.html
          : "";

  const emailType =
    typeof actionPayload.email_type === "string" && actionPayload.email_type.trim()
      ? actionPayload.email_type.trim()
      : "hiring";

  const subject = renderTemplate(rawSubject, variables, false).replace(/[\r\n]+/g, " ").trim();
  const html = rawBody ? formatEmailHtmlBody(rawBody, variables) : "";

  if (!subject || !html) {
    const errMsg = "EMAIL_TEMPLATE_INCOMPLETE: Missing subject or body";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "invalid_action",
    });
    return {
      queueId: item.id,
      actionType: "send_email",
      status: "failed",
      code: "invalid_action",
      error: errMsg,
    };
  }

  try {
    const resp = await fetchWithTimeout(
      fetcher,
      `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          html,
          user_id: senderUserId,
          email_type: emailType,
          variables,
        }),
      },
      15000,
    );

    if (!resp.ok) {
      const text = (await resp.text().catch(() => "")).slice(0, 300);
      const errMsg = `EMAIL_DELIVERY_FAILED: HTTP ${resp.status}${text ? ` - ${text}` : ""}`;
      await completeQueueItem(adminClient, item.id, "failed", errMsg, {
        code: "email_delivery_failed",
        status_code: resp.status,
      });
      return {
        queueId: item.id,
        actionType: "send_email",
        status: "failed",
        code: "email_delivery_failed",
        error: errMsg,
      };
    }

    await completeQueueItem(adminClient, item.id, "dispatched", null, {
      code: "completed",
      recipient_type: recipientType,
    });

    return {
      queueId: item.id,
      actionType: "send_email",
      status: "dispatched",
      code: "completed",
    };
  } catch (err: unknown) {
    const errMsg = `EMAIL_DELIVERY_FAILED: ${err instanceof Error ? err.message : "Request failed"}`;
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "email_delivery_failed",
    });
    return {
      queueId: item.id,
      actionType: "send_email",
      status: "failed",
      code: "email_delivery_failed",
      error: errMsg,
    };
  }
}

async function processWhatsappItem(
  adminClient: RuntimeAdminClient,
  item: QueueItemRow,
  context: { company: CompanyRow | null; candidate: CandidateRow | null; job: JobRow | null; rule: AutomationRuleRow | null },
  getEnv: (key: string) => string | undefined,
  fetcher: FetchFn,
): Promise<ActionExecutionResult> {
  const waToken = (getEnv("WHATSAPP_ACCESS_TOKEN") || "").trim();
  const waPhoneNumberId = (getEnv("WHATSAPP_PHONE_NUMBER_ID") || "").trim();
  const waApiVersion = (getEnv("WHATSAPP_API_VERSION") || "v21.0").trim();

  // Never fake WhatsApp delivery when Meta Cloud API secrets are absent.
  if (!waToken || !waPhoneNumberId) {
    await completeQueueItem(
      adminClient,
      item.id,
      "skipped_unconfigured",
      "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      {
        code: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
        provider: "meta_whatsapp_cloud_api",
      },
    );
    return {
      queueId: item.id,
      actionType: "send_whatsapp",
      status: "skipped_unconfigured",
      code: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      error: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
    };
  }

  const actionPayload = isRecord(item.payload.action_payload) ? item.payload.action_payload : item.payload;
  const recipientType =
    typeof actionPayload.recipient_type === "string" && actionPayload.recipient_type.trim()
      ? actionPayload.recipient_type.trim()
      : "candidate";

  const rawPhone =
    recipientType === "custom"
      ? typeof actionPayload.to_phone === "string"
        ? actionPayload.to_phone
        : typeof actionPayload.phone === "string"
          ? actionPayload.phone
          : ""
      : context.candidate?.phone || "";

  const normalizedPhone = normalizeWhatsappPhone(rawPhone);
  if (!normalizedPhone) {
    const errMsg = "WHATSAPP_RECIPIENT_MISSING: No valid recipient phone number";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "whatsapp_recipient_missing",
    });
    return {
      queueId: item.id,
      actionType: "send_whatsapp",
      status: "failed",
      code: "whatsapp_recipient_missing",
      error: errMsg,
    };
  }

  const variables = buildCandidateVariables(item, context.company, context.candidate, context.job, context.rule);
  const templateName = typeof actionPayload.template_name === "string" ? actionPayload.template_name.trim() : "";
  const rawMessage = typeof actionPayload.message === "string" ? actionPayload.message : "";
  const renderedMessage = rawMessage ? renderTemplate(rawMessage, variables, false).trim() : "";

  let waRequestBody: Record<string, unknown>;
  if (templateName && !renderedMessage) {
    const languageCode =
      typeof actionPayload.template_language === "string" && actionPayload.template_language.trim()
        ? actionPayload.template_language.trim()
        : "ar";
    waRequestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
  } else if (renderedMessage) {
    waRequestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: renderedMessage,
      },
    };
  } else {
    const errMsg = "WHATSAPP_MESSAGE_MISSING: Missing message text or template_name";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "invalid_action",
    });
    return {
      queueId: item.id,
      actionType: "send_whatsapp",
      status: "failed",
      code: "invalid_action",
      error: errMsg,
    };
  }

  try {
    const endpoint = `https://graph.facebook.com/${encodeURIComponent(waApiVersion)}/${encodeURIComponent(waPhoneNumberId)}/messages`;
    const resp = await fetchWithTimeout(
      fetcher,
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${waToken}`,
        },
        body: JSON.stringify(waRequestBody),
      },
      15000,
    );

    if (!resp.ok) {
      const errBody = (await resp.text().catch(() => "")).slice(0, 300);
      const errMsg = `WHATSAPP_DELIVERY_FAILED: HTTP ${resp.status}${errBody ? ` - ${errBody}` : ""}`;
      await completeQueueItem(adminClient, item.id, "failed", errMsg, {
        code: "whatsapp_delivery_failed",
        status_code: resp.status,
      });
      return {
        queueId: item.id,
        actionType: "send_whatsapp",
        status: "failed",
        code: "whatsapp_delivery_failed",
        error: errMsg,
      };
    }

    const parsedBody = (await resp.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
    const messageId = parsedBody.messages?.[0]?.id || null;

    await completeQueueItem(adminClient, item.id, "dispatched", null, {
      code: "completed",
      provider: "meta_whatsapp_cloud_api",
      ...(messageId ? { message_id: messageId } : {}),
    });

    return {
      queueId: item.id,
      actionType: "send_whatsapp",
      status: "dispatched",
      code: "completed",
    };
  } catch (err: unknown) {
    const errMsg = `WHATSAPP_DELIVERY_FAILED: ${err instanceof Error ? err.message : "Request failed"}`;
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "whatsapp_delivery_failed",
    });
    return {
      queueId: item.id,
      actionType: "send_whatsapp",
      status: "failed",
      code: "whatsapp_delivery_failed",
      error: errMsg,
    };
  }
}

async function processSmsItem(
  adminClient: RuntimeAdminClient,
  item: QueueItemRow,
  context: { company: CompanyRow | null; candidate: CandidateRow | null; job: JobRow | null; rule: AutomationRuleRow | null },
  getEnv: (key: string) => string | undefined,
  fetcher: FetchFn,
): Promise<ActionExecutionResult> {
  const twilioSid = (getEnv("TWILIO_ACCOUNT_SID") || "").trim();
  const twilioToken = (getEnv("TWILIO_AUTH_TOKEN") || "").trim();
  const twilioFrom = (getEnv("TWILIO_FROM_NUMBER") || "").trim();
  const smsGatewayUrl = (getEnv("SMS_GATEWAY_URL") || "").trim();
  const smsGatewayToken = (getEnv("SMS_GATEWAY_TOKEN") || "").trim();

  const hasTwilio = Boolean(twilioSid && twilioToken && twilioFrom);
  const hasGateway = Boolean(smsGatewayUrl);

  // Never fake SMS delivery when gateway/provider credentials are absent.
  if (!hasTwilio && !hasGateway) {
    await completeQueueItem(
      adminClient,
      item.id,
      "skipped_unconfigured",
      "SMS_PROVIDER_NOT_CONFIGURED",
      {
        code: "SMS_PROVIDER_NOT_CONFIGURED",
        provider: "twilio_or_sms_gateway",
      },
    );
    return {
      queueId: item.id,
      actionType: "send_sms",
      status: "skipped_unconfigured",
      code: "SMS_PROVIDER_NOT_CONFIGURED",
      error: "SMS_PROVIDER_NOT_CONFIGURED",
    };
  }

  const actionPayload = isRecord(item.payload.action_payload) ? item.payload.action_payload : item.payload;
  const recipientType =
    typeof actionPayload.recipient_type === "string" && actionPayload.recipient_type.trim()
      ? actionPayload.recipient_type.trim()
      : "candidate";

  const rawPhone =
    recipientType === "custom"
      ? typeof actionPayload.to_phone === "string"
        ? actionPayload.to_phone
        : typeof actionPayload.phone === "string"
          ? actionPayload.phone
          : ""
      : context.candidate?.phone || "";

  const normalizedDigits = normalizeWhatsappPhone(rawPhone);
  if (!normalizedDigits) {
    const errMsg = "SMS_RECIPIENT_MISSING: No valid recipient phone number";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "sms_recipient_missing",
    });
    return {
      queueId: item.id,
      actionType: "send_sms",
      status: "failed",
      code: "sms_recipient_missing",
      error: errMsg,
    };
  }
  const e164Phone = `+${normalizedDigits}`;

  const variables = buildCandidateVariables(item, context.company, context.candidate, context.job, context.rule);
  const rawMessage = typeof actionPayload.message === "string" ? actionPayload.message : "";
  const renderedMessage = rawMessage ? renderTemplate(rawMessage, variables, false).trim() : "";

  if (!renderedMessage) {
    const errMsg = "SMS_MESSAGE_MISSING: Missing message text";
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "invalid_action",
    });
    return {
      queueId: item.id,
      actionType: "send_sms",
      status: "failed",
      code: "invalid_action",
      error: errMsg,
    };
  }

  try {
    let resp: Response;
    let providerName: string;

    if (hasTwilio) {
      providerName = "twilio";
      const formBody = new URLSearchParams({
        To: e164Phone,
        From: twilioFrom,
        Body: renderedMessage.slice(0, 1600),
      });
      const authHeader = btoa(`${twilioSid}:${twilioToken}`);
      resp = await fetchWithTimeout(
        fetcher,
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authHeader}`,
          },
          body: formBody.toString(),
        },
        15000,
      );
    } else {
      providerName = "sms_gateway";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (smsGatewayToken) {
        headers.Authorization = `Bearer ${smsGatewayToken}`;
      }
      resp = await fetchWithTimeout(
        fetcher,
        smsGatewayUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            to: e164Phone,
            message: renderedMessage.slice(0, 1600),
            company_id: item.company_id,
            candidate_id: context.candidate?.id || item.candidate_id || null,
          }),
        },
        15000,
      );
    }

    if (!resp.ok) {
      const errBody = (await resp.text().catch(() => "")).slice(0, 300);
      const errMsg = `SMS_DELIVERY_FAILED: HTTP ${resp.status}${errBody ? ` - ${errBody}` : ""}`;
      await completeQueueItem(adminClient, item.id, "failed", errMsg, {
        code: "sms_delivery_failed",
        provider: providerName,
        status_code: resp.status,
      });
      return {
        queueId: item.id,
        actionType: "send_sms",
        status: "failed",
        code: "sms_delivery_failed",
        error: errMsg,
      };
    }

    const parsedBody = (await resp.json().catch(() => ({}))) as { sid?: string; id?: string; message_id?: string };
    const messageId = parsedBody.sid || parsedBody.message_id || parsedBody.id || null;

    await completeQueueItem(adminClient, item.id, "dispatched", null, {
      code: "completed",
      provider: providerName,
      ...(messageId ? { message_id: messageId } : {}),
    });

    return {
      queueId: item.id,
      actionType: "send_sms",
      status: "dispatched",
      code: "completed",
    };
  } catch (err: unknown) {
    const errMsg = `SMS_DELIVERY_FAILED: ${err instanceof Error ? err.message : "Request failed"}`;
    await completeQueueItem(adminClient, item.id, "failed", errMsg, {
      code: "sms_delivery_failed",
    });
    return {
      queueId: item.id,
      actionType: "send_sms",
      status: "failed",
      code: "sms_delivery_failed",
      error: errMsg,
    };
  }
}

async function processClaimedItems(
  adminClient: RuntimeAdminClient,
  claimedItems: QueueItemRow[],
  supabaseUrl: string,
  serviceKey: string,
  getEnv: (key: string) => string | undefined,
  fetcher: FetchFn,
  resolveDnsFn: DnsResolver | undefined,
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];
  for (const item of claimedItems) {
    const context = await loadExecutionContext(adminClient, item);
    if (item.action_type === "trigger_webhook") {
      results.push(await processWebhookItem(adminClient, item, context, fetcher, resolveDnsFn));
    } else if (item.action_type === "send_email") {
      results.push(await processEmailItem(adminClient, item, context, supabaseUrl, serviceKey, fetcher));
    } else if (item.action_type === "send_whatsapp") {
      results.push(await processWhatsappItem(adminClient, item, context, getEnv, fetcher));
    } else if (item.action_type === "send_sms") {
      results.push(await processSmsItem(adminClient, item, context, getEnv, fetcher));
    } else {
      await completeQueueItem(adminClient, item.id, "failed", "UNSUPPORTED_OUTBOUND_ACTION", {
        code: "unsupported_action",
      });
      results.push({
        queueId: item.id,
        actionType: item.action_type,
        status: "failed",
        code: "unsupported_action",
        error: "UNSUPPORTED_OUTBOUND_ACTION",
      });
    }
  }
  return results;
}

function buildProviderStatus(getEnv: (key: string) => string | undefined) {
  const hasResend = Boolean((getEnv("RESEND_API_KEY") || "").trim());
  const hasSystemSmtp = Boolean(
    (getEnv("GMAIL_USER") || "").trim() && (getEnv("GMAIL_APP_PASSWORD") || "").trim(),
  );
  const hasWaToken = Boolean((getEnv("WHATSAPP_ACCESS_TOKEN") || "").trim());
  const hasWaPhoneId = Boolean((getEnv("WHATSAPP_PHONE_NUMBER_ID") || "").trim());

  const missingWhatsappEnv: string[] = [];
  if (!hasWaToken) missingWhatsappEnv.push("WHATSAPP_ACCESS_TOKEN");
  if (!hasWaPhoneId) missingWhatsappEnv.push("WHATSAPP_PHONE_NUMBER_ID");

  const hasTwilio = Boolean(
    (getEnv("TWILIO_ACCOUNT_SID") || "").trim() &&
      (getEnv("TWILIO_AUTH_TOKEN") || "").trim() &&
      (getEnv("TWILIO_FROM_NUMBER") || "").trim(),
  );
  const hasSmsGateway = Boolean((getEnv("SMS_GATEWAY_URL") || "").trim());
  const missingSmsEnv: string[] = [];
  if (!hasTwilio && !hasSmsGateway) {
    if (!(getEnv("TWILIO_ACCOUNT_SID") || "").trim()) missingSmsEnv.push("TWILIO_ACCOUNT_SID");
    if (!(getEnv("TWILIO_AUTH_TOKEN") || "").trim()) missingSmsEnv.push("TWILIO_AUTH_TOKEN");
    if (!(getEnv("TWILIO_FROM_NUMBER") || "").trim()) missingSmsEnv.push("TWILIO_FROM_NUMBER");
  }

  return {
    send_email: {
      configured: hasResend || hasSystemSmtp,
      mode: hasResend ? "resend" : hasSystemSmtp ? "smtp_system_or_custom" : "custom_smtp_only",
    },
    trigger_webhook: {
      configured: true,
      ssrf_protection: true,
    },
    send_whatsapp: {
      configured: hasWaToken && hasWaPhoneId,
      code: hasWaToken && hasWaPhoneId ? "READY" : "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      ...(missingWhatsappEnv.length > 0 ? { missing_env: missingWhatsappEnv } : {}),
    },
    send_sms: {
      configured: hasTwilio || hasSmsGateway,
      code: hasTwilio || hasSmsGateway ? "READY" : "SMS_PROVIDER_NOT_CONFIGURED",
      ...(missingSmsEnv.length > 0 ? { missing_env: missingSmsEnv } : {}),
    },
  };
}

export async function handleAutomationActionRequest(
  req: Request,
  deps: RuntimeDeps = {},
): Promise<Response> {
  const preflight = handleCorsPrelight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405, corsHeaders);
  }

  const getEnv = deps.getEnv || defaultGetEnv;
  const createSupabase = deps.createSupabaseClient || defaultCreateClient;
  const fetcher: FetchFn = deps.fetcher || fetch;
  const resolveDnsFn = deps.resolveDns ?? defaultResolveDns();

  const supabaseUrl = (getEnv("SUPABASE_URL") || "").trim();
  const serviceKey = (getEnv("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  const anonKey = (getEnv("SUPABASE_ANON_KEY") || "").trim();
  const publishableKey = (getEnv("SUPABASE_PUBLISHABLE_KEY") || "").trim();
  const cronSecret = (getEnv("CRON_SECRET") || "").trim();

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server configuration missing", code: "SERVER_MISCONFIGURED" }, 503, corsHeaders);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const cronHeader = (req.headers.get("x-cron-secret") || "").trim();

  const isServiceCall = bearerToken.length > 0 && timingSafeEqual(bearerToken, serviceKey);
  const isCronCall =
    cronSecret.length > 0 &&
    ((bearerToken.length > 0 && timingSafeEqual(bearerToken, cronSecret)) ||
      (cronHeader.length > 0 && timingSafeEqual(cronHeader, cronSecret)));

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      const rawText = await req.text();
      if (rawText.trim()) {
        const parsed: unknown = JSON.parse(rawText);
        if (!isRecord(parsed)) {
          return jsonResponse({ error: "Invalid JSON payload", code: "INVALID_BODY" }, 400, corsHeaders);
        }
        body = parsed;
      }
    } catch {
      return jsonResponse({ error: "Malformed JSON body", code: "INVALID_JSON" }, 400, corsHeaders);
    }
  }

  const adminClient = createSupabase(supabaseUrl, serviceKey);
  let scopedCompanyId: string | null = null;

  if (isServiceCall || isCronCall) {
    const requestedCompany =
      typeof body.activeCompanyId === "string"
        ? body.activeCompanyId.trim()
        : typeof body.company_id === "string"
          ? body.company_id.trim()
          : "";
    if (requestedCompany) {
      if (!UUID_REGEX.test(requestedCompany)) {
        return jsonResponse({ error: "Invalid company_id format", code: "INVALID_COMPANY_ID" }, 400, corsHeaders);
      }
      scopedCompanyId = requestedCompany;
    }
  } else {
    // Reject missing tokens or anon/publishable keys immediately (no anonKey bypass).
    if (
      !bearerToken ||
      (anonKey.length > 0 && timingSafeEqual(bearerToken, anonKey)) ||
      (publishableKey.length > 0 && timingSafeEqual(bearerToken, publishableKey))
    ) {
      return jsonResponse({ error: "Unauthorized: Missing or non-user token", code: "UNAUTHORIZED" }, 401, corsHeaders);
    }

    const authClient = createSupabase(supabaseUrl, anonKey || serviceKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(bearerToken);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized: Invalid token", code: "TOKEN_INVALID" }, 401, corsHeaders);
    }

    const requestedCompany =
      typeof body.activeCompanyId === "string"
        ? body.activeCompanyId.trim()
        : typeof body.company_id === "string"
          ? body.company_id.trim()
          : (req.headers.get("x-company-id") || "").trim();

    if (!requestedCompany || !UUID_REGEX.test(requestedCompany)) {
      return jsonResponse({ error: "activeCompanyId is required", code: "COMPANY_ID_REQUIRED" }, 400, corsHeaders);
    }

    const { data: companyRaw, error: companyErr } = await adminClient
      .from("companies")
      .select("id, status, parent_company_id")
      .eq("id", requestedCompany)
      .maybeSingle();

    if (companyErr) {
      return jsonResponse({ error: "Failed verifying tenant company", code: "TENANT_LOOKUP_FAILED" }, 503, corsHeaders);
    }

    const company = companyRaw as { id: string; status: string; parent_company_id: string | null } | null;
    if (!company) {
      return jsonResponse({ error: "Company not found", code: "COMPANY_NOT_FOUND" }, 403, corsHeaders);
    }
    if (company.status !== "active") {
      return jsonResponse({ error: "Company is inactive", code: "COMPANY_INACTIVE" }, 403, corsHeaders);
    }

    if (company.parent_company_id) {
      const { data: parentRaw, error: parentErr } = await adminClient
        .from("companies")
        .select("id, status")
        .eq("id", company.parent_company_id)
        .maybeSingle();
      if (parentErr) {
        return jsonResponse({ error: "Failed verifying parent company", code: "TENANT_LOOKUP_FAILED" }, 503, corsHeaders);
      }
      const parentCompany = parentRaw as { id: string; status: string } | null;
      if (!parentCompany || parentCompany.status !== "active") {
        return jsonResponse({ error: "Parent company is inactive", code: "COMPANY_INACTIVE" }, 403, corsHeaders);
      }
    }

    const validCompanyIds = company.parent_company_id
      ? [company.id, company.parent_company_id]
      : [company.id];

    const { data: membershipRaw, error: membershipErr } = await adminClient
      .from("company_members")
      .select("company_id, member_role")
      .eq("user_id", userData.user.id)
      .in("company_id", validCompanyIds)
      .in("member_role", ["owner", "admin"])
      .maybeSingle();

    if (membershipErr) {
      return jsonResponse({ error: "Failed verifying company membership", code: "MEMBERSHIP_LOOKUP_FAILED" }, 503, corsHeaders);
    }

    if (!membershipRaw) {
      return jsonResponse(
        { error: "Forbidden: Company owner or admin access required", code: "COMPANY_OWNER_OR_ADMIN_REQUIRED" },
        403,
        corsHeaders,
      );
    }

    scopedCompanyId = company.id;
  }

  const requestedAction =
    req.method === "GET"
      ? "status"
      : typeof body.action === "string" && body.action.trim()
        ? body.action.trim()
        : "process_queue";

  if (requestedAction === "status") {
    return jsonResponse(
      {
        ok: true,
        company_id: scopedCompanyId,
        providers: buildProviderStatus(getEnv),
      },
      200,
      corsHeaders,
    );
  }

  if (requestedAction === "dispatch_rule") {
    const ruleId = typeof body.rule_id === "string" ? body.rule_id.trim() : "";
    const candidateId =
      typeof body.candidate_id === "string" && body.candidate_id.trim() ? body.candidate_id.trim() : null;

    if (!ruleId || !UUID_REGEX.test(ruleId)) {
      return jsonResponse({ error: "Valid rule_id is required", code: "INVALID_RULE_ID" }, 400, corsHeaders);
    }
    if (candidateId && !UUID_REGEX.test(candidateId)) {
      return jsonResponse({ error: "Invalid candidate_id format", code: "INVALID_CANDIDATE_ID" }, 400, corsHeaders);
    }

    let ruleQuery = adminClient
      .from("automation_rules")
      .select("id, company_id, title, trigger_event, actions, is_active, created_by")
      .eq("id", ruleId);
    if (scopedCompanyId) {
      ruleQuery = ruleQuery.eq("company_id", scopedCompanyId);
    }

    const { data: ruleRaw, error: ruleErr } = await ruleQuery.maybeSingle();
    if (ruleErr) {
      return jsonResponse({ error: "Failed loading automation rule", code: "RULE_LOOKUP_FAILED" }, 503, corsHeaders);
    }
    const rule = ruleRaw as AutomationRuleRow | null;
    if (!rule) {
      return jsonResponse({ error: "Automation rule not found", code: "RULE_NOT_FOUND" }, 404, corsHeaders);
    }
    if (!rule.is_active) {
      return jsonResponse({ error: "Automation rule is inactive", code: "RULE_INACTIVE" }, 409, corsHeaders);
    }

    const targetCompanyId = scopedCompanyId || rule.company_id;
    if (candidateId) {
      const { data: candCheck, error: candCheckErr } = await adminClient
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .eq("company_id", targetCompanyId)
        .maybeSingle();
      if (candCheckErr) {
        return jsonResponse({ error: "Failed verifying candidate", code: "CANDIDATE_LOOKUP_FAILED" }, 503, corsHeaders);
      }
      if (!candCheck) {
        return jsonResponse({ error: "Candidate not found in active company", code: "CANDIDATE_NOT_FOUND" }, 404, corsHeaders);
      }
    }
    const outboundActions = (rule.actions || [])
      .map((action, index) => ({ action, index }))
      .filter((entry) =>
        entry.action.type === "send_email" ||
        entry.action.type === "send_whatsapp" ||
        entry.action.type === "send_sms" ||
        entry.action.type === "trigger_webhook",
      );

    if (outboundActions.length === 0) {
      return jsonResponse(
        { ok: true, processed: 0, results: [], message: "Rule has no outbound actions" },
        200,
        corsHeaders,
      );
    }

    const { data: logRaw, error: logErr } = await adminClient
      .from("automation_logs")
      .insert({
        company_id: targetCompanyId,
        rule_id: rule.id,
        trigger_event: rule.trigger_event,
        entity_id: candidateId || rule.id,
        status: "running",
        execution_details: {
          candidate_id: candidateId,
          code: "queued_outbound",
          queued_count: outboundActions.length,
        },
      })
      .select("id")
      .single();

    if (logErr || !logRaw) {
      return jsonResponse({ error: "Failed creating automation log", code: "LOG_CREATE_FAILED" }, 503, corsHeaders);
    }
    const createdLogId = (logRaw as { id: string }).id;

    for (const entry of outboundActions) {
      const sanitizedPayload = { ...(entry.action.payload || {}) };
      delete sanitizedPayload.secret;
      delete sanitizedPayload.hmac_secret;

      const { error: enqueueErr } = await adminClient.rpc("enqueue_automation_outbound_action", {
        _company_id: targetCompanyId,
        _rule_id: rule.id,
        _log_id: createdLogId,
        _candidate_id: candidateId,
        _action_type: entry.action.type,
        _payload: {
          action_payload: sanitizedPayload,
          trigger_event: rule.trigger_event,
          entity_id: candidateId || rule.id,
          rule_title: rule.title,
        },
        _action_index: entry.index,
      });
      if (enqueueErr) {
        return jsonResponse(
          { error: enqueueErr.message || "Failed enqueuing outbound action", code: "ENQUEUE_FAILED" },
          400,
          corsHeaders,
        );
      }
    }

    const { data: claimedRaw, error: claimErr } = await adminClient.rpc("claim_automation_outbound_queue", {
      _company_id: targetCompanyId,
      _limit: outboundActions.length,
      _rule_id: rule.id,
    });
    if (claimErr) {
      return jsonResponse({ error: "Failed claiming outbound queue", code: "QUEUE_CLAIM_FAILED" }, 503, corsHeaders);
    }

    const claimedItems = Array.isArray(claimedRaw) ? (claimedRaw as QueueItemRow[]) : [];
    const results = await processClaimedItems(
      adminClient,
      claimedItems,
      supabaseUrl,
      serviceKey,
      getEnv,
      fetcher,
      resolveDnsFn,
    );

    return jsonResponse(
      {
        ok: true,
        processed: results.length,
        results,
        providers: buildProviderStatus(getEnv),
      },
      200,
      corsHeaders,
    );
  }

  if (requestedAction === "process_queue") {
    const rawLimit = typeof body.limit === "number" ? body.limit : 25;
    const limit = Math.min(Math.max(Math.trunc(rawLimit), 1), 100);
    const ruleId =
      typeof body.rule_id === "string" && body.rule_id.trim() ? body.rule_id.trim() : null;
    if (ruleId && !UUID_REGEX.test(ruleId)) {
      return jsonResponse({ error: "Invalid rule_id format", code: "INVALID_RULE_ID" }, 400, corsHeaders);
    }

    const { data: claimedRaw, error: claimErr } = await adminClient.rpc("claim_automation_outbound_queue", {
      _company_id: scopedCompanyId,
      _limit: limit,
      _rule_id: ruleId,
    });
    if (claimErr) {
      return jsonResponse({ error: "Failed claiming outbound queue", code: "QUEUE_CLAIM_FAILED" }, 503, corsHeaders);
    }

    const claimedItems = Array.isArray(claimedRaw) ? (claimedRaw as QueueItemRow[]) : [];
    const results = await processClaimedItems(
      adminClient,
      claimedItems,
      supabaseUrl,
      serviceKey,
      getEnv,
      fetcher,
      resolveDnsFn,
    );

    return jsonResponse(
      {
        ok: true,
        processed: results.length,
        results,
        providers: buildProviderStatus(getEnv),
      },
      200,
      corsHeaders,
    );
  }

  return jsonResponse({ error: "Unsupported action", code: "INVALID_ACTION" }, 400, corsHeaders);
}

const denoRuntime = getDenoGlobal();
if (typeof denoRuntime?.serve === "function") {
  denoRuntime.serve((req: Request) => handleAutomationActionRequest(req));
}
