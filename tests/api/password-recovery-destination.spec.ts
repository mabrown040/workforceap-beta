import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const providers = vi.hoisted(() => ({
  generateLink: vi.fn(),
  sendEmail: vi.fn(),
  template: vi.fn((_props: { ctaUrl: string }) => '<html>Recovery email fixture</html>'),
  fallbackReset: vi.fn(),
  resend: {} as object | null,
}));
vi.mock('@/lib/rate-limit', () => ({
  checkForgotPasswordRateLimit: vi.fn(async () => ({ success: true })),
  checkForgotPasswordEmailRateLimit: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/lib/http/clientIp', () => ({ getClientIpFromRequest: () => '127.0.0.1' }));
vi.mock('@/lib/tenant/organizationBranding', () => ({
  getOrganizationBranding: vi.fn(async () => ({ domain: 'https://training.example.test', name: 'Training fixture', supportEmail: 'help@example.test' })),
}));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ auth: { admin: { generateLink: providers.generateLink } } }) }));
vi.mock('@/lib/email', () => ({ getResend: () => providers.resend }));
vi.mock('@/lib/email/send', () => ({ sendBrandedEmail: providers.sendEmail }));
vi.mock('@/lib/email/template', () => ({ brandedEmailLayout: providers.template }));
vi.mock('@/lib/observability/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { resetPasswordForEmail: providers.fallbackReset } }) }));

import { POST } from '@/app/api/auth/forgot-password/route';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture-anon');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service');
  providers.resend = {};
  providers.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'opaque+token/with=symbols' } }, error: null });
  providers.sendEmail.mockResolvedValue(undefined);
  providers.fallbackReset.mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); });

function request(redirectTo?: unknown) {
  return new Request('https://training.example.test/api/auth/forgot-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'learner@example.test', redirectTo }),
  });
}

describe('password recovery destination across real route and mailer (mocked providers)', () => {
  it('keeps destination, locale, query and fragment separate from the recovery token', async () => {
    const target = '/es/dashboard/learning/modules/it-lab?program=it-support&tab=notes#practice';
    const response = await POST(request(target));
    expect(response.status).toBe(200);
    const url = new URL(providers.template.mock.calls[0][0].ctaUrl);
    expect(url.origin).toBe('https://training.example.test');
    expect(url.pathname).toBe('/reset-password');
    expect(url.searchParams.get('redirectTo')).toBe(target);
    expect(url.searchParams.get('token_hash')).toBe('opaque+token/with=symbols');
    expect(url.searchParams.get('type')).toBe('recovery');
    expect(providers.sendEmail).toHaveBeenCalledTimes(1);
    const providerUrl = new URL(providers.generateLink.mock.calls[0][0].options.redirectTo);
    expect(providerUrl.searchParams.get('redirectTo')).toBe(target);
  });

  it.each([undefined, 'https://outside.example/collect', '//outside.example/collect', '/\\outside.example', '/login?redirectTo=/dashboard/program', { bad: 'input' }])('normalizes unsafe or absent destination %j on the server', async (target) => {
    const response = await POST(request(target));
    expect(response.status).toBe(200);
    const url = new URL(providers.template.mock.calls[0][0].ctaUrl);
    expect(url.origin).toBe('https://training.example.test');
    expect(url.searchParams.get('redirectTo')).toBe('/dashboard');
    expect(url.searchParams.get('token_hash')).toBe('opaque+token/with=symbols');
  });

  it('preserves the recovery destination with the Supabase fallback mailer', async () => {
    providers.resend = null;
    await POST(request('/dashboard/program?tab=schedule'));
    expect(providers.sendEmail).not.toHaveBeenCalled();
    const url = new URL(providers.fallbackReset.mock.calls[0][1].redirectTo);
    expect(url.pathname).toBe('/reset-password');
    expect(url.searchParams.get('redirectTo')).toBe('/dashboard/program?tab=schedule');
  });

  it('keeps existing staff-issued reset links without a destination working', async () => {
    await sendPasswordResetEmail('learner@example.test', '/reset-password', { orgId: 'fixture-org' });
    const url = new URL(providers.template.mock.calls[0][0].ctaUrl);
    expect(url.pathname).toBe('/reset-password');
    expect(url.searchParams.get('token_hash')).toBe('opaque+token/with=symbols');
    expect(url.searchParams.get('type')).toBe('recovery');
    expect(url.searchParams.has('redirectTo')).toBe(false);
  });

  it('keeps the same public response for unknown accounts and sends no email', async () => {
    providers.generateLink.mockResolvedValue({ data: null, error: { message: 'User not found' } });
    const response = await POST(request('/dashboard/program'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: 'If an account exists for that email, you will receive reset instructions shortly.' });
    expect(providers.sendEmail).not.toHaveBeenCalled();
  });
});
