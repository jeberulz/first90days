import { NextResponse } from 'next/server';

/**
 * In-memory sliding-window rate limiter.
 *
 * Limitation: state is not shared across serverless function instances.
 * For multi-instance / distributed deployments replace with a Redis-backed
 * store such as Upstash (@upstash/ratelimit + @upstash/redis).
 */
const store = new Map();

function slidingWindow(key, limit, windowMs) {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const resetIn = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    return { allowed: false, resetIn };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  // Probabilistic cleanup to prevent unbounded memory growth.
  if (Math.random() < 0.01) {
    const cutoff = Date.now();
    for (const [k, ts] of store.entries()) {
      if (ts.every((t) => cutoff - t >= windowMs)) store.delete(k);
    }
  }

  return { allowed: true, resetIn: 0 };
}

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// Rate-limit budgets per route group (requests per minute).
const LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },
  billing: { limit: 10, windowMs: 60_000 },
};

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  // Only rate-limit mutating requests.
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
  const { allowed, resetIn } = slidingWindow(key, LIMITS[group].limit, LIMITS[group].windowMs);

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
