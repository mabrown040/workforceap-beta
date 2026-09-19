process.env.TZ = 'UTC';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(async () => (key: string) => key) }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { mentor: { findUnique: vi.fn() } } }));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalEmptyState', () => ({ default: () => <p>empty</p> }));

import MentorDashboardPage from '@/app/(portal)/dashboard/mentor/page';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

// 02:30 UTC on Sep 19 is 9:30 PM CDT on Sep 18 — the server runs in UTC, but
// mentors read the portal in Central time.
const SCHEDULED_AT = new Date('2026-09-19T02:30:00Z');

describe('MentorDashboardPage upcoming sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(prisma.mentor.findUnique).mockResolvedValue({
      id: 'mentor-1',
      totalHoursDonated: 3,
      sessions: [
        { id: 's-1', scheduledAt: SCHEDULED_AT, status: 'CONFIRMED', durationMin: 45, member: { fullName: 'Fixture Member' } },
        { id: 's-2', scheduledAt: SCHEDULED_AT, status: 'PENDING', durationMin: 30, member: { fullName: 'Second Fixture' } },
      ],
    } as any);
  });

  it('renders session times in Central time, not the UTC server clock', async () => {
    const html = renderToStaticMarkup(await MentorDashboardPage());
    expect(html).toContain('Sep 18, 2026, 9:30 PM CDT');
    expect(html).not.toContain('2:30 AM');
    expect(html).not.toContain('Sep 19');
  });

  it('shows human labels instead of the raw MentorSessionStatus enum', async () => {
    const html = renderToStaticMarkup(await MentorDashboardPage());
    expect(html).toContain('· Confirmed');
    expect(html).toContain('· Pending');
    expect(html).not.toContain('CONFIRMED');
    expect(html).not.toContain('PENDING');
  });
});
