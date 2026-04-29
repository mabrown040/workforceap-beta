import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash is optional. Signup/apply fail open without it — Supabase enforces its own auth rate limits.
// Contact/confirmation remain fail-closed (spam risk). Add UPSTASH_* env vars to enable Redis-backed limits.
const FAIL_CLOSED = !redisUrl || !redisToken;

let signupRateLimiter: Ratelimit | null = null;
let applySignupRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;
let aiToolRateLimiter: Ratelimit | null = null;
let contactRateLimiter: Ratelimit | null = null;
let adminInviteRateLimiter: Ratelimit | null = null;
let employerJobImportRateLimiter: Ratelimit | null = null;
let partnerSignupRateLimiter: Ratelimit | null = null;
let confirmationEmailRateLimiter: Ratelimit | null = null;
let careersRecommendRateLimiter: Ratelimit | null = null;
let interestProfilerRateLimiter: Ratelimit | null = null;
let forgotPasswordRateLimiter: Ratelimit | null = null;
let publicCareersGetRateLimiter: Ratelimit | null = null;
let publicVoiceSessionRateLimiter: Ratelimit | null = null;
let inviteAcceptRateLimiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  signupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(12, '30 m'),
    prefix: 'ratelimit:signup',
  });
  applySignupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '30 m'),
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
  partnerSignupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:partner-signup',
  });
  confirmationEmailRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:confirmation-email',
  });
  careersRecommendRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: 'ratelimit:careers-recommend',
  });
  interestProfilerRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, '1 h'),
    prefix: 'ratelimit:interest-profiler',
  });
  forgotPasswordRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:forgot-password',
  });
  publicCareersGetRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 h'),
    prefix: 'ratelimit:careers-public-get',
  });
  publicVoiceSessionRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(6, '10 m'),
    prefix: 'ratelimit:public-voice-session',
  });
  inviteAcceptRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:invite-accept',
  });
}

export async function checkSignupRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  if (!signupRateLimiter) return { success: true };
  const result = await signupRateLimiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function checkApplySignupRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  if (!applySignupRateLimiter) return { success: true };
  const result = await applySignupRateLimiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function checkAuthRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  // Auth fails OPEN so the app stays usable when Upstash is not configured
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
  if (!contactRateLimiter) return { success: true };
  const result = await contactRateLimiter.limit(ip);
  return { success: result.success, remaining: result.remaining };
}

/** Public partner self-registration — fail-open when Upstash is not configured (unlike contact). */
export async function checkPartnerSignupRateLimit(identifier: string): Promise<{ success: boolean }> {
  if (!partnerSignupRateLimiter) return { success: true };
  const result = await partnerSignupRateLimiter.limit(identifier);
  return { success: result.success };
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

/** Public confirmation-email endpoint — 5 per IP per hour. Fail-open without Upstash; Supabase enforces its own email send limits. */
export async function checkConfirmationEmailRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!confirmationEmailRateLimiter) return { success: true };
  const result = await confirmationEmailRateLimiter.limit(ip);
  return { success: result.success };
}

/** Public career quiz recommend — fail-open without Redis (dev). */
export async function checkCareersRecommendRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!careersRecommendRateLimiter) return { success: true };
  const result = await careersRecommendRateLimiter.limit(ip);
  return { success: result.success };
}

/** Member Interest Profiler API — per-user cap; fail-open without Redis (dev). */
export async function checkInterestProfilerRateLimit(userId: string): Promise<{ success: boolean }> {
  if (!interestProfilerRateLimiter) return { success: true };
  const result = await interestProfilerRateLimiter.limit(userId);
  return { success: result.success };
}

/** Forgot-password / reset email requests — per IP; fail-open without Redis (dev). */
export async function checkForgotPasswordRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!forgotPasswordRateLimiter) return { success: true };
  const result = await forgotPasswordRateLimiter.limit(ip);
  return { success: result.success };
}

/** Public GET /api/careers/* (occupation detail, program matches) — per IP; fail-open without Redis. */
export async function checkPublicCareersGetRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicCareersGetRateLimiter) return { success: true };
  const result = await publicCareersGetRateLimiter.limit(ip);
  return { success: result.success };
}

/** Public voice-session minting — per IP; fail-open without Redis in dev, but throttle aggressively when configured. */
export async function checkPublicVoiceSessionRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicVoiceSessionRateLimiter) return { success: true };
  const result = await publicVoiceSessionRateLimiter.limit(ip);
  return { success: result.success };
}

/** Invitation acceptance (account creation) — per IP; fail-open without Redis. */
export async function checkInviteAcceptRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!inviteAcceptRateLimiter) return { success: true };
  const result = await inviteAcceptRateLimiter.limit(ip);
  return { success: result.success };
}

/** Job applications - per user; fail-open without Redis. */
export async function checkJobApplicationRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!interestProfilerRateLimiter) return { success: true };
  const result = await interestProfilerRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

import { monitorRateLimit } from './security/rateLimitMonitor';

// Enhanced rate limiting with security monitoring
export async function checkRateLimitWithMonitoring(
  identifier: string,
  endpoint: string,
  userId?: string
): Promise<{ success: boolean; remaining?: number }> {
  const result = await checkPublicCareersGetRateLimit(identifier);
  
  if (!result.success) {
    // Monitor for abuse patterns
    monitorRateLimit({
      ip: identifier,
      endpoint,
      timestamp: Date.now(),
      userId,
    });
  }
  
  return result;
}
