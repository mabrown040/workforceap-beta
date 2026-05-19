import { NextResponse } from 'next/server';
import { checkForgotPasswordRateLimit, checkForgotPasswordEmailRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async (request: Request) => {
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
      // Return the same uniform message — don't confirm the email exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, you will receive reset instructions shortly.',
      });
    }
  
    let error: { message?: string } | null = null;
    try {
      ({ error } = await sendPasswordResetEmail(email));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset is temporarily unavailable.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  
    // Uniform response — avoids revealing whether the email is registered
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[forgot-password]', error.message);
    }
  
    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, you will receive reset instructions shortly.',
    });
  } catch (error) {
    console.error('/auth/forgot-password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
