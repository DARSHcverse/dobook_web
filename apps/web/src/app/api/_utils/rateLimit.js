import "server-only";

const memoryStore = globalThis.__dobookApiRateLimitStore || new Map();
if (!globalThis.__dobookApiRateLimitStore) {
  globalThis.__dobookApiRateLimitStore = memoryStore;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

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

async function upstashPipeline(commands) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash pipeline failed (${res.status})`);
  return res.json();
}

async function upstashCommand(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash command failed (${res.status})`);
  return res.json();
}

function buildKey({ key, keyPrefix, ip }) {
  if (key) return String(key);
  return `${keyPrefix}:${ip}`;
}

export async function rateLimit({ request, key, keyPrefix, limit, windowMs }) {
  const ip = getClientIp(request);
  const resolvedKey = buildKey({ key, keyPrefix, ip });
  const now = Date.now();

  if (useUpstash) {
    try {
      const data = await upstashPipeline([
        ["INCR", resolvedKey],
        ["PEXPIRE", resolvedKey, windowMs, "NX"],
        ["PTTL", resolvedKey],
      ]);
      const count = Number(data?.[0]?.result ?? 0);
      const ttl = Number(data?.[2]?.result ?? 0);
      const reset = ttl > 0 ? now + ttl : now + windowMs;
      if (count > limit) {
        const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
        return { ok: false, ip, key: resolvedKey, retryAfter, reset, count };
      }
      return { ok: true, ip, key: resolvedKey, remaining: Math.max(0, limit - count), reset, count };
    } catch (error) {
      console.error("Upstash rate limit failed, falling back to memory", error);
    }
  }

  const existing = memoryStore.get(resolvedKey);
  if (!existing || existing.reset <= now) {
    const next = { count: 1, reset: now + windowMs };
    memoryStore.set(resolvedKey, next);
    return { ok: true, ip, key: resolvedKey, remaining: Math.max(0, limit - 1), reset: next.reset, count: 1 };
  }

  const nextCount = existing.count + 1;
  memoryStore.set(resolvedKey, { count: nextCount, reset: existing.reset });

  if (nextCount > limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.reset - now) / 1000));
    return { ok: false, ip, key: resolvedKey, retryAfter, reset: existing.reset, count: nextCount };
  }

  return {
    ok: true,
    ip,
    key: resolvedKey,
    remaining: Math.max(0, limit - nextCount),
    reset: existing.reset,
    count: nextCount,
  };
}

export async function getRateLimitState({ key }) {
  const now = Date.now();
  if (useUpstash) {
    try {
      const data = await upstashPipeline([
        ["GET", key],
        ["PTTL", key],
      ]);
      const count = Number(data?.[0]?.result ?? NaN);
      const ttl = Number(data?.[1]?.result ?? -1);
      if (!Number.isFinite(count) || ttl <= 0) return null;
      return { count, reset: now + ttl };
    } catch (error) {
      console.error("Upstash get rate limit failed, falling back to memory", error);
    }
  }

  const existing = memoryStore.get(key);
  if (!existing || existing.reset <= now) return null;
  return { count: existing.count, reset: existing.reset };
}

export async function setRateLimitKey({ key, windowMs, value = 1 }) {
  const now = Date.now();
  if (useUpstash) {
    try {
      await upstashCommand(["SET", key, String(value), "PX", windowMs]);
      return { ok: true, reset: now + windowMs, count: value };
    } catch (error) {
      console.error("Upstash set rate limit failed, falling back to memory", error);
    }
  }
  memoryStore.set(key, { count: value, reset: now + windowMs });
  return { ok: true, reset: now + windowMs, count: value };
}

export async function clearRateLimitKey({ key }) {
  if (useUpstash) {
    try {
      await upstashCommand(["DEL", key]);
      return;
    } catch (error) {
      console.error("Upstash clear rate limit failed, falling back to memory", error);
    }
  }
  memoryStore.delete(key);
}
