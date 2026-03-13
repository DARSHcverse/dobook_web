import "server-only";

const store = globalThis.__dobookRateLimitStore || new Map();
if (!globalThis.__dobookRateLimitStore) {
  globalThis.__dobookRateLimitStore = store;
}

export function getClientIp(request) {
  const header =
    request?.headers?.get?.("x-forwarded-for") ||
    request?.headers?.get?.("x-vercel-forwarded-for") ||
    request?.headers?.get?.("x-real-ip") ||
    request?.headers?.get?.("cf-connecting-ip") ||
    "";
  if (header) {
    return header.split(",")[0].trim() || "unknown";
  }
  return "unknown";
}

export function rateLimit({ request, keyPrefix, limit, windowMs }) {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowEnd = now + windowMs;

  const existing = store.get(key);
  if (!existing || existing.reset <= now) {
    const next = { count: 1, reset: windowEnd };
    store.set(key, next);
    return { ok: true, ip, remaining: Math.max(0, limit - 1), reset: next.reset };
  }

  const nextCount = existing.count + 1;
  const reset = existing.reset;
  store.set(key, { count: nextCount, reset });

  if (nextCount > limit) {
    const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
    return { ok: false, ip, retryAfter, reset };
  }

  return { ok: true, ip, remaining: Math.max(0, limit - nextCount), reset };
}
