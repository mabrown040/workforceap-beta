import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// When Upstash is not configured, most checks fail closed (deny). Login/auth uses fail-open
// so users are not locked out of the app — configure UPSTASH_* in production for brute-force protection.
const FAIL_CLOSED = !redisUrl || !redisToken;

let signupRateLimiter: Ratelimit | null = null;
let applySignupRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;
let aiToolRateLimiter: Ratelimit | null = null;
let contactRateLimiter: Ratelimit | null = null;
let adminInviteRateLimiter: Ratelimit | null = null;

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
  if (FAIL_CLOSED) return { success: false };
  const result = await aiToolRateLimiter!.limit(userId);
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
