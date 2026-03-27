import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import AdminPortalShell from '@/components/portal/AdminPortalShell';
import OrgBrandingBar from '@/components/platform/OrgBrandingBar';
import { getDefaultOrgBranding } from '@/lib/platform/defaultOrgTheme';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const branding = await getDefaultOrgBranding();
  const superAdmin = await isSuperAdmin(user.id);

  return (
    <>
      <OrgBrandingBar branding={branding} />
      <AdminPortalShell superAdmin={superAdmin}>{children}</AdminPortalShell>
    </>
  );
}
