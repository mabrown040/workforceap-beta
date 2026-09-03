import { NextResponse } from 'next/server';
import { checkForgotPasswordRateLimit, checkForgotPasswordEmailRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';
import { logger } from '@/lib/observability/logger';

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
  
    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
  
    const { success: withinEmailLimit } = await checkForgotPasswordEmailRateLimit(email);
    if (!withinEmailLimit) {
      // Return the same uniform message — don't confirm the email exists.
      // Log it: a silently dropped reset is indistinguishable from "email
      // never arrived" to whoever is debugging delivery.
      logger.warn('/auth/forgot-password: per-email rate limit hit; reset not sent', {
        emailDomain: email.split('@')[1] ?? '',
      });
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, you will receive reset instructions shortly.',
      });
    }
  
    let error: { message?: string } | null = null;
    let via: string | undefined;
    try {
      ({ error, via } = await sendPasswordResetEmail(email));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset is temporarily unavailable.';
      logger.error('/auth/forgot-password: send threw', { err: message });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  
    // Uniform response — avoids revealing whether the email is registered.
    // The failure itself must still be visible to operators in every
    // environment (it used to be logged in development only, which is how a
    // broken mailer went unnoticed in production).
    if (error) {
      logger.warn('/auth/forgot-password: reset email not sent', {
        via: via ?? 'unknown',
        reason: error.message ?? 'unknown',
      });
    }
  
    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, you will receive reset instructions shortly.',
    });
  } catch (error) {
    logger.error('/auth/forgot-password', { err: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
