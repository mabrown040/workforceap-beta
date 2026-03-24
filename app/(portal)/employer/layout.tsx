import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { getEmployerForUser, isSuperAdmin, SUPER_ADMIN_EMPLOYER_COOKIE } from '@/lib/auth/roles';
import EmployerPortalShell from '@/components/portal/EmployerPortalShell';

export default async function EmployerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const superAdmin = await isSuperAdmin(user.id);
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
    >
      {children}
    </EmployerPortalShell>
  );
}
