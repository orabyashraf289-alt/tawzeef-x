import { describe, it, expect, vi, beforeEach } from "vitest";

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
    // Import API handler dynamically
    const mod = await import("../../api/google-indexing.ts");
    handler = mod.default;
  });

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
      process.env.INTERNAL_SERVICE_SECRET = "test-super-secret-key-12345";

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
