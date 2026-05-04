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

  // Include every active user who is a member — those with profile.role === 'member'
  // and those without a profile row (the role helper defaults to 'member' there).
  // Coursera mapping needs to surface real members even before they enroll, and must
  // not be narrowed to fixture/demo accounts.
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { profile: { is: null } },
        { profile: { role: 'member' } },
      ],
    },
    orderBy: [{ fullName: 'asc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
      courseEnrollment: { select: { workspaceEmail: true, workspaceEmailProvisioned: true } },
    },
    take: 500,
  });

  let mappings = await Promise.resolve([] as Awaited<ReturnType<typeof listCourseraIdentityMappings>>);
  let unmatchedEvents = await Promise.resolve([] as Awaited<ReturnType<typeof listRecentUnmatchedXapiEvents>>);
  let loadError: string | null = null;

  try {
    [mappings, unmatchedEvents] = await Promise.all([
      listCourseraIdentityMappings(),
      listRecentUnmatchedXapiEvents(100),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unable to load Coursera mapping data right now.';
    console.error('[admin/coursera] failed to load mapping data:', error);
  }

  const memberOptions = members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    programTitle: member.enrolledProgram ? getProgramBySlug(member.enrolledProgram)?.title ?? member.enrolledProgram : null,
    workspaceEmail: member.courseEnrollment?.workspaceEmail ?? member.workspaceEmail,
    workspaceEmailProvisioned:
      member.courseEnrollment?.workspaceEmailProvisioned ?? member.workspaceEmailProvisioned,
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

        {loadError ? (
          <div className="content-card" style={{ padding: '1rem 1.1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <strong>Coursera mapping data is temporarily unavailable</strong>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>
                The admin page loaded, but the mapping tables or recent xAPI events could not be read yet.
              </span>
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                Error: {loadError}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <CourseraMappingsAdmin
        members={memberOptions}
        mappings={mappings}
        unmatchedEvents={unmatchedEvents}
      />
    </PortalPageFrame>
  );
}
