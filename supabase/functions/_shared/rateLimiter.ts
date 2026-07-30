// Rate Limiting helper middleware for Supabase Deno Edge Functions

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

const rateLimitMap: RateLimitStore = {};

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const ip in rateLimitMap) {
    if (now > rateLimitMap[ip].resetTime) {
      delete rateLimitMap[ip];
    }
  }
}, 300000);

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

export function checkRateLimit(req: Request, maxRequests = 60, windowMs = 60000): { allowed: boolean; remaining: number } {
  const ip = getClientIp(req);
  const now = Date.now();

  if (!rateLimitMap[ip] || now > rateLimitMap[ip].resetTime) {
    rateLimitMap[ip] = { count: 1, resetTime: now + windowMs };
    return { allowed: true, remaining: maxRequests - 1 };
  }

  rateLimitMap[ip].count += 1;
  const remaining = Math.max(0, maxRequests - rateLimitMap[ip].count);

  if (rateLimitMap[ip].count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining };
}

export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "تم تجاوز حد الطلبات المسموح به، يرجى المحاولة لاحقاً" }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
