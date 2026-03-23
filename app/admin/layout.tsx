import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import AdminPortalShell from '@/components/portal/AdminPortalShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  return <AdminPortalShell>{children}</AdminPortalShell>;
}
