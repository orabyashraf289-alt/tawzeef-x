import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "audit_log") {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: "1", event_type: "login.success", user_email: "a@b.com", created_at: new Date().toISOString(), details: {} },
                  { id: "2", event_type: "role.changed", user_email: "a@b.com", created_at: new Date().toISOString(), details: { old_role: "recruiter", new_role: "admin" } },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return { insert: vi.fn(), select: vi.fn() };
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("Audit Log Event Types", () => {
  const validEvents = [
    "login.success", "login.failed", "login.otp_failed",
    "role.changed", "role.deleted",
    "offer.accepted", "offer.rejected", "offer.sent",
    "member.invited", "member.deleted",
    "data.exported", "settings.changed",
  ];

  it("defines all expected event types", () => {
    expect(validEvents).toHaveLength(12);
  });

  it("includes login events", () => {
    const loginEvents = validEvents.filter(e => e.startsWith("login."));
    expect(loginEvents).toHaveLength(3);
  });

  it("includes offer events", () => {
    const offerEvents = validEvents.filter(e => e.startsWith("offer."));
    expect(offerEvents).toHaveLength(3);
  });

  it("includes member management events", () => {
    const memberEvents = validEvents.filter(e => e.startsWith("member."));
    expect(memberEvents).toHaveLength(2);
  });
});

describe("Audit Log Data Structure", () => {
  it("creates valid audit entry", () => {
    const entry = {
      event_type: "login.success",
      user_id: "user-123",
      user_email: "test@example.com",
      details: { ip: "192.168.1.1" },
    };

    expect(entry.event_type).toBeDefined();
    expect(entry.user_id).toBeDefined();
    expect(entry.details).toBeTypeOf("object");
  });

  it("allows null user for anonymous events", () => {
    const entry = {
      event_type: "login.failed",
      user_id: null,
      user_email: "attacker@bad.com",
      details: { reason: "invalid_password" },
    };

    expect(entry.user_id).toBeNull();
    expect(entry.user_email).toBeDefined();
  });

  it("supports detailed role change tracking", () => {
    const entry = {
      event_type: "role.changed",
      user_id: "admin-1",
      user_email: "admin@co.com",
      details: {
        target_user_id: "user-2",
        old_role: "recruiter",
        new_role: "admin",
      },
    };

    expect(entry.details.old_role).toBe("recruiter");
    expect(entry.details.new_role).toBe("admin");
    expect(entry.details.target_user_id).toBeDefined();
  });
});

describe("Audit Log Filtering", () => {
  const logs = [
    { event_type: "login.success", created_at: "2024-01-10T10:00:00Z" },
    { event_type: "login.failed", created_at: "2024-01-10T11:00:00Z" },
    { event_type: "role.changed", created_at: "2024-01-11T09:00:00Z" },
    { event_type: "offer.sent", created_at: "2024-01-12T14:00:00Z" },
    { event_type: "login.failed", created_at: "2024-01-12T15:00:00Z" },
  ];

  it("filters by event type", () => {
    const failed = logs.filter(l => l.event_type === "login.failed");
    expect(failed).toHaveLength(2);
  });

  it("filters by date range", () => {
    const start = "2024-01-11T00:00:00Z";
    const end = "2024-01-12T23:59:59Z";
    const filtered = logs.filter(l => l.created_at >= start && l.created_at <= end);
    expect(filtered).toHaveLength(3);
  });

  it("groups events by type", () => {
    const grouped = logs.reduce((acc, l) => {
      acc[l.event_type] = (acc[l.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(grouped["login.failed"]).toBe(2);
    expect(grouped["login.success"]).toBe(1);
  });
});
