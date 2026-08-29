import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { getUser } from '@/lib/auth/server';
import { cookies, headers } from 'next/headers';
import { getEmployerForUser, isSuperAdmin, SUPER_ADMIN_EMPLOYER_COOKIE } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import EmployerPortalShell from '@/components/portal/EmployerPortalShell';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

export const metadata: Metadata = {
  title: 'Employer Portal',
};

export default async function EmployerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer');

  const superAdmin = await isSuperAdmin(user.id);
  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());
  const ctx = await getEmployerForUser(user.id, { isSuperAdminHint: superAdmin, readOnlyAudit });
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));
  const portalRoles = await getPortalSwitcherRoles(user.id, {
    superAdmin,
    hasEmployer: true,
  });
  const cookieStore = await cookies();
  const superAdminImpersonating =
    superAdmin && Boolean(cookieStore.get(SUPER_ADMIN_EMPLOYER_COOKIE)?.value);

  return (
    <EmployerPortalShell
      companyName={ctx.employer.companyName}
      companyLogoUrl={ctx.employer.logoUrl}
      employerTier={ctx.employer.tier}
      superAdmin={superAdmin}
      superAdminImpersonating={superAdminImpersonating}
      portalRoles={portalRoles}
      readOnlyAudit={readOnlyAudit}
    >
      {children}
    </EmployerPortalShell>
  );
}
