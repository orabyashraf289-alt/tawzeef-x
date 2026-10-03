import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  jobExists: true,
  jobError: false,
  memberCount: 1,
  logInsert: vi.fn(async () => ({ error: null })),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "test-caller" } }, error: null })) },
    from: vi.fn((table: string) => {
      let jobId = "";
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((key: string, value: string) => { if (key === "id") jobId = value; return builder; }),
        maybeSingle: vi.fn(async () => ({
          data: table === "jobs" && mocks.jobExists ? { id: jobId, company_id: "test-company", status: "active" } : null,
          error: table === "jobs" && mocks.jobError ? { message: "database unavailable" } : null,
        })),
        insert: mocks.logInsert,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: mocks.memberCount, error: null }).then(resolve),
      };
      return builder;
    }),
  })),
}));

// Mock request and response helpers for testing serverless API handler
function createMockReqRes(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const req = {
    method: options.method || "POST",
    headers: options.headers || {},
    body: options.body || {},
    socket: { remoteAddress: "127.0.0.1" },
  };

  const resData: {
    statusCode: number;
    headers: Record<string, string>;
    jsonBody: any;
    ended: boolean;
  } = {
    statusCode: 200,
    headers: {},
    jsonBody: null,
    ended: false,
  };

  const res = {
    setHeader(name: string, value: string) {
      resData.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      resData.statusCode = code;
      return res;
    },
    json(data: any) {
      resData.jsonBody = data;
      return res;
    },
    end() {
      resData.ended = true;
      return res;
    },
    _get: () => resData,
  };

  return { req, res, resData };
}

describe("PROMPT 06: Google Indexing API Security Controls", () => {
  let handler: any;

  beforeEach(async () => {
    mocks.jobExists = true;
    mocks.jobError = false;
    mocks.memberCount = 1;
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    vi.stubEnv("INTERNAL_SERVICE_SECRET", "test-super-secret-key-12345");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "");
    // Import API handler dynamically
    const mod = await import("../../api/google-indexing.ts");
    handler = mod.default;
  });
  afterEach(() => vi.unstubAllEnvs());

  describe("Authentication & Access Enforcement", () => {
    it("REJECTS anonymous requests with 401 Unauthorized", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "POST",
        headers: {}, // No authorization header, no internal secret
        body: {
          jobId: "11111111-1111-1111-1111-111111111111",
          action: "URL_UPDATED",
        },
      });

      await handler(req, res);

      expect(resData.statusCode).toBe(401);
      expect(resData.jsonBody?.error).toContain("Unauthorized");
    });

    it("ALLOWS requests possessing the valid internal service secret", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "POST",
        headers: {
          "x-internal-secret": "test-super-secret-key-12345",
        },
        body: {
          jobId: "11111111-1111-1111-1111-111111111111",
          action: "URL_UPDATED",
        },
      });

      await handler(req, res);

      // Not 401: Authentication check succeeded! (Proceeds to service account check which is not configured in test)
      expect(resData.statusCode).not.toBe(401);
    });
  });

  describe("Server-only logging and job authorization", () => {
    const jobId = "11111111-1111-1111-1111-111111111111";
    it("requires a service key instead of falling back to the anonymous key", async () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
      vi.stubEnv("SUPABASE_ANON_KEY", "test-anonymous-key");
      const { req, res, resData } = createMockReqRes({ headers: { "x-internal-secret": "test-super-secret-key-12345" }, body: { jobId } });
      await handler(req, res);
      expect(resData.statusCode).toBe(503);
      expect(mocks.logInsert).not.toHaveBeenCalled();
    });
    it("rejects a member's request for a missing job before logging or submission", async () => {
      mocks.jobExists = false;
      const { req, res, resData } = createMockReqRes({ headers: { authorization: "Bearer test-token" }, body: { jobId, action: "URL_DELETED" } });
      await handler(req, res);
      expect(resData.statusCode).toBe(404);
      expect(mocks.logInsert).not.toHaveBeenCalled();
    });
    it("rejects a member outside the job's company", async () => {
      mocks.memberCount = 0;
      const { req, res, resData } = createMockReqRes({ headers: { authorization: "Bearer test-token" }, body: { jobId } });
      await handler(req, res);
      expect(resData.statusCode).toBe(403);
      expect(mocks.logInsert).not.toHaveBeenCalled();
    });
    it("fails closed when the job lookup errors", async () => {
      mocks.jobError = true;
      const { req, res, resData } = createMockReqRes({ headers: { "x-internal-secret": "test-super-secret-key-12345" }, body: { jobId, action: "URL_DELETED" } });
      await handler(req, res);
      expect(resData.statusCode).toBe(503);
      expect(mocks.logInsert).not.toHaveBeenCalled();
    });
    it("logs a verified member's submission using the server-resolved job", async () => {
      const { req, res, resData } = createMockReqRes({ headers: { authorization: "Bearer test-token" }, body: { jobId } });
      await handler(req, res);
      expect(resData.statusCode).toBe(200);
      expect(mocks.logInsert).toHaveBeenCalledWith(expect.objectContaining({ job_id: jobId, status: "NOT_CONFIGURED" }));
    });
    it("logs a trusted removal of a missing job with a null foreign key", async () => {
      mocks.jobExists = false;
      const { req, res, resData } = createMockReqRes({ headers: { "x-internal-secret": "test-super-secret-key-12345" }, body: { jobId, action: "URL_DELETED" } });
      await handler(req, res);
      expect(resData.statusCode).toBe(200);
      expect(mocks.logInsert).toHaveBeenCalledWith(expect.objectContaining({ job_id: null }));
    });
  });

  describe("Input Validation & Server-Side Canonical URL Building", () => {
    it("REJECTS non-POST HTTP methods with 405 Method Not Allowed", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "GET",
        headers: { "x-internal-secret": "test-super-secret-key-12345" },
      });

      await handler(req, res);

      expect(resData.statusCode).toBe(405);
    });

    it("REJECTS invalid actions (not URL_UPDATED or URL_DELETED) with 400 Bad Request", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "POST",
        headers: { "x-internal-secret": "test-super-secret-key-12345" },
        body: {
          jobId: "11111111-1111-1111-1111-111111111111",
          action: "INVALID_ACTION_ATTACK",
        },
      });

      await handler(req, res);

      expect(resData.statusCode).toBe(400);
      expect(resData.jsonBody?.error).toContain("Invalid action");
    });

    it("REJECTS invalid or non-UUID jobId formats with 400 Bad Request", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "POST",
        headers: { "x-internal-secret": "test-super-secret-key-12345" },
        body: {
          jobId: "../../etc/passwd",
          action: "URL_UPDATED",
        },
      });

      await handler(req, res);

      expect(resData.statusCode).toBe(400);
      expect(resData.jsonBody?.error).toContain("Invalid jobId format");
    });

    it("enforces canonical URL formatting server-side for valid UUIDs", async () => {
      const validUuid = "a2b3c4d5-e6f7-4a1b-8c2d-3e4f5a6b7c8d";
      const { req, res, resData } = createMockReqRes({
        method: "POST",
        headers: { "x-internal-secret": "test-super-secret-key-12345" },
        body: {
          jobId: validUuid,
          action: "URL_UPDATED",
        },
      });

      await handler(req, res);

      // Verify that the canonical URL returned in the response contains /apply/{uuid}
      expect(resData.jsonBody?.url).toContain(`/apply/${validUuid}`);
    });
  });

  describe("CORS Security Allowlist", () => {
    it("sets Access-Control-Allow-Origin strictly to allowed domain and NEVER wildcard (*)", async () => {
      const { req, res, resData } = createMockReqRes({
        method: "OPTIONS",
        headers: { origin: "https://www.tawzeefx.com" },
      });

      await handler(req, res);

      expect(resData.headers["access-control-allow-origin"]).toBe("https://www.tawzeefx.com");
      expect(resData.headers["access-control-allow-origin"]).not.toBe("*");
    });
  });
});
