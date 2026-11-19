/**
 * End-to-End Field Encryption Engine (p2-e2e)
 *
 * Uses Web Crypto API (PBKDF2-SHA256 + AES-256-GCM) to protect sensitive candidate
 * and tenant fields (national IDs, personal phone numbers, salary expectations,
 * private evaluation notes, and integration secrets) with authenticated ciphertext.
 *
 * Envelope format: TXENC:v1:<base64-salt>:<base64-iv>:<base64-ciphertext>
 */

export const ENCRYPTION_ENVELOPE_PREFIX = "TXENC:v1:";

export type SensitiveFieldKey =
  | "national_id"
  | "phone"
  | "email"
  | "expected_salary"
  | "notes"
  | "license_number";

export interface TenantEncryptionPolicy {
  enabled: boolean;
  algorithm: "AES-256-GCM";
  keyDerivation: "PBKDF2-SHA256";
  encryptedFields: SensitiveFieldKey[];
  keyVersion: number;
  lastRotatedAt: string;
}

export const DEFAULT_ENCRYPTION_POLICY: TenantEncryptionPolicy = {
  enabled: true,
  algorithm: "AES-256-GCM",
  keyDerivation: "PBKDF2-SHA256",
  encryptedFields: ["national_id", "phone", "expected_salary", "notes"],
  keyVersion: 1,
  lastRotatedAt: new Date().toISOString(),
};

const POLICY_STORAGE_PREFIX = "tx_e2e_encryption_policy_v1";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Web Crypto API (SubtleCrypto) is unavailable in this environment.");
  }
  return cryptoObj.subtle;
}

export function isEncryptedEnvelope(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTION_ENVELOPE_PREFIX);
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM with random 16-byte salt and 12-byte IV.
 */
export async function encryptSensitiveValue(
  plaintext: string,
  passphrase: string,
): Promise<string> {
  if (!passphrase || passphrase.trim().length < 6) {
    throw new Error("Encryption passphrase must be at least 6 characters.");
  }
  if (isEncryptedEnvelope(plaintext)) return plaintext;

  const subtle = getSubtleCrypto();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded,
  );

  return `${ENCRYPTION_ENVELOPE_PREFIX}${toBase64(salt)}:${toBase64(iv)}:${toBase64(
    new Uint8Array(cipherBuffer),
  )}`;
}

/**
 * Decrypt a TXENC:v1 envelope using AES-256-GCM. Throws if passphrase is invalid or data was tampered.
 */
export async function decryptSensitiveValue(
  envelope: string,
  passphrase: string,
): Promise<string> {
  if (!isEncryptedEnvelope(envelope)) return envelope;
  const payload = envelope.slice(ENCRYPTION_ENVELOPE_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted envelope.");
  }

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = fromBase64(saltB64);
  const iv = fromBase64(ivB64);
  const ciphertext = fromBase64(cipherB64);

  const subtle = getSubtleCrypto();
  const key = await deriveAesKey(passphrase, salt);
  const plainBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Encrypt selected string fields on a candidate or tenant record before persistence.
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  record: T,
  fields: SensitiveFieldKey[],
  passphrase: string,
): Promise<T> {
  const clone: Record<string, unknown> = { ...record };
  for (const field of fields) {
    const val = clone[field];
    if (typeof val === "string" && val.trim().length > 0 && !isEncryptedEnvelope(val)) {
      clone[field] = await encryptSensitiveValue(val, passphrase);
    }
  }
  return clone as T;
}

/**
 * Decrypt selected encrypted fields on a record when authorized.
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  record: T,
  fields: SensitiveFieldKey[],
  passphrase: string,
): Promise<T> {
  const clone: Record<string, unknown> = { ...record };
  for (const field of fields) {
    const val = clone[field];
    if (isEncryptedEnvelope(val)) {
      clone[field] = await decryptSensitiveValue(val, passphrase);
    }
  }
  return clone as T;
}

/**
 * Mask a sensitive string for safe audit logging or redacted UI display.
 */
export function maskSensitiveValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isEncryptedEnvelope(trimmed)) return "🔒 [AES-256-GCM Encrypted]";
  if (trimmed.length <= 4) return "****";
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-2)}`;
}

export function loadTenantEncryptionPolicy(companyId?: string | null): TenantEncryptionPolicy {
  if (typeof window === "undefined") return { ...DEFAULT_ENCRYPTION_POLICY };
  try {
    const key = companyId ? `${POLICY_STORAGE_PREFIX}:${companyId}` : POLICY_STORAGE_PREFIX;
    const raw = localStorage.getItem(key) ?? localStorage.getItem(POLICY_STORAGE_PREFIX);
    if (!raw) return { ...DEFAULT_ENCRYPTION_POLICY };
    const parsed = JSON.parse(raw) as Partial<TenantEncryptionPolicy>;
    return {
      ...DEFAULT_ENCRYPTION_POLICY,
      ...parsed,
      encryptedFields: Array.isArray(parsed.encryptedFields)
        ? (parsed.encryptedFields as SensitiveFieldKey[])
        : DEFAULT_ENCRYPTION_POLICY.encryptedFields,
    };
  } catch {
    return { ...DEFAULT_ENCRYPTION_POLICY };
  }
}

export function saveTenantEncryptionPolicy(
  policy: TenantEncryptionPolicy,
  companyId?: string | null,
): TenantEncryptionPolicy {
  const next: TenantEncryptionPolicy = { ...policy };
  if (typeof window !== "undefined") {
    try {
      const key = companyId ? `${POLICY_STORAGE_PREFIX}:${companyId}` : POLICY_STORAGE_PREFIX;
      const serialized = JSON.stringify(next);
      localStorage.setItem(key, serialized);
      localStorage.setItem(POLICY_STORAGE_PREFIX, serialized);
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}
