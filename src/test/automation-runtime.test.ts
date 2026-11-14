import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type {
  ActionExecutionResult,
  DnsResolver,
  FetchFn,
  QueueItemRow,
  QueueItemStatus,
  RuntimeAdminClient,
  RuntimeDeps,
  WebhookUrlValidationResult,
} from "../../supabase/functions/execute-automation-actions/index.ts";
import {
  isSafeHttpsWebhookUrl,
  validateAutomationActionConfig,
  type AutomationRule,
  type AutomationOutboundQueueItem,
  type AutomationProviderStatus,
} from "@/hooks/useAutomation";

vi.hoisted(() => {
  (globalThis as { Deno?: { env: { get(key: string): string | undefined } } }).Deno = {
    env: {
      get: () => "",
    },
  };
});

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(),
}));

type EdgeRuntimeModule = {
  handleAutomationActionRequest: (req: Request, deps?: RuntimeDeps) => Promise<Response>;
  validateWebhookUrl: (rawUrl: string, resolveDnsFn?: DnsResolver) => Promise<WebhookUrlValidationResult>;
  isPrivateOrReservedIp: (ip: string) => boolean;
  renderTemplate: (template: string, variables: Record<string, string>, htmlEscape?: boolean) => string;
  formatEmailHtmlBody: (rawBody: string, variables: Record<string, string>) => string;
  computeHmacSignature: (secret: string, payload: string) => Promise<string>;
  normalizeWhatsappPhone: (raw: string) => string | null;
};

let edgeRuntime: EdgeRuntimeModule;

const mockUseAutomationRules = vi.fn();
const mockUseAutomationStages = vi.fn();

vi.mock("@/hooks/useAutomation", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useAutomation")>("@/hooks/useAutomation");
  return {
    ...actual,
    useAutomationRules: () => mockUseAutomationRules(),
    useAutomationStages: () => mockUseAutomationStages(),
  };
});

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    activeCompanyId: "11111111-1111-4111-8111-111111111111",
    activeCompany: { id: "11111111-1111-4111-8111-111111111111", name: "توظيف إكس" },
  }),
}));

vi.mock("@/hooks/useCompanies", () => ({
  useCompanyMembers: () => ({
    data: [{ user_id: "user-owner", member_role: "owner", profiles: { full_name: "أحمد المالك" } }],
    isLoading: false,
    error: null,
  }),
}));

let AutomationBuilderComponent: typeof import("@/components/AutomationBuilder").default;

beforeAll(async () => {
  edgeRuntime = (await import(
    "../../supabase/functions/execute-automation-actions/index.ts"
  )) as unknown as EdgeRuntimeModule;
  const builderMod = await import("@/components/AutomationBuilder");
  AutomationBuilderComponent = builderMod.default;
});

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const PARENT_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const RULE_ID = "44444444-4444-4444-8444-444444444444";
const CANDIDATE_ID = "55555555-5555-4555-8555-555555555555";
const JOB_ID = "66666666-6666-4666-8666-666666666666";
const LOG_ID = "77777777-7777-4777-8777-777777777777";
const OWNER_USER_ID = "88888888-8888-4888-8888-888888888888";
const HR_USER_ID = "99999999-9999-4999-8999-999999999999";

const ENV_BASE: Record<string, string> = {
  SUPABASE_URL: "https://test-project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret-value",
  SUPABASE_ANON_KEY: "anon-public-key-value",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public_key",
  CRON_SECRET: "cron-secret-value",
};

type DbRow = Record<string, unknown>;

interface MockDbState {
  usersByToken: Record<string, { id: string; email?: string | null }>;
  adminUsersById: Record<string, { id: string; email?: string | null }>;
  tables: Record<string, DbRow[]>;
  queue: QueueItemRow[];
  inserts: Record<string, DbRow[]>;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  completions: Array<{
    queueId: string;
    status: QueueItemStatus;
    lastError: string | null;
    details: Record<string, unknown>;
  }>;
}

function createMockDbState(overrides?: Partial<MockDbState>): MockDbState {
  return {
    usersByToken: {
      "owner-jwt": { id: OWNER_USER_ID, email: "owner@tawzeef.test" },
      "hr-jwt": { id: HR_USER_ID, email: "hr@tawzeef.test" },
    },
    adminUsersById: {
      [OWNER_USER_ID]: { id: OWNER_USER_ID, email: "owner@tawzeef.test" },
      [HR_USER_ID]: { id: HR_USER_ID, email: "hr@tawzeef.test" },
    },
    tables: {
      companies: [
        {
          id: COMPANY_ID,
          name: "شركة توظيف إكس",
          name_en: "Tawzeef-X",
          contact_email: "contact@tawzeef.test",
          owner_user_id: OWNER_USER_ID,
          user_id: OWNER_USER_ID,
          parent_company_id: null,
          status: "active",
        },
        {
          id: PARENT_COMPANY_ID,
          name: "الشركة الأم",
          name_en: "Parent Co",
          contact_email: "parent@tawzeef.test",
          owner_user_id: OWNER_USER_ID,
          user_id: OWNER_USER_ID,
          parent_company_id: null,
          status: "active",
        },
      ],
      company_members: [
        { company_id: COMPANY_ID, user_id: OWNER_USER_ID, member_role: "owner" },
        { company_id: COMPANY_ID, user_id: HR_USER_ID, member_role: "hr" },
      ],
      candidates: [
        {
          id: CANDIDATE_ID,
          company_id: COMPANY_ID,
          job_id: JOB_ID,
          user_id: OWNER_USER_ID,
          name: "سارة <script>alert(1)</script> علي",
          email: "sara@candidate.test",
          phone: "+966 50 123 4567",
          role: "مهندسة برمجيات",
          stage: "المقابلة التقنية",
          status: "active",
          ai_score: 92,
          tracking_code: "TRK-2026-99",
        },
      ],
      jobs: [
        {
          id: JOB_ID,
          company_id: COMPANY_ID,
          title: "مهندس برمجيات أول",
          department: "الهندسة",
          location: "الرياض",
        },
      ],
      automation_rules: [],
    },
    queue: [],
    inserts: {},
    rpcCalls: [],
    completions: [],
    ...overrides,
  };
}

function makeMockAdminClient(state: MockDbState): RuntimeAdminClient {
  let seq = 1;

  const filterRows = (table: string, filters: Array<{ op: "eq" | "in"; col: string; val: unknown }>): DbRow[] => {
    const source = state.tables[table] || [];
    return source.filter((row) =>
      filters.every((filter) => {
        const cell = row[filter.col];
        if (filter.op === "eq") {
          return cell === filter.val;
        }
        return Array.isArray(filter.val) && filter.val.includes(cell);
      }),
    );
  };

  return {
    auth: {
      async getUser(token: string) {
        const found = state.usersByToken[token] || null;
        if (!found) {
          return { data: { user: null }, error: { message: "Invalid JWT" } };
        }
        return { data: { user: found }, error: null };
      },
      admin: {
        async getUserById(userId: string) {
          const found = state.adminUsersById[userId] || null;
          if (!found) {
            return { data: { user: null }, error: { message: "User not found" } };
          }
          return { data: { user: found }, error: null };
        },
      },
    },
    from(table: string) {
      return {
        select() {
          const filters: Array<{ op: "eq" | "in"; col: string; val: unknown }> = [];
          const buildChain = (): ReturnType<RuntimeAdminClient["from"]>["select"] extends (...args: never[]) => infer R
            ? R
            : never => {
            const executeList = async () => ({
              data: filterRows(table, filters),
              error: null,
            });
            return {
              select() {
                return buildChain();
              },
              eq(col: string, val: string) {
                filters.push({ op: "eq", col, val });
                return buildChain();
              },
              in(col: string, val: string[]) {
                filters.push({ op: "in", col, val });
                return buildChain();
              },
              async maybeSingle() {
                const rows = filterRows(table, filters);
                return { data: rows[0] ?? null, error: null };
              },
              async single() {
                const rows = filterRows(table, filters);
                if (!rows[0]) {
                  return { data: null, error: { message: "Not found" } };
                }
                return { data: rows[0], error: null };
              },
              then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
                onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
                onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
              ) {
                return executeList().then(onfulfilled, onrejected);
              },
            };
          };
          return buildChain();
        },
        insert(values: Record<string, unknown>) {
          const insertedId = typeof values.id === "string" ? values.id : `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;
          const row: DbRow = { id: insertedId, ...values };
          if (!state.inserts[table]) state.inserts[table] = [];
          state.inserts[table].push(row);

          const singleResult = async () => ({ data: row, error: null });
          return {
            select() {
              return {
                select() {
                  return this;
                },
                eq() {
                  return this;
                },
                in() {
                  return this;
                },
                async maybeSingle() {
                  return singleResult();
                },
                async single() {
                  return singleResult();
                },
                then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
                  onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
                  onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
                ) {
                  return singleResult().then(onfulfilled, onrejected);
                },
              };
            },
            then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
              onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return singleResult().then(onfulfilled, onrejected);
            },
          };
        },
      };
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      state.rpcCalls.push({ fn, args });

      if (fn === "enqueue_automation_outbound_action") {
        const rawPayload = (args._payload as Record<string, unknown>) || {};
        const sanitizedPayload: Record<string, unknown> = { ...rawPayload };
        if (
          typeof sanitizedPayload.action_payload === "object" &&
          sanitizedPayload.action_payload !== null &&
          !Array.isArray(sanitizedPayload.action_payload)
        ) {
          const nested = { ...(sanitizedPayload.action_payload as Record<string, unknown>) };
          delete nested.secret;
          delete nested.hmac_secret;
          sanitizedPayload.action_payload = nested;
        }
        const item: QueueItemRow = {
          id: `aaaaaaaa-0000-4000-8000-${String(seq++).padStart(12, "0")}`,
          company_id: String(args._company_id),
          rule_id: (args._rule_id as string | null) ?? null,
          log_id: (args._log_id as string | null) ?? null,
          candidate_id: (args._candidate_id as string | null) ?? null,
          action_type: args._action_type as QueueItemRow["action_type"],
          action_index: typeof args._action_index === "number" ? args._action_index : 0,
          payload: sanitizedPayload,
          status: "pending",
          attempt_count: 0,
          last_error: null,
          processed_at: null,
          created_at: new Date().toISOString(),
        };
        state.queue.push(item);
        return { data: item, error: null };
      }

      if (fn === "claim_automation_outbound_queue") {
        const companyFilter = (args._company_id as string | null) ?? null;
        const ruleFilter = (args._rule_id as string | null) ?? null;
        const limit = typeof args._limit === "number" ? args._limit : 25;
        const claimed = state.queue
          .filter((item) => {
            if (item.status !== "pending") return false;
            if (companyFilter && item.company_id !== companyFilter) return false;
            if (ruleFilter && item.rule_id !== ruleFilter) return false;
            return true;
          })
          .slice(0, limit);
        for (const item of claimed) {
          item.attempt_count += 1;
        }
        return { data: claimed, error: null };
      }

      if (fn === "complete_automation_outbound_item") {
        const queueId = String(args._queue_id);
        const status = args._status as QueueItemStatus;
        const lastError = (args._last_error as string | null) ?? null;
        const details = (args._details as Record<string, unknown>) || {};
        state.completions.push({ queueId, status, lastError, details });
        const target = state.queue.find((item) => item.id === queueId);
        if (target) {
          target.status = status;
          target.last_error = lastError;
          target.processed_at = new Date().toISOString();
        }
        return { data: target ?? null, error: null };
      }

      return { data: null, error: { message: `Unknown RPC ${fn}` } };
    },
  };
}

function makeDeps(
  state: MockDbState,
  opts?: {
    env?: Record<string, string>;
    fetcher?: FetchFn;
    resolveDns?: DnsResolver;
  },
): RuntimeDeps {
  const mergedEnv = { ...ENV_BASE, ...(opts?.env || {}) };
  const client = makeMockAdminClient(state);
  return {
    getEnv: (key: string) => mergedEnv[key],
    createSupabaseClient: () => client,
    fetcher:
      opts?.fetcher ||
      (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    resolveDns:
      opts?.resolveDns ??
      (async (_host: string, recordType: "A" | "AAAA") =>
        recordType === "A" ? ["93.184.216.34"] : []),
  };
}

describe("Automation outbound runtime - Edge Function auth & tenant boundaries", () => {
  it("rejects missing Authorization header and anon/publishable keys (no anonKey bypass)", async () => {
    const state = createMockDbState();
    const deps = makeDeps(state);

    const noAuthReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });
    const noAuthRes = await edgeRuntime.handleAutomationActionRequest(noAuthReq, deps);
    expect(noAuthRes.status).toBe(401);

    const anonReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV_BASE.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });
    const anonRes = await edgeRuntime.handleAutomationActionRequest(anonReq, deps);
    expect(anonRes.status).toBe(401);
    const anonJson = (await anonRes.json()) as { code: string };
    expect(anonJson.code).toBe("UNAUTHORIZED");

    const pubReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV_BASE.SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });
    const pubRes = await edgeRuntime.handleAutomationActionRequest(pubReq, deps);
    expect(pubRes.status).toBe(401);
  });

  it("rejects non-owner/non-admin members and inactive/parent-inactive companies", async () => {
    const state = createMockDbState();
    const deps = makeDeps(state);

    const hrReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer hr-jwt" },
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });
    const hrRes = await edgeRuntime.handleAutomationActionRequest(hrReq, deps);
    expect(hrRes.status).toBe(403);
    expect(((await hrRes.json()) as { code: string }).code).toBe("COMPANY_OWNER_OR_ADMIN_REQUIRED");

    const missingCompanyReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({ action: "status" }),
    });
    const missingCompanyRes = await edgeRuntime.handleAutomationActionRequest(missingCompanyReq, deps);
    expect(missingCompanyRes.status).toBe(400);
    expect(((await missingCompanyRes.json()) as { code: string }).code).toBe("COMPANY_ID_REQUIRED");

    const suspendedState = createMockDbState({
      tables: {
        ...createMockDbState().tables,
        companies: [
          {
            id: COMPANY_ID,
            name: "Sub Co",
            name_en: "Sub Co",
            contact_email: null,
            owner_user_id: OWNER_USER_ID,
            user_id: OWNER_USER_ID,
            parent_company_id: PARENT_COMPANY_ID,
            status: "active",
          },
          {
            id: PARENT_COMPANY_ID,
            name: "Parent Co",
            name_en: "Parent Co",
            contact_email: null,
            owner_user_id: OWNER_USER_ID,
            user_id: OWNER_USER_ID,
            parent_company_id: null,
            status: "suspended",
          },
        ],
      },
    });
    const parentInactiveReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({ action: "status", activeCompanyId: COMPANY_ID }),
    });
    const parentInactiveRes = await edgeRuntime.handleAutomationActionRequest(
      parentInactiveReq,
      makeDeps(suspendedState),
    );
    expect(parentInactiveRes.status).toBe(403);
    expect(((await parentInactiveRes.json()) as { code: string }).code).toBe("COMPANY_INACTIVE");
  });

  it("allows verified company owner scoped to activeCompanyId and blocks cross-tenant rules", async () => {
    const state = createMockDbState();
    state.tables.automation_rules.push({
      id: RULE_ID,
      company_id: OTHER_COMPANY_ID,
      title: "Cross-tenant rule",
      trigger_event: "candidate.stage_changed",
      actions: [{ type: "trigger_webhook", payload: { url: "https://hooks.example.com/a" } }],
      is_active: true,
      created_by: OWNER_USER_ID,
    });

    const crossTenantReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({
        action: "dispatch_rule",
        activeCompanyId: COMPANY_ID,
        rule_id: RULE_ID,
      }),
    });
    const crossTenantRes = await edgeRuntime.handleAutomationActionRequest(crossTenantReq, makeDeps(state));
    expect(crossTenantRes.status).toBe(404);
    expect(((await crossTenantRes.json()) as { code: string }).code).toBe("RULE_NOT_FOUND");
  });

  it("allows CRON_SECRET and service_role authentication for background queue claims", async () => {
    const state = createMockDbState();
    const cronReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { "x-cron-secret": ENV_BASE.CRON_SECRET },
      body: JSON.stringify({ action: "process_queue", limit: 10 }),
    });
    const cronRes = await edgeRuntime.handleAutomationActionRequest(cronReq, makeDeps(state));
    expect(cronRes.status).toBe(200);
    expect(state.rpcCalls[0]).toEqual({
      fn: "claim_automation_outbound_queue",
      args: { _company_id: null, _limit: 10, _rule_id: null },
    });

    const serviceReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV_BASE.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ action: "status" }),
    });
    const serviceRes = await edgeRuntime.handleAutomationActionRequest(serviceReq, makeDeps(state));
    expect(serviceRes.status).toBe(200);
  });
});

describe("Automation outbound runtime - trigger_webhook SSRF protection & HMAC delivery", () => {
  it("blocks insecure, loopback, private, metadata, obfuscated IPs, and internal DNS targets", async () => {
    const blockedUrls = [
      "http://hooks.example.com/insecure",
      "https://user:pass@hooks.example.com/creds",
      "https://localhost/webhook",
      "https://sub.localhost/webhook",
      "https://api.internal/webhook",
      "https://metadata.google.internal/computeMetadata/v1/",
      "https://127.0.0.1/webhook",
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.12/webhook",
      "https://192.168.1.50/webhook",
      "https://172.16.4.8/webhook",
      "https://[::1]/webhook",
      "https://[::ffff:127.0.0.1]/webhook",
      "https://[fc00::1]/webhook",
      "https://2130706433/webhook",
      "https://0x7f000001/webhook",
    ];

    const publicDns: DnsResolver = async (_h, type) => (type === "A" ? ["93.184.216.34"] : []);
    for (const url of blockedUrls) {
      const check = await edgeRuntime.validateWebhookUrl(url, publicDns);
      expect(check.valid, `Expected SSRF URL to be blocked: ${url}`).toBe(false);
    }

    const rebindingDns: DnsResolver = async (_h, type) => (type === "A" ? ["10.20.30.40"] : []);
    const dnsBlocked = await edgeRuntime.validateWebhookUrl("https://evil.example.com/hook", rebindingDns);
    expect(dnsBlocked.valid).toBe(false);

    const valid = await edgeRuntime.validateWebhookUrl("https://hooks.example.com/tawzeef", publicDns);
    expect(valid.valid).toBe(true);
  });

  it("delivers HTTPS webhook with X-Tawzeef-Signature HMAC, logs webhook_deliveries, and blocks SSRF/redirects at execution time", async () => {
    const state = createMockDbState();
    const webhookSecret = "whsec_super_secret_hmac_key";
    state.tables.automation_rules.push({
      id: RULE_ID,
      company_id: COMPANY_ID,
      title: "إشعار Webhook للمتقدمين",
      trigger_event: "candidate.stage_changed",
      actions: [
        {
          type: "trigger_webhook",
          payload: {
            url: "https://hooks.example.com/pipeline",
            event_name: "candidate.interview_ready",
            secret: webhookSecret,
          },
        },
      ],
      is_active: true,
      created_by: OWNER_USER_ID,
    });

    const capturedRequests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher: FetchFn = async (input, init) => {
      capturedRequests.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    };

    const req = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({
        action: "dispatch_rule",
        activeCompanyId: COMPANY_ID,
        rule_id: RULE_ID,
        candidate_id: CANDIDATE_ID,
      }),
    });

    const res = await edgeRuntime.handleAutomationActionRequest(req, makeDeps(state, { fetcher }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; processed: number; results: ActionExecutionResult[] };
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(1);
    expect(json.results[0]).toMatchObject({
      actionType: "trigger_webhook",
      status: "dispatched",
      code: "completed",
    });

    // Secret must NOT be stored in queued payload
    const queuedItem = state.queue[0];
    const nestedActionPayload = queuedItem.payload.action_payload as Record<string, unknown>;
    expect(nestedActionPayload.secret).toBeUndefined();
    expect(nestedActionPayload.hmac_secret).toBeUndefined();

    // Verify signed HTTP POST with redirect: "manual"
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0].url).toBe("https://hooks.example.com/pipeline");
    expect(capturedRequests[0].init.redirect).toBe("manual");
    const headers = capturedRequests[0].init.headers as Record<string, string>;
    const bodyText = String(capturedRequests[0].init.body);
    const expectedHmac = await edgeRuntime.computeHmacSignature(webhookSecret, bodyText);
    expect(headers["X-Tawzeef-Signature"]).toBe(`sha256=${expectedHmac}`);
    expect(headers["X-Tawzeef-Event"]).toBe("candidate.interview_ready");

    // Verify webhook_deliveries recorded success
    expect(state.inserts.webhook_deliveries).toHaveLength(1);
    expect(state.inserts.webhook_deliveries[0]).toMatchObject({
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      event_type: "candidate.interview_ready",
      status: "success",
      status_code: 200,
    });

    // SSRF queued item makes 0 outbound HTTP calls and marks failed
    const ssrfState = createMockDbState();
    ssrfState.queue.push({
      id: "bbbbbbbb-0000-4000-8000-000000000001",
      company_id: COMPANY_ID,
      rule_id: null,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "trigger_webhook",
      action_index: 0,
      payload: { action_payload: { url: "https://169.254.169.254/latest/meta-data" } },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });
    const ssrfFetcher = vi.fn(fetcher);
    const ssrfReq = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });
    const ssrfRes = await edgeRuntime.handleAutomationActionRequest(
      ssrfReq,
      makeDeps(ssrfState, { fetcher: ssrfFetcher }),
    );
    const ssrfJson = (await ssrfRes.json()) as { results: ActionExecutionResult[] };
    expect(ssrfFetcher).not.toHaveBeenCalled();
    expect(ssrfJson.results[0]).toMatchObject({
      status: "failed",
      code: "webhook_url_blocked",
    });
    expect(ssrfState.inserts.webhook_deliveries[0].status).toBe("failed");

    // Redirect 302 must be treated as SSRF failure
    const redirectState = createMockDbState();
    redirectState.queue.push({
      id: "bbbbbbbb-0000-4000-8000-000000000002",
      company_id: COMPANY_ID,
      rule_id: null,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "trigger_webhook",
      action_index: 0,
      payload: { action_payload: { url: "https://hooks.example.com/redirector" } },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });
    const redirectRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(redirectState, {
        fetcher: async () => new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/" } }),
      }),
    );
    const redirectJson = (await redirectRes.json()) as { results: ActionExecutionResult[] };
    expect(redirectJson.results[0].status).toBe("failed");
    expect(redirectJson.results[0].error).toContain("Redirect blocked");
  });
});

describe("Automation outbound runtime - send_email & send_whatsapp", () => {
  it("invokes send-email Edge Function with service key and HTML-escaped template variables", async () => {
    const state = createMockDbState();
    state.queue.push({
      id: "cccccccc-0000-4000-8000-000000000001",
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "send_email",
      action_index: 0,
      payload: {
        action_payload: {
          recipient_type: "candidate",
          subject: "تحديث طلب {{job_title}} — {{tracking_code}}",
          body_html: "مرحبًا {{candidate_name}}، وصل طلبك إلى مرحلة {{stage}}.",
        },
      },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });

    const emailCalls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
    const fetcher: FetchFn = async (input, init) => {
      emailCalls.push({
        url: String(input),
        headers: (init?.headers as Record<string, string>) || {},
        body: JSON.parse(String(init?.body || "{}")) as Record<string, unknown>,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const req = new Request("https://edge.test/execute-automation-actions", {
      method: "POST",
      headers: { Authorization: "Bearer owner-jwt" },
      body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
    });

    const res = await edgeRuntime.handleAutomationActionRequest(req, makeDeps(state, { fetcher }));
    const json = (await res.json()) as { results: ActionExecutionResult[] };
    expect(json.results[0]).toMatchObject({
      actionType: "send_email",
      status: "dispatched",
      code: "completed",
    });

    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0].url).toBe("https://test-project.supabase.co/functions/v1/send-email");
    expect(emailCalls[0].headers.Authorization).toBe(`Bearer ${ENV_BASE.SUPABASE_SERVICE_ROLE_KEY}`);
    expect(emailCalls[0].body.to).toBe("sara@candidate.test");
    expect(emailCalls[0].body.subject).toBe("تحديث طلب مهندس برمجيات أول — TRK-2026-99");
    expect(String(emailCalls[0].body.html)).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(String(emailCalls[0].body.html)).toContain("المقابلة التقنية");
  });

  it("marks send_whatsapp as skipped_unconfigured with WHATSAPP_PROVIDER_NOT_CONFIGURED when secrets are absent (never fakes delivery)", async () => {
    const state = createMockDbState();
    state.queue.push({
      id: "dddddddd-0000-4000-8000-000000000001",
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "send_whatsapp",
      action_index: 0,
      payload: {
        action_payload: {
          recipient_type: "candidate",
          message: "مرحبًا {{candidate_name}}",
        },
      },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });

    const fetcherSpy = vi.fn<FetchFn>();
    const statusRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "status", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(state, { fetcher: fetcherSpy }),
    );
    const statusJson = (await statusRes.json()) as { providers: AutomationProviderStatus };
    expect(statusJson.providers.send_whatsapp.configured).toBe(false);
    expect(statusJson.providers.send_whatsapp.code).toBe("WHATSAPP_PROVIDER_NOT_CONFIGURED");

    const execRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(state, { fetcher: fetcherSpy }),
    );
    const execJson = (await execRes.json()) as { results: ActionExecutionResult[] };
    expect(fetcherSpy).not.toHaveBeenCalled();
    expect(execJson.results[0]).toMatchObject({
      actionType: "send_whatsapp",
      status: "skipped_unconfigured",
      code: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
    });
    expect(state.completions[0]).toMatchObject({
      queueId: "dddddddd-0000-4000-8000-000000000001",
      status: "skipped_unconfigured",
      lastError: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("sends WhatsApp message via Meta Cloud API when secrets are configured", async () => {
    const state = createMockDbState();
    state.queue.push({
      id: "dddddddd-0000-4000-8000-000000000002",
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "send_whatsapp",
      action_index: 0,
      payload: {
        action_payload: {
          recipient_type: "candidate",
          message: "مرحبًا {{candidate_name}} — {{stage}}",
        },
      },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });

    const waRequests: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
    const deps = makeDeps(state, {
      env: {
        WHATSAPP_ACCESS_TOKEN: "wa-meta-token",
        WHATSAPP_PHONE_NUMBER_ID: "9876543210",
      },
      fetcher: async (input, init) => {
        waRequests.push({
          url: String(input),
          headers: (init?.headers as Record<string, string>) || {},
          body: JSON.parse(String(init?.body || "{}")) as Record<string, unknown>,
        });
        return new Response(JSON.stringify({ messages: [{ id: "wamid.test123" }] }), { status: 200 });
      },
    });

    const execRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
      }),
      deps,
    );
    const execJson = (await execRes.json()) as {
      results: ActionExecutionResult[];
      providers: AutomationProviderStatus;
    };
    expect(execJson.providers.send_whatsapp.configured).toBe(true);
    expect(execJson.results[0]).toMatchObject({
      actionType: "send_whatsapp",
      status: "dispatched",
      code: "completed",
    });
    expect(waRequests).toHaveLength(1);
    expect(waRequests[0].url).toBe("https://graph.facebook.com/v21.0/9876543210/messages");
    expect(waRequests[0].headers.Authorization).toBe("Bearer wa-meta-token");
    expect(waRequests[0].body.to).toBe("966501234567");
  });
});

describe("Client outbound validation, AutomationBuilder UI & migration checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates outbound action configs strictly in client helper", () => {
    expect(
      validateAutomationActionConfig({
        type: "send_email",
        payload: { recipient_type: "candidate", subject: "تحديث", body_html: "مرحبًا {{candidate_name}}" },
      }),
    ).toBeNull();
    expect(
      validateAutomationActionConfig({
        type: "send_email",
        payload: { details: "رسالة قديمة" },
      }),
    ).toBe("هذا الإجراء يحتاج تكامل إرسال قبل تفعيله");

    expect(
      validateAutomationActionConfig({
        type: "trigger_webhook",
        payload: { url: "https://hooks.example.com/events" },
      }),
    ).toBeNull();
    expect(
      validateAutomationActionConfig({
        type: "trigger_webhook",
        payload: { url: "http://127.0.0.1:8080/hook" },
      }),
    ).toBe("رابط Webhook غير صالح؛ يلزم رابط HTTPS عام وموثوق");
    expect(isSafeHttpsWebhookUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isSafeHttpsWebhookUrl("https://hooks.example.com/ok")).toBe(true);

    expect(
      validateAutomationActionConfig({
        type: "send_whatsapp",
        payload: { recipient_type: "custom", to_phone: "966501234567", message: "تم التحديث" },
      }),
    ).toBeNull();
  });

  it("renders provider status, queue items, manual dispatch trigger, and allows activating configured outbound rules", async () => {
    const setRuleActive = vi.fn().mockResolvedValue(undefined);
    const dispatchOutboundQueue = vi.fn().mockResolvedValue({ ok: true, processed: 1 });

    const emailRule: AutomationRule = {
      id: "rule-email",
      company_id: COMPANY_ID,
      title: "بريد ترحيبي تلقائي",
      trigger_event: "application.created",
      conditions: [],
      actions: [
        {
          type: "send_email",
          payload: {
            recipient_type: "candidate",
            subject: "استلمنا طلبك",
            body_html: "مرحبًا {{candidate_name}}",
          },
        },
      ],
      is_active: false,
    };

    const queueItems: AutomationOutboundQueueItem[] = [
      {
        id: "q-1",
        company_id: COMPANY_ID,
        rule_id: "rule-email",
        log_id: LOG_ID,
        candidate_id: CANDIDATE_ID,
        action_type: "send_email",
        action_index: 0,
        payload: {},
        status: "pending",
        attempt_count: 0,
        last_error: null,
        processed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "q-2",
        company_id: COMPANY_ID,
        rule_id: null,
        log_id: null,
        candidate_id: CANDIDATE_ID,
        action_type: "send_whatsapp",
        action_index: 0,
        payload: {},
        status: "skipped_unconfigured",
        attempt_count: 1,
        last_error: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const providerStatus: AutomationProviderStatus = {
      send_email: { configured: true, mode: "resend" },
      trigger_webhook: { configured: true, ssrf_protection: true },
      send_whatsapp: {
        configured: false,
        code: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
        missing_env: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
      },
    };

    mockUseAutomationStages.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseAutomationRules.mockReturnValue({
      rules: [emailRule],
      logs: [],
      logsLoading: false,
      logsError: null,
      outboundQueue: queueItems,
      outboundQueueLoading: false,
      outboundQueueError: null,
      providerStatus,
      providerStatusLoading: false,
      needsCompany: false,
      canManage: true,
      isLoading: false,
      error: null,
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      setRuleActive,
      changingState: false,
      dispatchOutboundQueue,
      dispatchingQueue: false,
    });

    render(React.createElement(AutomationBuilderComponent));

    expect(screen.getByText(/واتساب \(Meta Cloud API\): غير مهيأ — WHATSAPP_PROVIDER_NOT_CONFIGURED/)).toBeInTheDocument();
    expect(screen.getByText("قائمة التنفيذ الخارجي")).toBeInTheDocument();
    expect(screen.getByText("متجاوز — مزود غير مهيأ")).toBeInTheDocument();
    expect(screen.getByText("قيد الانتظار")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /تشغيل المعلّق \(1\)/ }));
    await waitFor(() => expect(dispatchOutboundQueue).toHaveBeenCalledTimes(1));

    const activateBtn = screen.getByRole("button", { name: /مراجعة وتفعيل/ });
    expect(activateBtn).not.toBeDisabled();
    fireEvent.click(activateBtn);
    fireEvent.click(screen.getByRole("button", { name: "تأكيد التفعيل" }));
    await waitFor(() =>
      expect(setRuleActive).toHaveBeenCalledWith({ id: "rule-email", active: true }),
    );
  });

  it("marks send_sms as skipped_unconfigured when SMS credentials are absent and dispatches via Twilio when configured", async () => {
    const unconfiguredState = createMockDbState();
    unconfiguredState.queue.push({
      id: "eeeeeeee-0000-4000-8000-000000000001",
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "send_sms",
      action_index: 0,
      payload: {
        action_payload: {
          recipient_type: "candidate",
          message: "مرحبًا {{candidate_name}} — تم تحديث طلبك",
        },
      },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });

    const fetcherSpy = vi.fn<FetchFn>();
    const statusRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "status", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(unconfiguredState, { fetcher: fetcherSpy }),
    );
    const statusJson = (await statusRes.json()) as { providers: AutomationProviderStatus };
    expect(statusJson.providers.send_sms?.configured).toBe(false);
    expect(statusJson.providers.send_sms?.code).toBe("SMS_PROVIDER_NOT_CONFIGURED");

    const skipRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(unconfiguredState, { fetcher: fetcherSpy }),
    );
    const skipJson = (await skipRes.json()) as { results: ActionExecutionResult[] };
    expect(fetcherSpy).not.toHaveBeenCalled();
    expect(skipJson.results[0]).toMatchObject({
      actionType: "send_sms",
      status: "skipped_unconfigured",
      code: "SMS_PROVIDER_NOT_CONFIGURED",
    });

    // Twilio configured path
    const twilioState = createMockDbState();
    twilioState.queue.push({
      id: "eeeeeeee-0000-4000-8000-000000000002",
      company_id: COMPANY_ID,
      rule_id: RULE_ID,
      log_id: LOG_ID,
      candidate_id: CANDIDATE_ID,
      action_type: "send_sms",
      action_index: 0,
      payload: {
        action_payload: {
          recipient_type: "candidate",
          message: "تأكيد مقابلة {{job_title}}",
        },
      },
      status: "pending",
      attempt_count: 0,
      last_error: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    });

    const smsRequests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
    const dispatchRes = await edgeRuntime.handleAutomationActionRequest(
      new Request("https://edge.test/execute-automation-actions", {
        method: "POST",
        headers: { Authorization: "Bearer owner-jwt" },
        body: JSON.stringify({ action: "process_queue", activeCompanyId: COMPANY_ID }),
      }),
      makeDeps(twilioState, {
        env: {
          TWILIO_ACCOUNT_SID: "AC123456",
          TWILIO_AUTH_TOKEN: "twilio-secret",
          TWILIO_FROM_NUMBER: "+966500000000",
        },
        fetcher: async (input, init) => {
          smsRequests.push({
            url: String(input),
            headers: (init?.headers as Record<string, string>) || {},
            body: String(init?.body || ""),
          });
          return new Response(JSON.stringify({ sid: "SM_123" }), { status: 201 });
        },
      }),
    );
    const dispatchJson = (await dispatchRes.json()) as { results: ActionExecutionResult[] };
    expect(dispatchJson.results[0]).toMatchObject({
      actionType: "send_sms",
      status: "dispatched",
      code: "completed",
    });
    expect(smsRequests).toHaveLength(1);
    expect(smsRequests[0].url).toContain("api.twilio.com/2010-04-01/Accounts/AC123456/Messages.json");
    expect(validateAutomationActionConfig({ type: "send_sms", payload: { recipient_type: "candidate", message: "hello" } })).toBeNull();
    expect(validateAutomationActionConfig({ type: "send_sms", payload: { recipient_type: "custom", to_phone: "bad", message: "hello" } })).not.toBeNull();
  });

  it("verifies outbound queue migration structure, RLS, service-only claim/complete RPCs, and rule preservation", () => {
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261113170002_automation_outbound_runtime.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.automation_outbound_queue");
    expect(sql).toContain("action_type IN ('send_email', 'send_whatsapp', 'trigger_webhook')");
    expect(sql).toContain("status IN ('pending', 'dispatched', 'failed', 'skipped_unconfigured')");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("public.has_company_access(company_id)");
    expect(sql).toContain("FOR UPDATE OF q SKIP LOCKED");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.claim_automation_outbound_queue(uuid, integer, uuid) TO service_role;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.complete_automation_outbound_item(uuid, text, text, jsonb) TO service_role;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.set_automation_rule_active(uuid, uuid, boolean) TO authenticated;");
    expect(sql).toContain("action_type = 'move_stage'");
    expect(sql).toContain("action_type = 'assign_reviewer'");
    expect(sql).toContain("- 'secret' - 'hmac_secret'");
  });
});
