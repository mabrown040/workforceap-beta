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
vi.mock('@/app/seo', () => ({ buildPageMetadata: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getEmployerForUser: vi.fn(), isSuperAdmin: vi.fn(async () => false) }));
vi.mock('@/lib/auth/portalGuards', () => ({ unlinkedEmployerHref: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { jobPostingApplication: { findFirst: vi.fn() } } }));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/employer/ApplicationStatusUpdater', () => ({ default: () => null }));

import EmployerApplicationPage from '@/app/(portal)/employer/applications/[id]/page';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const INSTANT = new Date('2026-09-19T02:30:00Z'); // 9:30 PM CDT, Sep 18

describe('EmployerApplicationPage message dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'employer-user-1' } as never);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as never);
    vi.mocked(prisma.jobPostingApplication.findFirst).mockResolvedValue({
      id: 'app-1',
      status: 'reviewing',
      notes: null,
      job: { id: 'job-1', title: 'Fixture Role', employerId: 'emp-1' },
      student: { id: 'member-1', fullName: 'Fixture Candidate', email: null, phone: null, enrolledProgram: null, profile: null },
      messages: [
        { id: 'msg-1', authorId: 'member-1', body: 'Fixture message', createdAt: INSTANT, author: { id: 'member-1', fullName: 'Fixture Candidate' } },
      ],
    } as never);
  });

  it('renders the message date in Central time rather than the UTC day', async () => {
    const html = renderToStaticMarkup(await EmployerApplicationPage({ params: Promise.resolve({ id: 'app-1' }) }));
    expect(html).toContain('Sep 18, 2026');
    expect(html).not.toContain('9/19/2026');
    expect(html).not.toContain('Sep 19');
  });
});
