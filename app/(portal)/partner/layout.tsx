import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { getUser } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { getPartnerForUser, isSuperAdmin, SUPER_ADMIN_PARTNER_COOKIE } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import PartnerPortalShell from '@/components/portal/PartnerPortalShell';

export const metadata: Metadata = {
  title: 'Partner Portal',
};

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const superUser = await isSuperAdmin(user.id);
  const ctx = await getPartnerForUser(user.id, { isSuperAdminHint: superUser });
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));
  const portalRoles = await getPortalSwitcherRoles(user.id, {
    superAdmin: superUser,
    hasPartner: true,
  });

  const cookieStore = await cookies();
  const superAdminImpersonating = superUser && Boolean(cookieStore.get(SUPER_ADMIN_PARTNER_COOKIE)?.value);

  return (
    <PartnerPortalShell
      partnerName={ctx.partner.name}
      partnerLogoUrl={ctx.partner.logoUrl}
      partnerBrandColor={ctx.partner.brandColor}
      orgPrimaryColor={ctx.orgBranding.primaryColor}
      orgAccentColor={ctx.orgBranding.accentColor}
      superAdmin={superUser && !ctx.hasDirectPartnerLink}
      superAdminImpersonating={superAdminImpersonating}
      portalRoles={portalRoles}
    >
      {children}
    </PartnerPortalShell>
  );
}
