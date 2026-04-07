import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';
import PartnerPortalShell from '@/components/portal/PartnerPortalShell';

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const superUser = await isSuperAdmin(user.id);
  const ctx = await getPartnerForUser(user.id, { isSuperAdminHint: superUser });
  if (!ctx) redirect('/dashboard');

  const superBanner = superUser && !ctx.hasDirectPartnerLink;

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
