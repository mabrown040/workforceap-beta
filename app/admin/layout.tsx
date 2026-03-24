import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import AdminPortalShell from '@/components/portal/AdminPortalShell';
import OrgBrandingBar from '@/components/platform/OrgBrandingBar';
import { getDefaultOrgBranding } from '@/lib/platform/defaultOrgTheme';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const branding = await getDefaultOrgBranding();

  return (
    <>
      <OrgBrandingBar branding={branding} />
      <AdminPortalShell>{children}</AdminPortalShell>
    </>
  );
}
