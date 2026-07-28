/**
 * Security utilities for input validation, sanitization, rate limiting, and audit logging.
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

// ─── Input Validation ───
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function detectSuspiciousInput(input: string): boolean {
  if (!input) return false;
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onload=/gi,
    /SELECT\s+.*\s+FROM/gi,
    /UNION\s+SELECT/gi,
    /DROP\s+TABLE/gi,
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

export function translateAuthError(errorMessage: string): string {
  if (!errorMessage) return "حدث خطأ غير متوقع في عملية التحقق";
  const lower = errorMessage.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }
  if (lower.includes("user already registered") || lower.includes("already exists")) {
    return "هذا البريد الإلكتروني مسجل بالفعل، حاول تسجيل الدخول";
  }
  if (lower.includes("email not confirmed")) {
    return "يرجى تأكيد البريد الإلكتروني الخاص بك أولاً عبر الرابط المرسل لبريدك";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "تجاوزت الحد المسموح من المحاولات، يرجى الانتظار بضع دقائق";
  }
  if (lower.includes("password should be at least")) {
    return "يجب أن تكون كلمة المرور 6 أحرف على الأقل";
  }
  return errorMessage;
}

// ─── Rate Limiting ───
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(key: string, maxAttempts = 5, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return true;
  }

  return false;
}

// ─── Password Strength ───
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
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= minLength) score++;
  else suggestions.push(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push("أضف حرفاً كبيراً (A-Z)");

  if (/[0-9]/.test(password)) score++;
  else suggestions.push("أضف رقماً (0-9)");

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push("أضف رمزاً خاصاً (!@#$%^&*)");

  let label = "ضعيفة جداً";
  let color = "text-rose-500";

  if (score >= 4) {
    label = "قوية جداً";
    color = "text-emerald-500";
  } else if (score >= 3) {
    label = "قوية";
    color = "text-teal-500";
  } else if (score >= 2) {
    label = "متوسطة";
    color = "text-amber-500";
  }

  return { score, label, color, suggestions };
}

// ─── Audit Logging ───
export function logAuditEvent(params: {
  eventType: string;
  userId?: string;
  userEmail?: string;
  details?: any;
}) {
  try {
    console.log(`[AUDIT LOG] ${params.eventType}`, {
      timestamp: new Date().toISOString(),
      ...params,
    });
  } catch {}
}

// ─── Encryption / Decryption ───
async function getKey(companyId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(companyId.padEnd(32, "0").slice(0, 32)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("tawzeefx_salt"),
      iterations: 100000,
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
