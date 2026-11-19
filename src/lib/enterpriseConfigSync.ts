/**
 * Enterprise Backend Persistence Bridge
 *
 * Synchronizes:
 * - Public API Keys (`public.company_api_keys` with SHA-256 key_hash)
 * - Company-wide Regional Settings (`public.company_enterprise_settings.regional_settings`)
 * - Company-wide E2E Encryption Policy (`public.company_enterprise_settings.encryption_policy` + `companies.e2e_encryption`)
 * - Company-wide SOC 2 / PDPL Compliance Schedule (`public.company_enterprise_settings.compliance_schedule`)
 *
 * Every call maintains an instant localStorage cache and gracefully falls back
 * if the database migration has not yet been applied or the client is offline.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  DEV_API_KEYS_STORAGE_KEY,
  generateApiKey,
  hashApiKeySha256,
  loadDeveloperApiKeys,
  type ApiKeyRecord,
  type ApiKeyScope,
} from "./developerApiEngine";
import {
  DEFAULT_REGIONAL_SETTINGS,
  loadRegionalSettings,
  saveRegionalSettings,
  type RegionalSettings,
} from "./regionalSettings";
import {
  loadTenantEncryptionPolicy,
  saveTenantEncryptionPolicy,
  type TenantEncryptionPolicy,
} from "./e2eEncryption";
import {
  loadComplianceSchedule,
  saveComplianceSchedule,
  type ComplianceReportSchedule,
} from "./complianceEngine";

export type SyncSource = "supabase" | "local";

interface CompanyApiKeyDbRow {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  status: "active" | "revoked";
  last_used_at: string | null;
  created_at: string;
}

interface CompanyEnterpriseSettingsDbRow {
  company_id: string;
  regional_settings: Partial<RegionalSettings> | null;
  encryption_policy: Partial<TenantEncryptionPolicy> | null;
  compliance_schedule: Partial<ComplianceReportSchedule> | null;
  updated_at: string;
}

interface UntypedTableResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

// Helper for newly migrated tables not yet reflected in generated Supabase Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedFrom = (table: string) => (supabase as unknown as { from: (t: string) => any }).from(table);

function persistLocalKeys(keys: ApiKeyRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEV_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // ignore quota errors
  }
}

function mapDbKeyToRecord(row: CompanyApiKeyDbRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    hashedSecret: row.key_hash,
    scopes: (Array.isArray(row.scopes) ? row.scopes : ["jobs:read"]) as ApiKeyScope[],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    status: row.status === "revoked" ? "revoked" : "active",
  };
}

export async function fetchCompanyApiKeys(
  companyId?: string | null,
): Promise<{ keys: ApiKeyRecord[]; source: SyncSource }> {
  const local = loadDeveloperApiKeys();
  if (!companyId) return { keys: local, source: "local" };

  try {
    const res = (await untypedFrom("company_api_keys")
      .select("id, company_id, name, key_prefix, key_hash, scopes, status, last_used_at, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })) as UntypedTableResult<CompanyApiKeyDbRow[]>;

    if (res.error || !Array.isArray(res.data)) {
      return { keys: local, source: "local" };
    }

    const mapped = res.data.map(mapDbKeyToRecord);
    persistLocalKeys(mapped);
    return { keys: mapped, source: "supabase" };
  } catch {
    return { keys: local, source: "local" };
  }
}

export async function createCompanyApiKey(params: {
  companyId?: string | null;
  userId?: string | null;
  name: string;
  scopes: ApiKeyScope[];
}): Promise<{ rawKey: string; keyRecord: ApiKeyRecord; source: SyncSource }> {
  const { rawKey, keyRecord } = generateApiKey(params.name, params.scopes);
  const sha256Hash = await hashApiKeySha256(rawKey);
  const localRecord: ApiKeyRecord = { ...keyRecord, hashedSecret: sha256Hash };

  if (!params.companyId) {
    const updated = [localRecord, ...loadDeveloperApiKeys()];
    persistLocalKeys(updated);
    return { rawKey, keyRecord: localRecord, source: "local" };
  }

  try {
    const res = (await untypedFrom("company_api_keys")
      .insert({
        company_id: params.companyId,
        created_by: params.userId ?? null,
        name: params.name,
        key_prefix: keyRecord.prefix,
        key_hash: sha256Hash,
        scopes: params.scopes,
        status: "active",
      })
      .select("id, company_id, name, key_prefix, key_hash, scopes, status, last_used_at, created_at")
      .single()) as UntypedTableResult<CompanyApiKeyDbRow>;

    if (!res.error && res.data) {
      const serverRecord = mapDbKeyToRecord(res.data);
      const updated = [serverRecord, ...loadDeveloperApiKeys().filter((k) => k.id !== serverRecord.id)];
      persistLocalKeys(updated);
      return { rawKey, keyRecord: serverRecord, source: "supabase" };
    }
  } catch {
    // Graceful local fallback below
  }

  const updated = [localRecord, ...loadDeveloperApiKeys()];
  persistLocalKeys(updated);
  return { rawKey, keyRecord: localRecord, source: "local" };
}

export async function revokeCompanyApiKey(
  companyId: string | null | undefined,
  keyId: string,
): Promise<{ source: SyncSource }> {
  const localUpdated = loadDeveloperApiKeys().map((k) =>
    k.id === keyId ? { ...k, status: "revoked" as const } : k,
  );
  persistLocalKeys(localUpdated);

  if (!companyId) return { source: "local" };

  try {
    const res = (await untypedFrom("company_api_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("company_id", companyId)) as UntypedTableResult<unknown>;

    if (!res.error) return { source: "supabase" };
  } catch {
    // Fallback already saved locally
  }
  return { source: "local" };
}

export async function hydrateCompanyEnterpriseSettings(companyId?: string | null): Promise<{
  regional: RegionalSettings;
  encryptionPolicy: TenantEncryptionPolicy;
  complianceSchedule: ComplianceReportSchedule;
  source: SyncSource;
}> {
  const fallbackRegional = loadRegionalSettings(companyId);
  const fallbackEncryption = loadTenantEncryptionPolicy(companyId);
  const fallbackCompliance = loadComplianceSchedule(companyId);

  if (!companyId) {
    return {
      regional: fallbackRegional,
      encryptionPolicy: fallbackEncryption,
      complianceSchedule: fallbackCompliance,
      source: "local",
    };
  }

  try {
    const res = (await untypedFrom("company_enterprise_settings")
      .select("company_id, regional_settings, encryption_policy, compliance_schedule, updated_at")
      .eq("company_id", companyId)
      .maybeSingle()) as UntypedTableResult<CompanyEnterpriseSettingsDbRow>;

    if (res.error || !res.data) {
      return {
        regional: fallbackRegional,
        encryptionPolicy: fallbackEncryption,
        complianceSchedule: fallbackCompliance,
        source: res.error ? "local" : "supabase",
      };
    }

    const row = res.data;
    const regional =
      row.regional_settings && Object.keys(row.regional_settings).length > 0
        ? saveRegionalSettings(
            { ...DEFAULT_REGIONAL_SETTINGS, ...fallbackRegional, ...row.regional_settings },
            companyId,
          )
        : fallbackRegional;

    const encryptionPolicy =
      row.encryption_policy && Object.keys(row.encryption_policy).length > 0
        ? saveTenantEncryptionPolicy(
            { ...fallbackEncryption, ...row.encryption_policy },
            companyId,
          )
        : fallbackEncryption;

    const complianceSchedule =
      row.compliance_schedule && Object.keys(row.compliance_schedule).length > 0
        ? saveComplianceSchedule(
            { ...fallbackCompliance, ...row.compliance_schedule },
            companyId,
          )
        : fallbackCompliance;

    return {
      regional,
      encryptionPolicy,
      complianceSchedule,
      source: "supabase",
    };
  } catch {
    return {
      regional: fallbackRegional,
      encryptionPolicy: fallbackEncryption,
      complianceSchedule: fallbackCompliance,
      source: "local",
    };
  }
}

async function upsertEnterprisePatch(
  companyId: string,
  userId: string | null | undefined,
  patch: Record<string, unknown>,
): Promise<SyncSource> {
  try {
    const res = (await untypedFrom("company_enterprise_settings").upsert(
      {
        company_id: companyId,
        updated_by: userId ?? null,
        ...patch,
      },
      { onConflict: "company_id" },
    )) as UntypedTableResult<unknown>;
    return res.error ? "local" : "supabase";
  } catch {
    return "local";
  }
}

export async function saveAndSyncRegionalSettings(
  companyId: string | null | undefined,
  settings: RegionalSettings,
  userId?: string | null,
): Promise<{ settings: RegionalSettings; source: SyncSource }> {
  const saved = saveRegionalSettings(settings, companyId);
  if (!companyId) return { settings: saved, source: "local" };
  const source = await upsertEnterprisePatch(companyId, userId, { regional_settings: saved });
  return { settings: saved, source };
}

export async function saveAndSyncEncryptionPolicy(
  companyId: string | null | undefined,
  policy: TenantEncryptionPolicy,
  userId?: string | null,
): Promise<{ policy: TenantEncryptionPolicy; source: SyncSource }> {
  const saved = saveTenantEncryptionPolicy(policy, companyId);
  if (!companyId) return { policy: saved, source: "local" };

  const source = await upsertEnterprisePatch(companyId, userId, { encryption_policy: saved });

  // Also mirror toggle onto companies.e2e_encryption column
  try {
    await supabase
      .from("companies")
      .update({ e2e_encryption: saved.enabled })
      .eq("id", companyId);
  } catch {
    // non-fatal mirror
  }

  return { policy: saved, source };
}

export async function saveAndSyncComplianceSchedule(
  companyId: string | null | undefined,
  schedule: ComplianceReportSchedule,
  userId?: string | null,
): Promise<{ schedule: ComplianceReportSchedule; source: SyncSource }> {
  const saved = saveComplianceSchedule(schedule, companyId);
  if (!companyId) return { schedule: saved, source: "local" };
  const source = await upsertEnterprisePatch(companyId, userId, { compliance_schedule: saved });
  return { schedule: saved, source };
}
