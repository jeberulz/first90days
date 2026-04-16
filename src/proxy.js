import { NextResponse } from 'next/server';

// ── Distributed rate limiter (Upstash Redis) ─────────────────────────
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, all
// rate limiting goes through Redis so it works across serverless instances.
// Falls back to the in-memory sliding window when either var is missing.

let redis = null;
let redisAvailable = false;

if (
  typeof process !== 'undefined' &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  try {
    // Dynamic import so the fallback path never tries to resolve the package.
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    redisAvailable = true;
  } catch {
    // Package not installed or env misconfigured — fall through to in-memory.
  }
}

// ── Redis sliding window ─────────────────────────────────────────────
async function redisSlidingWindow(key, limit, windowSec) {
  const now = Date.now();
  const windowKey = `rl:${key}`;
  const pipe = redis.pipeline();

  // Remove entries outside the window, add the current timestamp, count.
  pipe.zremrangebyscore(windowKey, 0, now - windowSec * 1000);
  pipe.zadd(windowKey, { score: now, member: `${now}:${Math.random()}` });
  pipe.zcard(windowKey);
  pipe.expire(windowKey, windowSec + 1);

  const results = await pipe.exec();
  const count = results[2];

  if (count >= limit) {
    return { allowed: false, resetIn: windowSec };
  }
  return { allowed: true, resetIn: 0 };
}

// ── In-memory fallback ───────────────────────────────────────────────
const store = new Map();

function memorySlidingWindow(key, limit, windowMs) {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const resetIn = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    return { allowed: false, resetIn };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  if (Math.random() < 0.01) {
    const cutoff = Date.now();
    for (const [k, ts] of store.entries()) {
      if (ts.every((t) => cutoff - t >= windowMs)) store.delete(k);
    }
  }

  return { allowed: true, resetIn: 0 };
}

// ── Unified check ────────────────────────────────────────────────────
async function checkRateLimit(key, limit, windowMs) {
  if (redisAvailable) {
    try {
      return await redisSlidingWindow(key, limit, Math.ceil(windowMs / 1000));
    } catch {
      // Redis error — graceful degradation to in-memory.
    }
  }
  return memorySlidingWindow(key, limit, windowMs);
}

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

const LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },
  billing: { limit: 10, windowMs: 60_000 },
};

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  if (method !== 'POST') return NextResponse.next();

  let group;
  if (pathname.startsWith('/api/auth/')) {
    group = 'auth';
  } else if (pathname.startsWith('/api/billing/')) {
    group = 'billing';
  } else {
    return NextResponse.next();
  }

  const ip = getIp(request);
  const key = `${group}:${ip}`;
  const { allowed, resetIn } = await checkRateLimit(
    key,
    LIMITS[group].limit,
    LIMITS[group].windowMs
  );

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetIn),
          'X-RateLimit-Limit': String(LIMITS[group].limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + resetIn),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/billing/:path*'],
};
