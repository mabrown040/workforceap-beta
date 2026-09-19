process.env.TZ = 'UTC';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND'); }),
}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/audit/readOnlyPortalAudit', () => ({ isReadOnlyPortalAuditHeader: vi.fn(() => false) }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getPartnerForUser: vi.fn() }));
vi.mock('@/lib/auth/portalGuards', () => ({ unlinkedPartnerHref: vi.fn() }));
vi.mock('@/lib/coursera/learnerProgress', () => ({ fetchLearnerProgressFromB4B: vi.fn(async () => new Map()) }));
vi.mock('@/lib/member/memberProgramTrainingView', () => ({ loadMemberProgramTrainingView: vi.fn(async () => null) }));
vi.mock('@/lib/coursera/memberSkillsetProgress', () => ({ loadMemberSkillsetProgress: vi.fn(async () => []) }));
vi.mock('@/components/portal/SkillsetProgressList', () => ({ default: () => null }));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partnerReferral: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    memberEvent: { findMany: vi.fn() },
    partnerOutreachLog: { findMany: vi.fn() },
  },
}));

import PartnerReferredMemberDetailPage from '@/app/(portal)/partner/referred-members/[memberId]/page';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const INSTANT = new Date('2026-09-19T02:30:00Z'); // 9:30 PM CDT, Sep 18

describe('PartnerReferredMemberDetailPage timestamps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'partner-user-1' } as never);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: 'partner-1', partner: { organizationId: 'org-1' } } as never);
    vi.mocked(prisma.partnerReferral.findFirst).mockResolvedValue({ id: 'ref-1', referredAt: INSTANT } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'member-1',
      fullName: 'Fixture Member',
      email: null,
      enrolledProgram: null,
      enrolledAt: INSTANT,
      courseEnrollments: [],
      courseProgress: [],
      placementRecord: null,
      userCertifications: [],
      memberProgramProgress: [],
    } as never);
    vi.mocked(prisma.memberEvent.findMany).mockImplementation((async (args: { where?: { eventName?: string } }) =>
      args?.where?.eventName
        ? []
        : [{ id: 'ev-1', userId: 'member-1', eventName: 'LOGIN', metadata: null, createdAt: INSTANT }]) as never);
    vi.mocked(prisma.partnerOutreachLog.findMany).mockResolvedValue([
      { id: 'log-1', channel: 'email', note: 'Fixture note', createdAt: INSTANT, createdBy: { fullName: 'Fixture Staff' } },
    ] as never);
  });

  it('renders activity, outreach, and journey dates in Central time', async () => {
    const html = renderToStaticMarkup(await PartnerReferredMemberDetailPage({ params: Promise.resolve({ memberId: 'member-1' }) }));
    expect(html).toContain('Sep 18, 2026, 9:30 PM CDT');
    expect(html).not.toContain('2:30 AM');
    expect(html).not.toContain('Sep 19');
  });
});
