import { describe, expect, it } from "vitest";
import {
  buildIcsFeed,
  escapeIcsText,
  filterUpcomingInterviews,
  foldIcsLine,
  formatIcsDateUtc,
  handleCalendarFeedRequest,
  resolveInterviewWindow,
  sanitizeIcsUri,
  signCalendarFeedToken,
  verifyCalendarFeedToken,
  type CalendarFeedRuntimeDeps,
  type CalendarInterviewRecord,
  type MinimalSupabaseClient,
  type SupabaseFilterBuilder,
} from "../../supabase/functions/calendar-ics-feed/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const TEST_SECRET = "test-calendar-feed-hmac-secret-32chars!";
const TEST_ANON_KEY = "anon-public-key-must-never-bypass-auth";
const TEST_SERVICE_KEY = "service-role-key-internal-only";

describe("calendar-ics-feed RFC 5545 formatting", () => {
  it("formats a complete VCALENDAR with CRLF line endings and UTC instants", () => {
    const fixedNow = new Date("2026-11-10T08:00:00Z");
    const interviews: CalendarInterviewRecord[] = [
      {
        id: "int-101",
        candidate_name: "سارة أحمد",
        position: "مهندسة برمجيات, أولى; الفريق الأساسي",
        date: "2026-11-12",
        time: "14:00:00",
        starts_at: "2026-11-12T11:00:00Z",
        time_zone: "Asia/Riyadh",
        duration_minutes: 45,
        type: "عن بُعد",
        interviewer: "خالد المنصور",
        meeting_url: "https://meet.jit.si/tawzeef-room-101",
        notes: "مراجعة الخبرة\nوالأنظمة الموزعة",
        status: "مجدولة",
        updated_at: "2026-11-10T07:30:00Z",
        company_id: COMPANY_ID,
      },
    ];

    const ics = buildIcsFeed(interviews, {
      companyName: "شركة التقنية, المحدودة",
      now: fixedNow,
    });

    expect(ics).toContain("\r\n");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("PRODID:-//Tawzeef-X//Interview Calendar Feed//EN\r\n");
    expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
    expect(ics).toContain("METHOD:PUBLISH\r\n");
    expect(ics).toContain("UID:interview-int-101@tawzeefx.com\r\n");
    expect(ics).toContain("DTSTAMP:20261110T073000Z\r\n");
    expect(ics).toContain("DTSTART:20261112T110000Z\r\n");
    expect(ics).toContain("DTEND:20261112T114500Z\r\n");
    expect(ics).toContain("URL:https://meet.jit.si/tawzeef-room-101\r\n");
    expect(ics).toContain("END:VEVENT\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");

    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("X-WR-CALNAME:Tawzeef-X Interviews - شركة التقنية\\, المحدودة");
    expect(unfolded).toContain("SUMMARY:Interview: سارة أحمد - مهندسة برمجيات\\, أولى\\; الفريق الأساسي");
    expect(unfolded).toContain("Notes: مراجعة الخبرة\\nوالأنظمة الموزعة");
  });

  it("folds long UTF-8 lines at <= 75 octets without corrupting multi-byte characters", () => {
    const longArabic = `SUMMARY:${"أ".repeat(60)}`;
    const folded = foldIcsLine(longArabic);
    const physicalLines = folded.split("\r\n");

    expect(physicalLines.length).toBeGreaterThan(1);
    const encoder = new TextEncoder();
    for (let i = 0; i < physicalLines.length; i += 1) {
      expect(encoder.encode(physicalLines[i]).length).toBeLessThanOrEqual(75);
      if (i > 0) {
        expect(physicalLines[i].startsWith(" ")).toBe(true);
      }
    }
    expect(folded.replace(/\r\n /g, "")).toBe(longArabic);
  });

  it("escapes RFC 5545 delimiters and strips control bytes to block ICS injection", () => {
    const dirty = "Hello, world; test\\path\r\nEND:VEVENT\x00\x07";
    const escaped = escapeIcsText(dirty);
    expect(escaped).toBe("Hello\\, world\\; test\\\\path\\nEND:VEVENT");
    expect(escaped).not.toContain("\r");
    expect(escaped).not.toContain("\n");
  });

  it("sanitizes meeting URLs and rejects javascript: or invalid schemes", () => {
    expect(sanitizeIcsUri("https://meet.jit.si/room-1")).toBe("https://meet.jit.si/room-1");
    expect(sanitizeIcsUri("javascript:alert(1)")).toBeNull();
    expect(sanitizeIcsUri("data:text/html,hi")).toBeNull();
    expect(sanitizeIcsUri("not a url")).toBeNull();
  });

  it("resolves legacy date + time + time_zone rows across midnight accurately", () => {
    const window = resolveInterviewWindow({
      id: "legacy-1",
      candidate_name: "Omar",
      position: "Designer",
      date: "2026-11-05",
      time: "23:45:00",
      time_zone: "Asia/Riyadh", // UTC+3 => 20:45Z
      duration_minutes: 30,
    });

    expect(window).not.toBeNull();
    expect(formatIcsDateUtc(window!.start)).toBe("20261105T204500Z");
    expect(formatIcsDateUtc(window!.end)).toBe("20261105T211500Z");
  });

  it("filters out past, cancelled, and completed interviews and sorts upcoming ones", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const rows: CalendarInterviewRecord[] = [
      {
        id: "past",
        candidate_name: "Past",
        position: "Dev",
        date: "2026-11-12",
        time: "08:00:00",
        starts_at: "2026-11-12T08:00:00Z",
        duration_minutes: 30,
        status: "مجدولة",
      },
      {
        id: "cancelled",
        candidate_name: "Cancelled",
        position: "Dev",
        date: "2026-11-12",
        time: "14:00:00",
        starts_at: "2026-11-12T14:00:00Z",
        duration_minutes: 30,
        status: "ملغاة",
      },
      {
        id: "completed",
        candidate_name: "Completed",
        position: "Dev",
        date: "2026-11-12",
        time: "15:00:00",
        starts_at: "2026-11-12T15:00:00Z",
        duration_minutes: 30,
        status: "مكتملة",
      },
      {
        id: "later",
        candidate_name: "Later",
        position: "PM",
        date: "2026-11-13",
        time: "10:00:00",
        starts_at: "2026-11-13T10:00:00Z",
        duration_minutes: 30,
        status: "مجدولة",
      },
      {
        id: "sooner",
        candidate_name: "Sooner",
        position: "QA",
        date: "2026-11-12",
        time: "11:00:00",
        starts_at: "2026-11-12T11:00:00Z",
        duration_minutes: 30,
        status: "مجدولة",
      },
    ];

    const upcoming = filterUpcomingInterviews(rows, now);
    expect(upcoming.map((r) => r.id)).toEqual(["sooner", "later"]);
  });
});

describe("calendar-ics-feed HMAC token signing & verification", () => {
  it("signs and verifies a valid subscription token", async () => {
    const issuedAt = 1_794_560_000;
    const token = await signCalendarFeedToken(
      { sub: USER_ID, companyId: COMPANY_ID, ttlSeconds: 3600, nowSeconds: issuedAt },
      TEST_SECRET,
    );

    const verified = await verifyCalendarFeedToken(token, TEST_SECRET, issuedAt + 60);
    expect(verified.valid).toBe(true);
    expect(verified.payload).toEqual({
      v: 1,
      sub: USER_ID,
      companyId: COMPANY_ID,
      iat: issuedAt,
      exp: issuedAt + 3600,
    });
  });

  it("rejects tampered tokens, wrong secrets, and expired tokens", async () => {
    const issuedAt = 1_794_560_000;
    const token = await signCalendarFeedToken(
      { sub: USER_ID, companyId: COMPANY_ID, ttlSeconds: 600, nowSeconds: issuedAt },
      TEST_SECRET,
    );

    const [payloadPart, sigPart] = token.split(".");
    const tampered = `${payloadPart}A.${sigPart}`;
    expect((await verifyCalendarFeedToken(tampered, TEST_SECRET, issuedAt + 10)).valid).toBe(false);

    expect((await verifyCalendarFeedToken(token, "completely-different-secret-key!", issuedAt + 10)).valid)
      .toBe(false);

    const expired = await verifyCalendarFeedToken(token, TEST_SECRET, issuedAt + 601);
    expect(expired.valid).toBe(false);
    expect(expired.reason).toBe("token_expired");
  });

  it("refuses empty or whitespace secrets without insecure fallback", async () => {
    await expect(
      signCalendarFeedToken({ sub: USER_ID, companyId: COMPANY_ID }, ""),
    ).rejects.toThrow();

    await expect(
      signCalendarFeedToken({ sub: USER_ID, companyId: COMPANY_ID }, "   "),
    ).rejects.toThrow();

    const result = await verifyCalendarFeedToken("abc.def", "");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing_secret");
  });
});

interface MockDbState {
  authUser: { id: string; is_anonymous?: boolean } | null;
  isSuperAdmin?: boolean;
  company?: { id: string; name: string; status: string; parent_company_id?: string | null; owner_user_id?: string | null; user_id?: string | null } | null;
  isMember?: boolean;
  userRole?: string | null;
  interviews?: CalendarInterviewRecord[];
}

function createMockSupabase(state: MockDbState): MinimalSupabaseClient {
  return {
    auth: {
      async getUser(token?: string) {
        if (!token || token !== "valid-user-jwt" || !state.authUser) {
          return { data: { user: null }, error: { message: "Invalid JWT" } };
        }
        return { data: { user: state.authUser }, error: null };
      },
    },
    from<T = Record<string, unknown>>(table: string) {
      const filters: Record<string, unknown> = {};
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: string) {
          filters[col] = val;
          return builder;
        },
        in(col: string, vals: string[]) {
          filters[col] = vals;
          return builder;
        },
        or() {
          return builder;
        },
        gte() {
          return builder;
        },
        not() {
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        async maybeSingle() {
          if (table === "platform_roles") {
            return {
              data: (state.isSuperAdmin ? { role: "super_admin" } : null) as T | null,
              error: null,
            };
          }
          if (table === "companies") {
            const match = state.company && (!filters.id || filters.id === state.company.id)
              ? state.company
              : null;
            return { data: match as T | null, error: null };
          }
          if (table === "company_members") {
            const match = state.isMember && state.company
              ? { company_id: state.company.id, member_role: "recruiter" }
              : null;
            return { data: match as T | null, error: null };
          }
          if (table === "user_roles") {
            return {
              data: (state.userRole ? { role: state.userRole } : null) as T | null,
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then(
          onfulfilled?: ((value: { data: T[] | null; error: null }) => unknown) | null,
        ) {
          let rows: unknown[] = [];
          if (table === "company_members") {
            rows = state.isMember && state.company
              ? [{ company_id: state.company.id, member_role: "recruiter" }]
              : [];
          } else if (table === "companies") {
            rows = state.company && state.company.status === "active" ? [state.company] : [];
          } else if (table === "interviews") {
            rows = (state.interviews || []).filter((item) =>
              !filters.company_id || item.company_id === filters.company_id
            );
          }
          return Promise.resolve({ data: rows as T[], error: null }).then(onfulfilled ?? undefined);
        },
      };
      return builder as unknown as SupabaseFilterBuilder<T>;
    },
  };
}

function makeDeps(state: MockDbState, secret = TEST_SECRET): CalendarFeedRuntimeDeps {
  const client = createMockSupabase(state);
  return {
    createClient: () => client,
    getCorsHeaders: () => ({ "Access-Control-Allow-Origin": "https://www.tawzeefx.com" }),
    getEnv: (key: string) => {
      const map: Record<string, string> = {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: TEST_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_KEY,
        CALENDAR_FEED_SECRET: secret,
      };
      return map[key];
    },
    now: () => new Date("2026-11-12T09:00:00Z"),
  };
}

describe("calendar-ics-feed HTTP handler security & tenant isolation", () => {
  it("rejects unauthenticated requests and anonKey bypass attempts with 401", async () => {
    const deps = makeDeps({ authUser: { id: USER_ID } });

    const noAuth = await handleCalendarFeedRequest(
      new Request("https://example.supabase.co/functions/v1/calendar-ics-feed"),
      deps,
    );
    expect(noAuth.status).toBe(401);

    const anonBypass = await handleCalendarFeedRequest(
      new Request("https://example.supabase.co/functions/v1/calendar-ics-feed", {
        headers: { Authorization: `Bearer ${TEST_ANON_KEY}` },
      }),
      deps,
    );
    expect(anonBypass.status).toBe(401);
  });

  it("fails closed with 503 if CALENDAR_FEED_SECRET is missing for signed tokens", async () => {
    const deps = makeDeps({ authUser: { id: USER_ID } }, "");
    const res = await handleCalendarFeedRequest(
      new Request("https://example.supabase.co/functions/v1/calendar-ics-feed?token=some.token"),
      deps,
    );
    expect(res.status).toBe(503);
  });

  it("denies access (403) when tenant is suspended or user is not a member", async () => {
    const nowSeconds = Math.floor(new Date("2026-11-12T09:00:00Z").getTime() / 1000);
    const token = await signCalendarFeedToken(
      { sub: USER_ID, companyId: COMPANY_ID, ttlSeconds: 3600, nowSeconds },
      TEST_SECRET,
    );

    const nonMemberDeps = makeDeps({
      authUser: { id: USER_ID },
      company: { id: COMPANY_ID, name: "Acme", status: "active" },
      isMember: false,
    });
    const resNonMember = await handleCalendarFeedRequest(
      new Request(`https://example.supabase.co/functions/v1/calendar-ics-feed?token=${encodeURIComponent(token)}`),
      nonMemberDeps,
    );
    expect(resNonMember.status).toBe(403);

    const suspendedDeps = makeDeps({
      authUser: { id: USER_ID },
      company: { id: COMPANY_ID, name: "Acme", status: "suspended" },
      isMember: true,
    });
    const resSuspended = await handleCalendarFeedRequest(
      new Request(`https://example.supabase.co/functions/v1/calendar-ics-feed?token=${encodeURIComponent(token)}`),
      suspendedDeps,
    );
    expect(resSuspended.status).toBe(403);

    const activeDeps = makeDeps({
      authUser: { id: USER_ID },
      company: { id: COMPANY_ID, name: "Acme", status: "active" },
      isMember: true,
    });
    const resScopeTamper = await handleCalendarFeedRequest(
      new Request(
        `https://example.supabase.co/functions/v1/calendar-ics-feed?token=${encodeURIComponent(token)}&companyId=${OTHER_COMPANY_ID}`,
      ),
      activeDeps,
    );
    expect(resScopeTamper.status).toBe(403);
  });

  it("returns RFC 5545 text/calendar scoped strictly to authorized company", async () => {
    const nowSeconds = Math.floor(new Date("2026-11-12T09:00:00Z").getTime() / 1000);
    const token = await signCalendarFeedToken(
      { sub: USER_ID, companyId: COMPANY_ID, ttlSeconds: 3600, nowSeconds },
      TEST_SECRET,
    );

    const deps = makeDeps({
      authUser: { id: USER_ID },
      company: { id: COMPANY_ID, name: "Acme Corp", status: "active" },
      isMember: true,
      interviews: [
        {
          id: "c1-interview",
          candidate_name: "Noura",
          position: "Frontend Engineer",
          date: "2026-11-15",
          time: "12:00:00",
          starts_at: "2026-11-15T09:00:00Z",
          duration_minutes: 45,
          status: "مجدولة",
          company_id: COMPANY_ID,
        },
        {
          id: "other-tenant-interview",
          candidate_name: "LeakAttempt",
          position: "Secret Role",
          date: "2026-11-15",
          time: "12:00:00",
          starts_at: "2026-11-15T09:00:00Z",
          duration_minutes: 45,
          status: "مجدولة",
          company_id: OTHER_COMPANY_ID,
        },
      ],
    });

    const res = await handleCalendarFeedRequest(
      new Request(`https://example.supabase.co/functions/v1/calendar-ics-feed?token=${encodeURIComponent(token)}`),
      deps,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    const body = await res.text();
    expect(body).toContain("UID:interview-c1-interview@tawzeefx.com");
    expect(body).not.toContain("LeakAttempt");
  });

  it("mints signed feed URL on POST for authenticated active company member", async () => {
    const deps = makeDeps({
      authUser: { id: USER_ID },
      company: { id: COMPANY_ID, name: "Acme Corp", status: "active" },
      isMember: true,
    });

    const res = await handleCalendarFeedRequest(
      new Request("https://example.supabase.co/functions/v1/calendar-ics-feed", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-user-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId: COMPANY_ID, ttlSeconds: 7200 }),
      }),
      deps,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { token: string; feedUrl: string; companyId: string };
    expect(json.companyId).toBe(COMPANY_ID);
    expect(json.feedUrl).toContain("/functions/v1/calendar-ics-feed?token=");
    const nowSeconds = Math.floor(new Date("2026-11-12T09:00:00Z").getTime() / 1000);
    const verified = await verifyCalendarFeedToken(json.token, TEST_SECRET, nowSeconds + 10);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.sub).toBe(USER_ID);
  });
});
