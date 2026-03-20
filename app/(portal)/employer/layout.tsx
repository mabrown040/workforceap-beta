import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, isSuperAdmin } from '@/lib/auth/roles';
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

  return (
    <EmployerPortalShell companyName={ctx.employer.companyName} superAdmin={superAdmin}>
      {children}
    </EmployerPortalShell>
  );
}
