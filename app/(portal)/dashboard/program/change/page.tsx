import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import PortalCard from '@/components/portal/ui/PortalCard';
import ProgramChangeRequestForm from '@/components/portal/ProgramChangeRequestForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Request a program change',
    description: 'Ask a counselor to switch you into a different program.',
    path: '/dashboard/program/change',
  });
}

export default async function ProgramChangePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/program/change');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  if (!dbUser?.enrolledProgram) {
    redirect('/dashboard/program');
  }

  const currentProgram = getProgramBySlug(dbUser.enrolledProgram);

  const activeViews = await getActivePrograms();
  let pickerPrograms = activeViews
    .map((v) => v.static)
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (pickerPrograms.length === 0) pickerPrograms = PROGRAMS;
  const otherPrograms = pickerPrograms.filter((p) => p.slug !== dbUser.enrolledProgram);

  const pendingRequest = await prisma.programChangeRequest.findFirst({
    where: { userId: user.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, requestedProgramSlug: true, reason: true, createdAt: true },
  });

  return (
    <>
      <div className="portal-pad-x" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="Request a program change"
          subtitle={
            currentProgram
              ? `You are currently enrolled in ${currentProgram.title}. A counselor reviews every request — most decisions land within 1–2 business days.`
              : 'A counselor reviews every request — most decisions land within 1–2 business days.'
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'My Program', href: '/dashboard/program' },
            { label: 'Request change' },
          ]}
        />

        {pendingRequest ? (
          <PortalCard>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                You already have a pending request.
              </p>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                Requested program:{' '}
                <strong>
                  {getProgramBySlug(pendingRequest.requestedProgramSlug)?.title ??
                    pendingRequest.requestedProgramSlug}
                </strong>
              </p>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                Submitted {pendingRequest.createdAt.toLocaleDateString()}
              </p>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                A counselor will reach out via Counselor Chat or email. You can submit a new request once this one is decided.
              </p>
            </div>
          </PortalCard>
        ) : otherPrograms.length === 0 ? (
          <PortalCard>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                No alternative programs are available right now.
              </p>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                You are already enrolled in the only active program in our catalog. If you would like to discuss your fit or pause enrollment, contact a counselor through Counselor Chat.
              </p>
            </div>
          </PortalCard>
        ) : (
          <PortalCard>
            <div style={{ padding: '1rem' }}>
              <ProgramChangeRequestForm programs={otherPrograms} />
            </div>
          </PortalCard>
        )}
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
