/**
 * Security utilities for input validation, sanitization, and rate limiting.
 */

// ─── Input Sanitization ───
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

export function sanitizeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function sanitizeInput(input: string, maxLength = 500): string {
  return sanitizeHtml(input.trim().slice(0, maxLength));
}

// ─── Password Strength & Customizable Policy ───
export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

export function checkPasswordStrength(password: string, policy?: Partial<PasswordPolicy>): PasswordStrength {
  const minLength = policy?.min_length ?? 8;
  const reqUpper = policy?.require_uppercase ?? true;
  const reqLower = policy?.require_lowercase ?? true;
  const reqNumbers = policy?.require_numbers ?? true;
  const reqSpecial = policy?.require_special ?? true;

  let score = 0;
  const suggestions: string[] = [];
  let totalCriteria = 0;

  // 1. Length criteria
  totalCriteria++;
  if (password.length >= minLength) {
    score++;
  } else {
    suggestions.push(`ألا يقل طول كلمة المرور عن ${minLength} أحرف`);
  }

  // 2. Uppercase criteria
  if (reqUpper) {
    totalCriteria++;
    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      suggestions.push("أن تحتوي على حرف كبير واحد على الأقل");
    }
  }

  // 3. Lowercase criteria
  if (reqLower) {
    totalCriteria++;
    if (/[a-z]/.test(password)) {
      score++;
    } else {
      suggestions.push("أن تحتوي على حرف صغير واحد على الأقل");
    }
  }

  // 4. Number criteria
  if (reqNumbers) {
    totalCriteria++;
    if (/\d/.test(password)) {
      score++;
    } else {
      suggestions.push("أن تحتوي على رقم واحد على الأقل");
    }
  }

  // 5. Special character criteria
  if (reqSpecial) {
    totalCriteria++;
    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      suggestions.push("أن تحتوي على رمز خاص واحد على الأقل (مثال: @، #، $)");
    }
  }

  // Cap score out of criteria met, then scale to 0-4 range
  let normalizedScore = 0;
  if (totalCriteria > 0) {
    normalizedScore = Math.round((score / totalCriteria) * 4);
  } else {
    normalizedScore = 4;
  }
  normalizedScore = Math.min(Math.max(0, normalizedScore), 4);

  // Common password patterns penalty
  const commonPatterns = ["123456", "password", "qwerty", "abc123", "111111", "admin"];
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    normalizedScore = Math.max(0, normalizedScore - 2);
    suggestions.push("تجنب كلمات المرور الشائعة والمكررة");
  }

  const levels: Record<number, { label: string; color: string }> = {
    0: { label: "ضعيفة جداً", color: "hsl(0 84% 60%)" },
    1: { label: "ضعيفة", color: "hsl(25 95% 53%)" },
    2: { label: "متوسطة", color: "hsl(45 93% 47%)" },
    3: { label: "قوية", color: "hsl(142 71% 45%)" },
    4: { label: "قوية جداً", color: "hsl(152 56% 40%)" },
  };

  return { score: normalizedScore, ...levels[normalizedScore], suggestions };
}

// ─── Client-Side Rate Limiter ───
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxAttempts) return true;
  return false;
}

export function getRateLimitRemaining(key: string, maxAttempts: number): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetAt) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}

// ─── CSRF Token (for forms) ───
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Email Validation ───
export function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

// ─── Suspicious Activity Detection ───
export function detectSuspiciousInput(input: string): boolean {
  const patterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\.\w+/i,
    /window\.\w+/i,
    /(<|%3C)\s*\/?\s*(script|iframe|object|embed|form|input|svg)/i,
  ];
  return patterns.some((p) => p.test(input));
}

// ─── AES-GCM Encrypt & Decrypt (p2-e2e) ───
const ENCRYPTION_SALT = "hire_buddy_secure_salt_2026";

async function getKey(companyId: string): Promise<any> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(companyId + ENCRYPTION_SALT);
  
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Crypto API not available");
  }

  const baseKey = await cryptoObj.subtle.importKey(
    "raw",
    rawKey,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("fixed_salt_for_derivation_2026"),
      iterations: 1000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptField(text: string, companyId: string): Promise<string> {
  if (!text || !companyId) return text || "";
  try {
    const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
    if (!cryptoObj || !cryptoObj.subtle) return text;

    const key = await getKey(companyId);
    const enc = new TextEncoder();
    const encoded = enc.encode(text);
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const encrypted = await cryptoObj.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Cross-platform Base64 encoding
    if (typeof btoa !== "undefined") {
      return "enc:" + btoa(String.fromCharCode(...combined));
    } else {
      return "enc:" + Buffer.from(combined).toString("base64");
    }
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
}

export async function decryptField(encryptedText: string, companyId: string): Promise<string> {
  if (!encryptedText || !companyId) return encryptedText || "";
  if (!encryptedText.startsWith("enc:")) return encryptedText;
  
  try {
    const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
    if (!cryptoObj || !cryptoObj.subtle) return encryptedText.replace(/^enc:/, "");

    const base64Text = encryptedText.substring(4);
    const key = await getKey(companyId);
    let bytes: Uint8Array;
    
    if (typeof atob !== "undefined") {
      const binary = atob(base64Text);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    } else {
      bytes = new Uint8Array(Buffer.from(base64Text, "base64"));
    }
    
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const decrypted = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[مُشفر / Encrypted]";
  }
}
