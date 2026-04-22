import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CourseraMappingsAdmin from '@/components/admin/CourseraMappingsAdmin';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { listCourseraIdentityMappings, listRecentUnmatchedXapiEvents } from '@/lib/xapi/mappings';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Coursera Identity Mapping',
  description: 'Map Coursera learners to WorkforceAP members and review unmatched xAPI events.',
  path: '/admin/coursera',
});

export const dynamic = 'force-dynamic';

export default async function AdminCourseraPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/coursera');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const [members, mappings, unmatchedEvents] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, enrolledProgram: { not: null }, ...MEMBER_ONLY_WHERE },
      orderBy: [{ fullName: 'asc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
      },
      take: 500,
    }),
    listCourseraIdentityMappings(),
    listRecentUnmatchedXapiEvents(100),
  ]);

  const memberOptions = members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    programTitle: member.enrolledProgram ? getProgramBySlug(member.enrolledProgram)?.title ?? member.enrolledProgram : null,
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Coursera identity mapping"
        subtitle="Manually bind Coursera learners to WAP members and review xAPI events that did not match automatically."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Coursera' }]}
      />

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        <div className="content-card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <strong>Matching order</strong>
            <span style={{ color: 'var(--color-on-surface-variant)' }}>
              Manual actor mapping, then manual Coursera email mapping, then direct email match from xAPI Mbox.
            </span>
          </div>
        </div>
      </div>

      <CourseraMappingsAdmin
        members={memberOptions}
        mappings={mappings}
        unmatchedEvents={unmatchedEvents}
      />
    </PortalPageFrame>
  );
}
