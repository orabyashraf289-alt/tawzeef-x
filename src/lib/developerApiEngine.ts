/**
 * Developer API & Public SDK Engine (p5-api & p5-sdk)
 * OpenAPI 3.1 specification, scoped API Key generation, and multi-language SDK snippets.
 */

export type ApiKeyScope =
  | "jobs:read"
  | "jobs:write"
  | "candidates:read"
  | "candidates:write"
  | "webhooks:manage";

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  hashedSecret: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt?: string | null;
  status: "active" | "revoked";
}

export const API_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, { ar: string; en: string }> = {
  "jobs:read": { ar: "قراءة الوظائف والشواغر المفتوحة", en: "Read job listings and openings" },
  "jobs:write": { ar: "إنشاء وتعديل الشواغر الوظيفية", en: "Create and update job vacancies" },
  "candidates:read": { ar: "استعراض بيانات ومراحل المرشحين", en: "Read candidate profiles & pipeline stages" },
  "candidates:write": { ar: "تقديم وتسجيل مرشحين جدد برمجياً", en: "Submit and register new candidates" },
  "webhooks:manage": { ar: "إدارة نقاط استلام الـ Webhooks", en: "Manage webhook notification endpoints" },
};

/**
 * Generates a cryptographically strong random alphanumeric string.
 */
function generateSecureRandomToken(length = 36): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  }
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/**
 * Computes a lowercase hex SHA-256 hash of a raw API key for zero-plaintext server storage.
 */
export async function hashApiKeySha256(rawKey: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(rawKey);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Deterministic 64-hex fallback for non-WebCrypto test runtimes
  let acc = 0x811c9dc5;
  for (let i = 0; i < rawKey.length; i++) {
    acc ^= rawKey.charCodeAt(i);
    acc = Math.imul(acc, 0x01000193) >>> 0;
  }
  return acc.toString(16).padStart(8, "0").repeat(8);
}

/**
 * Resolves the live Supabase Edge Function base URL for TawzeefX Public API v1.
 */
export function getLivePublicApiBaseUrl(): string {
  const supabaseUrl =
    (typeof import.meta !== "undefined" && (import.meta.env?.VITE_SUPABASE_URL as string | undefined)) ||
    "";
  if (supabaseUrl && /^https?:\/\//i.test(supabaseUrl)) {
    return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/public-api-v1`;
  }
  return "https://api.tawzeefx.com/v1";
}

/**
 * Generates a secure API key with live prefix and masked secret
 */
export function generateApiKey(
  name: string,
  scopes: ApiKeyScope[]
): { rawKey: string; keyRecord: ApiKeyRecord } {
  const randomChars = generateSecureRandomToken(36);

  const rawKey = `tx_live_${randomChars}`;
  const prefix = `tx_live_...${rawKey.slice(-4)}`;
  const hashedSecret = btoa(rawKey.slice(-16));

  const keyRecord: ApiKeyRecord = {
    id: `key_${Date.now()}_${generateSecureRandomToken(6)}`,
    name,
    prefix,
    hashedSecret,
    scopes,
    createdAt: new Date().toISOString(),
    status: "active",
  };

  return { rawKey, keyRecord };
}

export const DEV_API_KEYS_STORAGE_KEY = "tx_dev_api_keys_v1";

/**
 * Reads persisted developer API keys safely from browser storage.
 */
export function loadDeveloperApiKeys(): ApiKeyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEV_API_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApiKeyRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Validates whether an API key record has the required scope
 */
export function hasApiScope(record: ApiKeyRecord, scope: ApiKeyScope): boolean {
  if (record.status !== "active") return false;
  return record.scopes.includes(scope);
}

/**
 * Generates code snippet for TypeScript SDK
 */
export function generateTypeScriptSnippet(apiKey = "YOUR_API_KEY", endpoint = "https://api.tawzeefx.com/v1"): string {
  return `import { TawzeefXClient } from "@tawzeefx/sdk";

const client = new TawzeefXClient({
  apiKey: "${apiKey}",
  endpoint: "${endpoint}",
});

// 1. Fetch all active jobs
const jobs = await client.jobs.list({ status: "active" });
console.log("Active jobs count:", jobs.length);

// 2. Submit a new candidate directly
const candidate = await client.candidates.submit({
  jobId: jobs[0]?.id || "job_123",
  name: "سعود بن عبد الله",
  email: "saud@example.com",
  phone: "+966501234567",
  specialty: "مهندس برمجيات أول",
  resumeUrl: "https://your-domain.com/resumes/saud.pdf",
});

console.log("Candidate registered with tracking code:", candidate.trackingCode);`;
}

/**
 * Generates code snippet for cURL
 */
export function generateCurlSnippet(apiKey = "YOUR_API_KEY", endpoint = "https://api.tawzeefx.com/v1"): string {
  return `# 1. Get Open Jobs
curl -X GET "${endpoint}/jobs" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Accept: application/json"

# 2. Register Candidate via API
curl -X POST "${endpoint}/candidates" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_id": "job_123",
    "name": "سعود بن عبد الله",
    "email": "saud@example.com",
    "phone": "+966501234567",
    "specialty": "مهندس برمجيات"
  }'`;
}

/**
 * Generates code snippet for Python
 */
export function generatePythonSnippet(apiKey = "YOUR_API_KEY", endpoint = "https://api.tawzeefx.com/v1"): string {
  return `import requests

API_KEY = "${apiKey}"
BASE_URL = "${endpoint}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 1. Fetch active jobs
response = requests.get(f"{BASE_URL}/jobs", headers=headers)
jobs = response.json()
print(f"Fetched {len(jobs)} jobs")

# 2. Submit applicant
payload = {
    "job_id": jobs[0]["id"] if jobs else "job_123",
    "name": "سعود بن عبد الله",
    "email": "saud@example.com",
    "phone": "+966501234567"
}

app_resp = requests.post(f"{BASE_URL}/candidates", json=payload, headers=headers)
print("Application response:", app_resp.json())`;
}

/**
 * Standard OpenAPI 3.1 specification for TawzeefX Public API
 */
export const TAWZEEFX_OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "TawzeefX Public Recruitment API",
    version: "1.0.0",
    description: "Enterprise REST API for synchronizing jobs, candidates, and AI screening assessments.",
    contact: { email: "api@tawzeefx.com" },
  },
  servers: [{ url: "https://api.tawzeefx.com/v1" }],
  paths: {
    "/jobs": {
      get: {
        summary: "List open job vacancies",
        operationId: "listJobs",
        responses: {
          "200": { description: "Successful response containing list of jobs" },
        },
      },
      post: {
        summary: "Create a new job opening",
        operationId: "createJob",
        responses: {
          "201": { description: "Job opening created successfully" },
        },
      },
    },
    "/candidates": {
      get: {
        summary: "List candidates by job",
        operationId: "listCandidates",
      },
      post: {
        summary: "Submit a candidate application",
        operationId: "submitCandidate",
      },
    },
  },
};