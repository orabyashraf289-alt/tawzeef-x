// Rate Limiting helper middleware for Supabase Deno Edge Functions

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

const rateLimitMap: RateLimitStore = {};

export function checkRateLimit(req: Request, maxRequests = 60, windowMs = 60000): { allowed: boolean; remaining: number } {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
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
