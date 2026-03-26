import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import CounselorPortalShell from '@/components/portal/CounselorPortalShell';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const allowed = (await isCounselor(user.id)) || (await isAdmin(user.id));
  if (!allowed) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
    include: { partner: { select: { name: true } } },
  });

  const subtitle = counselor
    ? counselorAffiliationLabel(counselor.partner?.name)
    : (await isAdmin(user.id))
      ? 'Admin preview'
      : 'Counselor';

  return <CounselorPortalShell subtitle={subtitle}>{children}</CounselorPortalShell>;
}
