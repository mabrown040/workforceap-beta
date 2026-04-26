import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import AdminPortalShell from '@/components/portal/AdminPortalShell';
import OrgBrandingBar from '@/components/platform/OrgBrandingBar';
import { getDefaultOrgBranding } from '@/lib/platform/defaultOrgTheme';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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

  try {
    const hasAdmin = await isAdmin(user.id);
    if (!hasAdmin) redirect('/dashboard');

    const [branding, superAdmin, portalRoles] = await Promise.all([
      getDefaultOrgBranding(),
      isSuperAdmin(user.id),
      getPortalSwitcherRoles(user.id),
    ]);

    return (
      <>
        <OrgBrandingBar branding={branding} />
        <AdminPortalShell superAdmin={superAdmin} portalRoles={portalRoles}>{children}</AdminPortalShell>
      </>
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[admin/layout] Failed to load admin shell:', err);
    return (
      <div className="portal-route-fallback" style={{ padding: '2rem', maxWidth: '36rem' }}>
        <h1 className="portal-route-fallback__title">Admin temporarily unavailable</h1>
        <p className="portal-route-fallback__desc">
          We could not finish loading the admin workspace (often a short database issue). Wait a moment and reload,
          or try again from the home page.
        </p>
        <nav className="portal-route-fallback__nav" aria-label="Helpful links">
          <Link href="/admin" className="btn btn-primary btn-sm">
            Retry admin home
          </Link>
          <Link href="/dashboard" className="btn btn-outline btn-sm">
            Member dashboard
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm">
            WorkforceAP home
          </Link>
        </nav>
      </div>
    );
  }
}
