import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import PartnerPortalShell from '@/components/portal/PartnerPortalShell';

export const metadata: Metadata = {
  title: 'Partner Portal',
};

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const [superUser, portalRoles] = await Promise.all([isSuperAdmin(user.id), getPortalSwitcherRoles(user.id)]);
  const ctx = await getPartnerForUser(user.id, { isSuperAdminHint: superUser });
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const superBanner = superUser && !ctx.hasDirectPartnerLink;

  return (
    <PartnerPortalShell
      partnerName={ctx.partner.name}
      superAdmin={superBanner}
      superAdminImpersonating={superBanner}
      portalRoles={portalRoles}
    >
      {children}
    </PartnerPortalShell>
  );
}
