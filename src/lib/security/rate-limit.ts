import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const store = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = "rl" } = config;

  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    // Lazy cleanup of expired entries
    const record = store.get(key);
    const now = Date.now();
    
    // Clean up one random key periodically to prevent memory leaks
    if (store.size > 1000) {
      const keys = Array.from(store.keys());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const r = store.get(randomKey);
      if (r && now > r.resetTime) {
        store.delete(randomKey);
      }
    }

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    record.count++;
    return null;
  };
}

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "auth",
});

export const checkoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: "checkout",
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: "upload",
});