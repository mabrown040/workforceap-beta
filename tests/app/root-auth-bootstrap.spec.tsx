// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'synthetic-font' }) }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('next-intl/server', () => ({ getMessages: async () => ({}) }));
vi.mock('next-intl', () => ({ NextIntlClientProvider: () => null }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getProfileRole: vi.fn() }));
vi.mock('@/lib/member/ensureAppUser', () => ({ ensureAppUserProvisioned: vi.fn() }));
vi.mock('@/lib/tenant/resolveOrgFromRequest', () => ({ resolveOrgFromRequest: vi.fn() }));
vi.mock('@/lib/platform/defaultOrgTheme', () => ({ getRequestOrgBranding: async () => ({}) }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({
    user: { findUnique: async () => ({ organizationId: 'synthetic-member-org' }) },
  })),
} }));
vi.mock('@/components/JsonLd', () => ({ default: () => null }));
vi.mock('@/components/ConditionalMarketingNav', () => ({ default: () => null }));
vi.mock('@/components/platform/OrgBrandingStyle', () => ({ default: () => null }));
vi.mock('@/components/theme/ThemeInitScript', () => ({ default: () => null }));
vi.mock('@/components/marketing/UtmCapture', () => ({ default: () => null }));
vi.mock('@/components/DeferredRootChrome', () => ({ default: () => null }));
vi.mock('@/components/observability/SentrySetUser', () => ({ default: () => null }));

import RootLayout from '@/app/layout';
import { headers } from 'next/headers';
import { getUser } from '@/lib/auth/server';
import { getProfileRole } from '@/lib/auth/roles';
import { ensureAppUserProvisioned } from '@/lib/member/ensureAppUser';
import { resolveOrgFromRequest } from '@/lib/tenant/resolveOrgFromRequest';
import { gucContextStorage } from '@/lib/db/gucContext';
import { prisma } from '@/lib/db/prisma';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-wap-user-id': 'synthetic-user' }) as never);
  vi.mocked(getUser).mockResolvedValue(null);
  vi.mocked(getProfileRole).mockResolvedValue('admin');
  vi.mocked(ensureAppUserProvisioned).mockResolvedValue(undefined);
  vi.mocked(resolveOrgFromRequest).mockResolvedValue('synthetic-public-org');
});
afterEach(() => vi.restoreAllMocks());

it('drops the forwarded identity when shared auth rejects an existing session', async () => {
  const run = vi.spyOn(gucContextStorage, 'run');
  await RootLayout({ children: null });
  expect(getUser).toHaveBeenCalledOnce();
  expect(getProfileRole).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(ensureAppUserProvisioned).not.toHaveBeenCalled();
  expect(run.mock.calls.at(-1)?.[0]).toMatchObject({ userId: null, orgId: 'synthetic-public-org' });
});

it('does not authenticate or provision anonymous requests without the middleware header', async () => {
  vi.mocked(headers).mockResolvedValue(new Headers() as never);
  const run = vi.spyOn(gucContextStorage, 'run');
  await RootLayout({ children: null });
  expect(getUser).not.toHaveBeenCalled();
  expect(ensureAppUserProvisioned).not.toHaveBeenCalled();
  expect(run.mock.calls.at(-1)?.[0]).toMatchObject({ userId: null });
});

it('preserves provisioning and role bootstrap for a matching accepted identity', async () => {
  vi.mocked(getUser).mockResolvedValue({ id: 'synthetic-user', email: 'fixture@example.invalid' } as never);
  const run = vi.spyOn(gucContextStorage, 'run');
  await RootLayout({ children: null });
  expect(ensureAppUserProvisioned).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'synthetic-user' }), expect.anything(),
  );
  expect(getProfileRole).toHaveBeenCalledWith('synthetic-user');
  expect(run.mock.calls.at(-1)?.[0]).toMatchObject({ userId: 'synthetic-user', orgId: 'synthetic-member-org', role: 'admin' });
});

it('does not bootstrap a different identity from the forwarded header', async () => {
  vi.mocked(getUser).mockResolvedValue({ id: 'different-synthetic-user' } as never);
  const run = vi.spyOn(gucContextStorage, 'run');
  await RootLayout({ children: null });
  expect(getProfileRole).not.toHaveBeenCalled();
  expect(ensureAppUserProvisioned).not.toHaveBeenCalled();
  expect(run.mock.calls.at(-1)?.[0]).toMatchObject({ userId: null });
});
