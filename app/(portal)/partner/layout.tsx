import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PartnerPortalShell from '@/components/portal/PartnerPortalShell';

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  let directPartnerUser: { id: string } | null = null;
  try {
    directPartnerUser = await prisma.partnerUser.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
  } catch (e) {
    console.error('[partner/layout] partnerUser lookup failed', e);
  }
  const superUser = await isSuperAdmin(user.id);
  const superBanner = superUser && !directPartnerUser;

  return (
    <PartnerPortalShell
      partnerName={ctx.partner.name}
      superAdmin={superBanner}
      superAdminImpersonating={superBanner}
    >
      {children}
    </PartnerPortalShell>
  );
}
