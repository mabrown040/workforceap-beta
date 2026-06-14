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
// Per-IP-only bucket used alongside the per-(ip,email) `authRateLimiter`
// above. The compound key permits credential-stuffing — rotating emails on
// one IP gives each email its own bucket. This bucket caps the total
// auth attempts from any single IP regardless of which email is being
// tried. Per-launch-bump tuning: 300/15min covers a workforce-center- or
// library-on-shared-IP burst (~20 people each with a few attempts) without
// enabling rapid stuffing. The compound bucket at 20/min/email still
// catches single-account brute force. Revisit if abuse signals appear.
let authIpRateLimiter: Ratelimit | null = null;
// Per-email-only bucket for signup endpoints. Each signup route has its
// own per-IP limiter; this one prevents an attacker spread across many
// IPs from spamming the same target email with verification mails
// (Supabase will silently send "your account already exists" notices to
// real owners, which is an email-bombing surface for a known address).
let signupEmailRateLimiter: Ratelimit | null = null;
let aiToolRateLimiter: Ratelimit | null = null;
let contactRateLimiter: Ratelimit | null = null;
let adminInviteRateLimiter: Ratelimit | null = null;
// Per-admin limiter on /api/admin/members/bulk-email. The route can
// fire up to MAX_MEMBERS (100) Resend sends per call; without a
// per-admin cap a compromised admin token can blast every member in
// the org repeatedly until Resend's bulk-sender heuristic trips and
// the domain reputation craters. 3 bulk-sends per hour per admin
// covers normal communications while blocking compromise/abuse.
let bulkEmailRateLimiter: Ratelimit | null = null;
let employerJobImportRateLimiter: Ratelimit | null = null;
let partnerSignupRateLimiter: Ratelimit | null = null;
let confirmationEmailRateLimiter: Ratelimit | null = null;
// Per-email cap to prevent IP-rotating spray against a target inbox.
// The per-IP limiter alone allows a botnet to spam any chosen address
// with our branded "your application was received" email, abusing our
// domain for phishing pretext. 2/hr/email blocks that without affecting
// legitimate re-sends.
let confirmationEmailEmailRateLimiter: Ratelimit | null = null;
let careersRecommendRateLimiter: Ratelimit | null = null;
let interestProfilerRateLimiter: Ratelimit | null = null;
let forgotPasswordRateLimiter: Ratelimit | null = null;
let forgotPasswordEmailRateLimiter: Ratelimit | null = null;
let publicCareersGetRateLimiter: Ratelimit | null = null;
let publicVoiceSessionRateLimiter: Ratelimit | null = null;
// Per-authenticated-user limiter for any ElevenLabs voice session mint
// (member portal voice tools, counselor/employer/partner walkthroughs,
// AI interview practice, etc.). Each session bills 5-10 minutes of
// ElevenLabs voice at ~$0.30/min, so 1k unbounded reqs ≈ $1.5-3k.
// 5/hr per user covers normal multi-session interview practice while
// blocking obvious abuse and accidental loops.
let voiceSessionRateLimiter: Ratelimit | null = null;
let inviteAcceptRateLimiter: Ratelimit | null = null;
let verifyMfaRateLimiter: Ratelimit | null = null;
let publicHealthRateLimiter: Ratelimit | null = null;
let xapiConfigGetRateLimiter: Ratelimit | null = null;
let xapiOAuthTokenRateLimiter: Ratelimit | null = null;
let xapiStatementsPostRateLimiter: Ratelimit | null = null;
let placementSurveyRateLimiter: Ratelimit | null = null;
let publicWioaQualificationRateLimiter: Ratelimit | null = null;
let webhookRateLimiter: Ratelimit | null = null;
let orgOnboardRateLimiter: Ratelimit | null = null;
let publicInterestProfilerRateLimiter: Ratelimit | null = null;
let courseraIdentityRateLimiter: Ratelimit | null = null;
// Per-IP limiter for the PUBLIC tokenized eligibility-questionnaire submit
// (POST /api/q/[token]/submit). The endpoint is reachable with no account —
// only a valid single-use token gates it — so an attacker who harvests a
// token (or sprays guesses) could otherwise hammer the write path. The token
// is consumed atomically on first submit, but the rate limit caps guessing /
// retry abuse before that. 5/min/IP covers a recipient who fat-fingers a few
// submits without enabling a flood.
let publicQuestionnaireSubmitRateLimiter: Ratelimit | null = null;
let adminTokenLinksRateLimiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  signupRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(12, '30 m'),
    prefix: 'ratelimit:signup',
  });
  applySignupRateLimiter = new Ratelimit({
    redis,
    // Launch bump: 50 per 30 min per IP (up from 20) — workforce centers / libraries
    // have many applicants on shared public IPs. Revert after launch if abuse appears.
    limiter: Ratelimit.slidingWindow(50, '30 m'),
    prefix: 'ratelimit:apply-signup',
  });
  authRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'ratelimit:auth',
  });
  authIpRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '15 m'),
    prefix: 'ratelimit:auth-ip',
  });
  signupEmailRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:signup-email',
  });
  aiToolRateLimiter = new Ratelimit({
    redis,
    // Launch softening: members can hit several AI tools in one session.
    limiter: Ratelimit.slidingWindow(25, '1 h'),
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
  bulkEmailRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:bulk-email',
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
  confirmationEmailEmailRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '1 h'),
    prefix: 'ratelimit:confirmation-email-email',
  });
  careersRecommendRateLimiter = new Ratelimit({
    redis,
    // Quiz retries and slow devices can create extra submissions during exploration.
    limiter: Ratelimit.slidingWindow(60, '1 h'),
    prefix: 'ratelimit:careers-recommend',
  });
  interestProfilerRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    prefix: 'ratelimit:interest-profiler',
  });
  forgotPasswordRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:forgot-password',
  });
  forgotPasswordEmailRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '24 h'),
    prefix: 'ratelimit:forgot-password-email',
  });
  publicCareersGetRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 h'),
    prefix: 'ratelimit:careers-public-get',
  });
  voiceSessionRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:voice-session',
  });
  publicVoiceSessionRateLimiter = new Ratelimit({
    redis,
    // Public voice flows may retry on mic permission / network hiccups.
    limiter: Ratelimit.slidingWindow(20, '10 m'),
    prefix: 'ratelimit:public-voice-session',
  });
  inviteAcceptRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:invite-accept',
  });
  verifyMfaRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'ratelimit:verify-mfa',
  });
  publicHealthRateLimiter = new Ratelimit({
    redis,
    // Uptime monitors + scrapers: generous per IP without opening infinite abuse.
    limiter: Ratelimit.slidingWindow(600, '1 h'),
    prefix: 'ratelimit:public-health',
  });
  xapiConfigGetRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 h'),
    prefix: 'ratelimit:xapi-config-get',
  });
  xapiOAuthTokenRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 h'),
    prefix: 'ratelimit:xapi-oauth-token',
  });
  xapiStatementsPostRateLimiter = new Ratelimit({
    redis,
    // Ingest can batch; keep high enough for legitimate LRS traffic per egress IP.
    limiter: Ratelimit.slidingWindow(3000, '1 h'),
    prefix: 'ratelimit:xapi-statements-post',
  });
  placementSurveyRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'),
    prefix: 'ratelimit:placement-survey',
  });
  publicWioaQualificationRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:public-wioa-qualification',
  });
  webhookRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 m'),
    prefix: 'ratelimit:webhook',
  });
  orgOnboardRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:org-onboard',
  });
  publicInterestProfilerRateLimiter = new Ratelimit({
    redis,
    // Public interest profiler — generous per IP for exploration; 50/hr covers
    // legitimate repeat visitors while preventing abuse of the O*NET API.
    limiter: Ratelimit.slidingWindow(50, '1 h'),
    prefix: 'ratelimit:public-interest-profiler',
  });
  courseraIdentityRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:coursera-identity',
  });
  publicQuestionnaireSubmitRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'ratelimit:public-questionnaire-submit',
  });
  adminTokenLinksRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:admin-token-links',
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

/**
 * Per-IP-only auth limiter. Use alongside `checkAuthRateLimit` (which is
 * keyed by `ip:email`) so a credential-stuffer rotating emails on one IP
 * is throttled by total attempts, not per-target-email buckets.
 */
export async function checkAuthIpRateLimit(ip: string): Promise<{ success: boolean; remaining?: number }> {
  if (!authIpRateLimiter) return { success: true };
  const result = await authIpRateLimiter.limit(`auth-ip:${ip}`);
  return { success: result.success, remaining: result.remaining };
}

/**
 * Per-authenticated-user voice-session rate limit. Apply at every
 * voice-session / voice-walkthrough / interview/session call site
 * (under `/api/`). ElevenLabs is ~$0.30/min and each session bills
 * 5-10 min, so unbounded mints are an immediate money-drain on a
 * compromised account.
 */
export async function checkVoiceSessionRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!voiceSessionRateLimiter) return { success: true };
  const result = await voiceSessionRateLimiter.limit(`voice-session:${userId}`);
  return { success: result.success, remaining: result.remaining };
}

/**
 * Per-email signup limiter. Use alongside the per-IP signup limiters
 * (member/apply/employer/partner) to block one attacker rotating IPs to
 * spam verification mail to the same target address.
 */
export async function checkSignupEmailRateLimit(email: string): Promise<{ success: boolean; remaining?: number }> {
  if (!signupEmailRateLimiter) return { success: true };
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { success: true };
  const result = await signupEmailRateLimiter.limit(`signup-email:${normalized}`);
  return { success: result.success, remaining: result.remaining };
}

export async function checkAIToolRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!aiToolRateLimiter) return { success: true };
  const result = await aiToolRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

export async function checkContactRateLimit(ip: string): Promise<{ success: boolean; remaining?: number }> {
  if (!contactRateLimiter) {
    return { success: !FAIL_CLOSED };
  }
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

/**
 * Per-admin cap on /api/admin/members/bulk-email — 3 calls/hr. Each
 * call can fan out to MAX_MEMBERS (100) Resend sends, so a compromised
 * admin can blast the entire member list and burn the domain's bulk-
 * sender reputation.
 */
export async function checkBulkEmailRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!bulkEmailRateLimiter) return { success: true };
  const result = await bulkEmailRateLimiter.limit(`bulk-email:${userId}`);
  return { success: result.success, remaining: result.remaining };
}

/** Per-user cap on employer job import POSTs (single + bulk share one bucket). Fail-open without Redis. */
export async function checkEmployerJobImportRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!employerJobImportRateLimiter) return { success: true };
  const result = await employerJobImportRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

/** Public confirmation-email endpoint — 5 per IP per hour. Fails closed when Redis is unconfigured: this endpoint sends mail from our verified domain to an arbitrary attacker-chosen address; a botnet can rotate IPs trivially, so unlimited fail-open would burn deliverability. */
export async function checkConfirmationEmailRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!confirmationEmailRateLimiter) {
    return { success: !FAIL_CLOSED };
  }
  const result = await confirmationEmailRateLimiter.limit(ip);
  return { success: result.success };
}

/** Per-email cap on confirmation-email sends — 2 per email per hour. Same fail-closed policy as the per-IP variant. Use both together. */
export async function checkConfirmationEmailEmailRateLimit(email: string): Promise<{ success: boolean }> {
  if (!confirmationEmailEmailRateLimiter) {
    return { success: !FAIL_CLOSED };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { success: true };
  const result = await confirmationEmailEmailRateLimiter.limit(`confirmation-email-email:${normalized}`);
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

/** Forgot-password per-email cap — 3 requests per email per 24 h; fail-open without Redis. */
export async function checkForgotPasswordEmailRateLimit(email: string): Promise<{ success: boolean }> {
  if (!forgotPasswordEmailRateLimiter) return { success: true };
  const result = await forgotPasswordEmailRateLimiter.limit(email.toLowerCase());
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

/** MFA code verification — 10 attempts per 15 min per IP; fail-open without Redis. */
export async function checkVerifyMfaRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!verifyMfaRateLimiter) return { success: true };
  const result = await verifyMfaRateLimiter.limit(ip);
  return { success: result.success };
}

/** GET /api/health — fail-open without Redis (same as other public GET caps). */
export async function checkPublicHealthRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicHealthRateLimiter) return { success: true };
  const result = await publicHealthRateLimiter.limit(ip);
  return { success: result.success };
}

/** GET /api/xapi/config */
export async function checkXapiConfigGetRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!xapiConfigGetRateLimiter) return { success: true };
  const result = await xapiConfigGetRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/xapi/oauth/token */
export async function checkXapiOAuthTokenRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!xapiOAuthTokenRateLimiter) return { success: true };
  const result = await xapiOAuthTokenRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/xapi/statements */
export async function checkXapiStatementsPostRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!xapiStatementsPostRateLimiter) return { success: true };
  const result = await xapiStatementsPostRateLimiter.limit(ip);
  return { success: result.success };
}

/** GET + POST /api/placement-survey (unauthenticated) */
export async function checkPlacementSurveyRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!placementSurveyRateLimiter) return { success: true };
  const result = await placementSurveyRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/public/wioa-qualification — public lead form; fail-open without Redis. */
export async function checkPublicWioaQualificationRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicWioaQualificationRateLimiter) return { success: true };
  const result = await publicWioaQualificationRateLimiter.limit(ip);
  return { success: result.success };
}

/** Webhook endpoints (Coursera, learning-completion, etc.) — generous for legitimate retries. */
export async function checkWebhookRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!webhookRateLimiter) return { success: true };
  const result = await webhookRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/org/onboard — public organization creation; fail-open without Redis. */
export async function checkOrgOnboardRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!orgOnboardRateLimiter) return { success: true };
  const result = await orgOnboardRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/public/interest-profiler/* — public no-account quiz; cap per-IP O*NET abuse. Fail-open without Redis. */
export async function checkPublicInterestProfilerRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicInterestProfilerRateLimiter) return { success: true };
  const result = await publicInterestProfilerRateLimiter.limit(ip);
  return { success: result.success };
}

/** Per-admin cap on tokenized-link minting — 10 per hour. Credential-minting
 * surface; without a cap a compromised admin token can mint unlimited links.
 */
export async function checkAdminTokenLinksRateLimit(userId: string): Promise<{ success: boolean; remaining?: number }> {
  if (!adminTokenLinksRateLimiter) return { success: true };
  const result = await adminTokenLinksRateLimiter.limit(userId);
  return { success: result.success, remaining: result.remaining };
}

/** POST /api/q/[token]/submit — PUBLIC (no-account) tokenized eligibility
 * questionnaire submit. Token-gated + single-use, but reachable without auth,
 * so cap per-IP abuse. Fail-open without Redis (the single-use token consume
 * is the hard guarantee).
 */
export async function checkPublicQuestionnaireSubmitRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!publicQuestionnaireSubmitRateLimiter) return { success: true };
  const result = await publicQuestionnaireSubmitRateLimiter.limit(ip);
  return { success: result.success };
}

/** POST /api/member/coursera/identity — limit Coursera email spray. */
export async function checkCourseraIdentityRateLimit(ip: string): Promise<{ success: boolean }> {
  if (!courseraIdentityRateLimiter) return { success: true };
  const result = await courseraIdentityRateLimiter.limit(ip);
  return { success: result.success };
}
