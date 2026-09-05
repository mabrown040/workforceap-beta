import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  findFirst: vi.fn(),
  reenable: vi.fn(),
  sendBrandedEmail: vi.fn(),
  getResend: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ auth: { admin: { generateLink: mocks.generateLink } } }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findFirst: mocks.findFirst } },
}));
vi.mock('@/lib/admin/authUserLifecycle', () => ({
  reenableAuthUserAfterRestore: mocks.reenable,
}));
vi.mock('@/lib/email', () => ({ getResend: mocks.getResend }));
vi.mock('@/lib/email/send', () => ({ sendBrandedEmail: mocks.sendBrandedEmail }));
vi.mock('@/lib/email/template', () => ({ brandedEmailLayout: () => '<html/>' }));
vi.mock('@/lib/tenant/organizationBranding', () => ({
  getOrganizationBranding: vi.fn(async () => ({
    name: 'WorkforceAP',
    domain: 'https://www.workforceap.org',
    supportEmail: 'hello@workforceap.org',
  })),
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

const USER_NOT_FOUND = { data: { properties: null }, error: { message: 'User not found' } };
const MINTED = { data: { properties: { hashed_token: 'hash-1' } }, error: null };

describe('sendPasswordResetEmail — auth user self-heal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    mocks.getResend.mockReturnValue({});
    mocks.sendBrandedEmail.mockResolvedValue(undefined);
  });

  it('re-creates a missing Supabase auth user for an active account, then sends the link', async () => {
    mocks.generateLink.mockResolvedValueOnce(USER_NOT_FOUND).mockResolvedValueOnce(MINTED);
    mocks.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'Admin@Example.org',
      fullName: 'Michael Brown',
      phone: null,
    });
    mocks.reenable.mockResolvedValue({ ok: true, action: 'recreated' });

    const result = await sendPasswordResetEmail('Admin@Example.org');

    expect(result).toEqual({ error: null, via: 'resend' });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'admin@example.org', mode: 'insensitive' }, deletedAt: null },
      select: { id: true, email: true, fullName: true, phone: true },
    });
    expect(mocks.reenable).toHaveBeenCalledWith(expect.anything(), {
      id: 'user-1',
      email: 'admin@example.org',
      fullName: 'Michael Brown',
      phone: null,
    });
    expect(mocks.generateLink).toHaveBeenCalledTimes(2);
    expect(mocks.sendBrandedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ to: 'admin@example.org' }),
    );
  });

  it('still skips silently when no account exists for the address', async () => {
    mocks.generateLink.mockResolvedValue(USER_NOT_FOUND);
    mocks.findFirst.mockResolvedValue(null);

    const result = await sendPasswordResetEmail('nobody@example.org');

    expect(result.via).toBe('skipped');
    expect(mocks.reenable).not.toHaveBeenCalled();
    expect(mocks.generateLink).toHaveBeenCalledTimes(1);
    expect(mocks.sendBrandedEmail).not.toHaveBeenCalled();
  });

  it('does not resurrect a soft-deleted account', async () => {
    mocks.generateLink.mockResolvedValue(USER_NOT_FOUND);
    // `deletedAt: null` is part of the lookup, so a deleted row is simply not found.
    mocks.findFirst.mockResolvedValue(null);

    const result = await sendPasswordResetEmail('deleted@example.org');

    expect(result.via).toBe('skipped');
    expect(mocks.findFirst.mock.calls[0][0].where.deletedAt).toBeNull();
    expect(mocks.reenable).not.toHaveBeenCalled();
  });

  it('reports skipped when the auth user cannot be re-created', async () => {
    mocks.generateLink.mockResolvedValue(USER_NOT_FOUND);
    mocks.findFirst.mockResolvedValue({ id: 'user-1', email: 'a@b.org', fullName: 'A', phone: null });
    mocks.reenable.mockResolvedValue({ ok: false, message: 'auth service refused the id' });

    const result = await sendPasswordResetEmail('a@b.org');

    expect(result.via).toBe('skipped');
    expect(mocks.generateLink).toHaveBeenCalledTimes(1);
    expect(mocks.sendBrandedEmail).not.toHaveBeenCalled();
  });

  it('does not touch the auth user when the link mints normally', async () => {
    mocks.generateLink.mockResolvedValue(MINTED);

    const result = await sendPasswordResetEmail('jane@example.org');

    expect(result).toEqual({ error: null, via: 'resend' });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.reenable).not.toHaveBeenCalled();
  });
});
