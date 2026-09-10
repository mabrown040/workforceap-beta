// Audit-only red regressions. No network, real account data, or provider writes.
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  signOut: vi.fn(),
  getProviderUser: vi.fn(),
  aal: vi.fn(),
  findUser: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (name: string) => mocks.jar.has(name) ? { name, value: mocks.jar.get(name) } : undefined,
  getAll: () => Array.from(mocks.jar, ([name, value]) => ({ name, value })),
  set: (name: string, value: string) => mocks.jar.set(name, value),
}) }));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: {
  getUser: mocks.getProviderUser,
  signOut: mocks.signOut,
  mfa: { getAuthenticatorAssuranceLevel: mocks.aal },
} }) }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {
  $transaction: (fn: (tx: unknown) => unknown) => fn({ user: { findUnique: mocks.findUser } }),
} }));
vi.mock('@/lib/auth/roles', () => ({ getProfileRole: async () => 'member' }));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: () => {} } }));
import { NextRequest } from 'next/server';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as getProfile } from '@/app/api/member/profile/route';
import { middleware } from '@/middleware';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-not-a-key');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('STAFF_MFA_ENFORCEMENT', '1');
  mocks.jar.clear();
  mocks.jar.set('sb-fixture-auth-token.0', 'synthetic-part-0');
  mocks.jar.set('sb-fixture-auth-token.1', 'synthetic-part-1');
  mocks.getProviderUser.mockResolvedValue({ data: { user: { id: 'synthetic-user' } }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.aal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
  mocks.findUser.mockResolvedValue({ id: 'synthetic-user', organizationId: 'synthetic-org',
    email: 'fixture@example.invalid', fullName: 'Synthetic fixture', phone: null, profile: null,
    deletedAt: new Date('2026-09-09T00:00:00Z'),
  });
});

it('logout clears local authentication after a returned provider outage', async () => {
  // auth-js 2.101.1 _signOut returns a 503 error before _removeSession.
  mocks.signOut.mockResolvedValue({ error: { status: 503, message: 'Synthetic provider outage' } });
  const response = await logout(new Request('https://www.workforceap.org/api/auth/logout', { method: 'POST' }));
  expect(mocks.signOut).toHaveBeenCalledOnce();
  console.log('logout response', response.status, await response.json());
  expect(Array.from(mocks.jar).filter(([name, value]) => /^sb-.*-auth-token/.test(name) && value)).toEqual([]);
});

it('soft-deleted application identity cannot read member profile with a still-valid provider session', async () => {
  // State explicitly retained by admin/members/[id]/delete when Auth disable fails.
  // Real auth-server getUser, resolveAuthGucContext, withApiGuc, and profile GET run.
  const response = await getProfile(new Request('https://www.workforceap.org/api/member/profile'));
  console.log('deleted identity profile status', response.status);
  expect(mocks.getProviderUser).toHaveBeenCalled();
  expect([401, 403]).toContain(response.status);
});

it('enforced MFA rejects admin API access before initial factor enrollment', async () => {
  // Password-authenticated user, no factor enrolled: actual Supabase AAL contract.
  const request = new NextRequest('https://www.workforceap.org/api/admin/members', {
    headers: { host: 'www.workforceap.org', cookie: 'sb-fixture-auth-token=synthetic', 'user-agent': 'synthetic-audit' },
  });
  const response = await middleware(request);
  expect(mocks.aal).toHaveBeenCalledOnce();
  console.log('unenrolled admin API middleware status', response.status);
  expect(response.status).toBe(403);
});
