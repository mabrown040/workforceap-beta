import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import CounselorMessagesInboxClient from '@/components/portal/CounselorMessagesInboxClient';
import { buildCounselorInboxRows } from '@/lib/messages/counselorInbox';

export default async function CounselorMessagesHubPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/messages');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: { counselorId: counselor.id, active: true },
        include: { member: { select: { id: true, fullName: true, email: true } } },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  const memberIds = assignments.map((a) => a.member.id);
  const rows = await buildCounselorInboxRows(memberIds);

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ padding: '1.25rem 1rem 0.5rem' }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--color-on-surface)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Student Messages
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
            Conversations with your students
          </p>
        </div>
        <div style={{ minHeight: '50vh' }}>
          <CounselorMessagesInboxClient staffUserId={user.id} rows={rows} />
        </div>
        <MobileBottomNav variant="counselor" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <div className="portal-main-content">
          <PageHeader title="Student Messages" subtitle="Search, open a thread, or view the full student profile." />
          <CounselorMessagesInboxClient staffUserId={user.id} rows={rows} />
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <Link href="/counselor/students" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Browse all students
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
