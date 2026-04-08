import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import CounselorPortalShell from '@/components/portal/CounselorPortalShell';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Counselor Portal',
  description: 'Support your students from enrollment through employment.',
  path: '/counselor',
});

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const [allowedCounselor, allowedAdmin] = await Promise.all([isCounselor(user.id), isAdmin(user.id)]);
  if (!allowedCounselor && !allowedAdmin) redirect('/dashboard');

  let subtitle = 'Counselor';
  try {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: user.id, active: true },
      include: { partner: { select: { name: true } } },
    });
    subtitle = counselor
      ? counselorAffiliationLabel(counselor.partner?.name)
      : allowedAdmin
        ? 'Viewing as admin'
        : 'Counselor';
  } catch (e) {
    console.error('[counselor/layout] affiliation query failed', e);
  }

  return <CounselorPortalShell subtitle={subtitle}>{children}</CounselorPortalShell>;
}
