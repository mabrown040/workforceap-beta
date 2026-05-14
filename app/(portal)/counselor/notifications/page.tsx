import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CounselorNotificationCenter from '@/components/portal/counselor/CounselorNotificationCenter';

export default async function CounselorNotificationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/notifications');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: { counselor: { userId: user.id, active: true }, active: true },
        include: { member: { select: { id: true, fullName: true } } },
      })
    : [];

  const members = assignments
    .map((a) => a.member)
    .filter(Boolean)
    .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));

  return (
    <PortalPageFrame>
      <PageHeader title="Notification Center" subtitle="Stay updated on your members' activity" />
      <CounselorNotificationCenter members={members} />
    </PortalPageFrame>
  );
}
