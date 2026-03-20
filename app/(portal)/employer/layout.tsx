import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
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

  return (
    <EmployerPortalShell companyName={ctx.employer.companyName}>
      {children}
    </EmployerPortalShell>
  );
}
