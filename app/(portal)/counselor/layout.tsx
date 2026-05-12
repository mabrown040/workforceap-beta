import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { prisma } from '@/lib/db/prisma';
import CounselorPortalShell from '@/components/portal/CounselorPortalShell';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Counselor Portal',
    description: 'Support your members from enrollment through employment.',
    path: '/counselor',
  });
  /** PWA install from counselor pages captures this manifest so start_url opens the counselor portal (not `/dashboard`). */
  return { ...base, manifest: '/manifest-counselor.json' };
}

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const [allowedCounselor, allowedAdmin, superAdmin, portalRoles] = await Promise.all([
    isCounselor(user.id),
    isAdmin(user.id),
    isSuperAdmin(user.id),
    getPortalSwitcherRoles(user.id),
  ]);
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
        ? 'Super admin preview'
        : 'Counselor';
  } catch (e) {
    console.error('[counselor/layout] affiliation query failed', e);
  }

  return <CounselorPortalShell subtitle={subtitle} superAdmin={superAdmin} portalRoles={portalRoles}>{children}</CounselorPortalShell>;
}
