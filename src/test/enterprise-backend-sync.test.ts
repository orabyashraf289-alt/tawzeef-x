import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  generateApiKey,
  getLivePublicApiBaseUrl,
  hashApiKeySha256,
} from "@/lib/developerApiEngine";
import {
  createCompanyApiKey,
  fetchCompanyApiKeys,
  hydrateCompanyEnterpriseSettings,
  revokeCompanyApiKey,
  saveAndSyncComplianceSchedule,
  saveAndSyncEncryptionPolicy,
  saveAndSyncRegionalSettings,
} from "@/lib/enterpriseConfigSync";
import { DEFAULT_REGIONAL_SETTINGS } from "@/lib/regionalSettings";
import { DEFAULT_ENCRYPTION_POLICY } from "@/lib/e2eEncryption";
import { DEFAULT_COMPLIANCE_SCHEDULE } from "@/lib/complianceEngine";

describe("Track 1 — Enterprise Backend Persistence & Public REST API v1", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hashes generated tx_live API keys into deterministic 64-character lowercase SHA-256 hex", async () => {
    const first = generateApiKey("ERP Connector", ["jobs:read", "candidates:write"]);
    const second = generateApiKey("ERP Connector", ["jobs:read", "candidates:write"]);

    expect(first.rawKey).not.toBe(second.rawKey);
    expect(first.rawKey.startsWith("tx_live_")).toBe(true);

    const hashA = await hashApiKeySha256(first.rawKey);
    const hashB = await hashApiKeySha256(first.rawKey);
    const hashC = await hashApiKeySha256(second.rawKey);

    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it("resolves a valid Public API v1 endpoint URL", () => {
    const endpoint = getLivePublicApiBaseUrl();
    expect(endpoint.startsWith("http")).toBe(true);
    expect(endpoint.includes("public-api-v1") || endpoint.includes("api.tawzeefx.com")).toBe(true);
  });

  it("ships a hardened Supabase migration with RLS, SHA-256 hash constraints, and zero auth.users deletions", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase",
      "migrations",
      "20261119160000_enterprise_api_keys_and_company_configs.sql",
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.company_api_keys");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.company_enterprise_settings");
    expect(sql).toContain("ALTER TABLE public.company_api_keys ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.company_enterprise_settings ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE public.company_api_keys FROM PUBLIC, anon");
    expect(sql).toContain("REVOKE ALL ON TABLE public.company_enterprise_settings FROM PUBLIC, anon");
    expect(sql).toContain("^[0-9a-f]{64}$");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+auth\.users/i);
  });

  it("registers public-api-v1 Edge Function with rate limiting, SHA-256 verification, and scope checks", () => {
    const fnPath = path.resolve(process.cwd(), "supabase", "functions", "public-api-v1", "index.ts");
    const configPath = path.resolve(process.cwd(), "supabase", "config.toml");

    expect(fs.existsSync(fnPath)).toBe(true);
    const fnSource = fs.readFileSync(fnPath, "utf-8");
    const configSource = fs.readFileSync(configPath, "utf-8");

    expect(configSource).toContain("[functions.public-api-v1]");
    expect(fnSource).toContain("checkRateLimit");
    expect(fnSource).toContain("sha256Hex");
    expect(fnSource).toContain('hasScope("jobs:read")');
    expect(fnSource).toContain('hasScope("jobs:write")');
    expect(fnSource).toContain('hasScope("candidates:read")');
    expect(fnSource).toContain('hasScope("candidates:write")');
  });

  it("gracefully persists API keys and enterprise configs locally when no companyId is active", async () => {
    const created = await createCompanyApiKey({
      companyId: null,
      name: "Offline Integration",
      scopes: ["jobs:read"],
    });
    expect(created.source).toBe("local");
    expect(created.keyRecord.hashedSecret).toMatch(/^[0-9a-f]{64}$/);

    const listed = await fetchCompanyApiKeys(null);
    expect(listed.keys).toHaveLength(1);
    expect(listed.keys[0].status).toBe("active");

    await revokeCompanyApiKey(null, created.keyRecord.id);
    const afterRevoke = await fetchCompanyApiKeys(null);
    expect(afterRevoke.keys[0].status).toBe("revoked");

    const reg = await saveAndSyncRegionalSettings(null, {
      ...DEFAULT_REGIONAL_SETTINGS,
      currency: "AED",
      calendarMode: "hijri",
    });
    expect(reg.settings.currency).toBe("AED");

    const enc = await saveAndSyncEncryptionPolicy(null, {
      ...DEFAULT_ENCRYPTION_POLICY,
      keyVersion: 3,
    });
    expect(enc.policy.keyVersion).toBe(3);

    const sched = await saveAndSyncComplianceSchedule(null, {
      ...DEFAULT_COMPLIANCE_SCHEDULE,
      cadence: "weekly",
    });
    expect(sched.schedule.cadence).toBe("weekly");

    const hydrated = await hydrateCompanyEnterpriseSettings(null);
    expect(hydrated.regional.currency).toBe("AED");
    expect(hydrated.encryptionPolicy.keyVersion).toBe(3);
    expect(hydrated.complianceSchedule.cadence).toBe("weekly");
  });
});
