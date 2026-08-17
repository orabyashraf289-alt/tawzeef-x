// Shared CORS utility for TawzeefX Edge Functions
// SEC-001 Fix: Restrict CORS to known production domains only

const ALLOWED_ORIGINS = [
  "https://www.tawzeefx.com",
  "https://tawzeefx.com",
  // Allow Vercel preview deployments for testing
  "https://tx-hire-buddy-22-main.vercel.app",
];

// In development (Supabase local), also allow localhost
const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const isDev = Deno.env.get("SUPABASE_URL")?.includes("localhost") ||
              Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1");

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  
  const allowed = isDev
    ? [...ALLOWED_ORIGINS, ...DEV_ORIGINS]
    : ALLOWED_ORIGINS;

  const allowedOrigin = allowed.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      "x-supabase-client-platform",
      "x-supabase-client-platform-version",
      "x-supabase-client-runtime",
      "x-supabase-client-runtime-version",
    ].join(", "),
  };
}

export function handleCorsPrelight(req: Request, extended = false): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: extended ? getExtendedCorsHeaders(req) : getCorsHeaders(req),
    });
  }
  return null;
}
