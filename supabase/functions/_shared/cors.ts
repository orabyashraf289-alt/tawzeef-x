// Shared CORS utility for TawzeefX Edge Functions
// Enforces centralized domain allowlist without wildcard fallbacks for sensitive operations

export const ALLOWED_ORIGINS = [
  "https://www.tawzeefx.com",
  "https://tawzeefx.com",
  "https://tx-hire-buddy-22-main.vercel.app",
];

export const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

const isDev =
  Deno.env.get("SUPABASE_URL")?.includes("localhost") ||
  Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1") ||
  Deno.env.get("ENVIRONMENT") === "development";

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (isDev && DEV_ORIGINS.includes(origin)) return true;
  // Allow official Vercel preview deployments for the Tawzeef project
  if (/^https:\/\/tx-hire-buddy-[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = isOriginAllowed(origin);

  // Return matching origin if allowed, otherwise primary production domain
  const originHeader = allowed ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-company-id, x-internal-secret, x-supabase-client-platform",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// Extended headers for functions that need additional client headers
export function getExtendedCorsHeaders(req: Request): Record<string, string> {
  const base = getCorsHeaders(req);
  return {
    ...base,
    "Access-Control-Allow-Headers": [
      base["Access-Control-Allow-Headers"],
      "x-supabase-client-platform-version",
      "x-supabase-client-runtime",
      "x-supabase-client-runtime-version",
    ].join(", "),
  };
}

export function handleCorsPrelight(req: Request, extended = false): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: extended ? getExtendedCorsHeaders(req) : getCorsHeaders(req),
    });
  }
  return null;
}
