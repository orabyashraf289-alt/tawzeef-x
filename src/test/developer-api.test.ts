import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  hasApiScope,
  generateTypeScriptSnippet,
  generateCurlSnippet,
  generatePythonSnippet,
  TAWZEEFX_OPENAPI_SPEC,
} from "../lib/developerApiEngine";

describe("Developer API & Public SDK Engine (p5-api & p5-sdk)", () => {
  it("generates a secure API key with live prefix and active status", () => {
    const { rawKey, keyRecord } = generateApiKey("Frontend Integration", ["jobs:read", "candidates:write"]);

    expect(rawKey.startsWith("tx_live_")).toBe(true);
    expect(rawKey.length).toBeGreaterThan(30);
    expect(keyRecord.name).toBe("Frontend Integration");
    expect(keyRecord.status).toBe("active");
    expect(keyRecord.scopes).toContain("jobs:read");
    expect(keyRecord.scopes).toContain("candidates:write");
  });

  it("checks API key scopes accurately", () => {
    const { keyRecord } = generateApiKey("Read Only Key", ["jobs:read"]);

    expect(hasApiScope(keyRecord, "jobs:read")).toBe(true);
    expect(hasApiScope(keyRecord, "jobs:write")).toBe(false);

    // Revoked key check
    keyRecord.status = "revoked";
    expect(hasApiScope(keyRecord, "jobs:read")).toBe(false);
  });

  it("generates runnable TypeScript SDK snippets", () => {
    const code = generateTypeScriptSnippet("tx_live_testkey123");
    expect(code).toContain('import { TawzeefXClient } from "@tawzeefx/sdk"');
    expect(code).toContain("tx_live_testkey123");
    expect(code).toContain("client.jobs.list");
    expect(code).toContain("client.candidates.submit");
  });

  it("generates cURL and Python code snippets", () => {
    const curl = generateCurlSnippet("tx_live_curl_token");
    expect(curl).toContain("curl -X GET");
    expect(curl).toContain("Authorization: Bearer tx_live_curl_token");

    const py = generatePythonSnippet("tx_live_py_token");
    expect(py).toContain("import requests");
    expect(py).toContain("requests.get");
    expect(py).toContain("tx_live_py_token");
  });

  it("provides valid OpenAPI 3.1 specification for core endpoints", () => {
    expect(TAWZEEFX_OPENAPI_SPEC.openapi).toBe("3.1.0");
    expect(TAWZEEFX_OPENAPI_SPEC.paths["/jobs"]).toBeDefined();
    expect(TAWZEEFX_OPENAPI_SPEC.paths["/candidates"]).toBeDefined();
  });
});