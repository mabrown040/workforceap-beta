import { NextResponse } from 'next/server';
import { checkForgotPasswordRateLimit, checkForgotPasswordEmailRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';
import { normalizePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { logger } from '@/lib/observability/logger';

const RESET_UNAVAILABLE = 'Password reset is temporarily unavailable. Please try again shortly or contact (512) 777-1808 for help.';

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinIpLimit } = await checkForgotPasswordRateLimit(ip);
    if (!withinIpLimit) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please try again in an hour.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }
  
    let body: { email?: string; redirectTo?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
  
    const { success: withinEmailLimit } = await checkForgotPasswordEmailRateLimit(email);
    if (!withinEmailLimit) {
      // This limit applies to every requested address, registered or not.
      // Tell the caller to wait rather than claiming an email was queued.
      logger.warn('/auth/forgot-password: per-email rate limit hit; reset not sent', {
        emailDomain: email.split('@')[1] ?? '',
      });
      return NextResponse.json(
        { error: 'Too many reset requests for this email. Please try again in an hour.' },
        { status: 429, headers: { 'Retry-After': '3600', 'Cache-Control': 'no-store' } },
      );
    }
  
    let error: { message?: string } | null = null;
    let via: string | undefined;
    try {
      const redirectTo = normalizePostLoginRedirect(body?.redirectTo);
      const resetPath = `/reset-password?redirectTo=${encodeURIComponent(redirectTo)}`;
      ({ error, via } = await sendPasswordResetEmail(email, resetPath));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset is temporarily unavailable.';
      logger.error('/auth/forgot-password: send threw', { err: message });
      return NextResponse.json({ error: RESET_UNAVAILABLE }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  
    // Unknown accounts retain the uniform response. Actual delivery failures
    // must let the caller retry; never expose raw provider/configuration errors.
    if (error) {
      logger.warn('/auth/forgot-password: reset email not sent', {
        via: via ?? 'unknown',
        reason: error.message ?? 'unknown',
      });
      if (via !== 'skipped') {
        return NextResponse.json({ error: RESET_UNAVAILABLE }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
    }
  
    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, you will receive reset instructions shortly.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logger.error('/auth/forgot-password', { err: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
