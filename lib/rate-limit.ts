import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// When Upstash is not configured, signup/contact fail closed (deny). Auth + AI tools fail open so the app stays
// usable in dev; set UPSTASH_* in production for rate limiting.
const FAIL_CLOSED = !redisUrl || !redisToken;

let signupRateLimiter: Ratelimit | null = null;
let applySignupRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;
let aiToolRateLimiter: Ratelimit | null = null;
let contactRateLimiter: Ratelimit | null = null;
let adminInviteRateLimiter: Ratelimit | null = null;
let employerJobImportRateLimiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  signupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:signup',
  });
  applySignupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:apply-signup',
  });
  authRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'ratelimit:auth',
  });
  aiToolRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:ai-tool',
  });
  contactRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:contact',
  });
  adminInviteRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:admin-invite',
  });
  employerJobImportRateLimiter = new Ratelimit({
    redis,
    // Bulk import can trigger many AI/scrape calls per request; keep this tighter than generic AI-tool limits.
    limiter: Ratelimit.slidingWindow(8, '1 h'),
    prefix: 'ratelimit:employer-job-import',
  });
}

export async function checkSignupRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  if (FAIL_CLOSED) return { success: false };
  const result = await signupRateLimiter!.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function checkApplySignupRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  if (FAIL_CLOSED) return { success: false };
  const result = await applySignupRateLimiter!.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function checkAuthRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  if (!authRateLimiter) return { success: true };
  const result = await authRateLimiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function checkAIToolRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!aiToolRateLimiter) return { success: true };
  const result = await aiToolRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

export async function checkContactRateLimit(ip: string): Promise<{ success: boolean; remaining?: number }> {
  if (FAIL_CLOSED) return { success: false };
  const result = await contactRateLimiter!.limit(ip);
  return { success: result.success, remaining: result.remaining };
}

export async function checkAdminInviteRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!adminInviteRateLimiter) return { success: true };
  const result = await adminInviteRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

/** Per-user cap on employer job import POSTs (single + bulk share one bucket). Fail-open without Redis. */
export async function checkEmployerJobImportRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!employerJobImportRateLimiter) return { success: true };
  const result = await employerJobImportRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}
