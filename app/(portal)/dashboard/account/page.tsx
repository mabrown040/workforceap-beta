import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Account settings',
  description: 'Manage your account and password.',
  path: '/dashboard/account',
});

export default async function DashboardAccountPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/account');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  const email = dbUser?.email ?? user.email ?? '';

  return (
    <>
      <div className="inner-page wa-pb-24 md:wa-pb-8">
        <section className="page-hero">
          <div className="page-hero-content">
            <div style={{ marginBottom: '0.75rem' }}>
              <PortalBreadcrumb
                variant="on-dark"
                items={[
                  { href: '/dashboard', label: 'Dashboard' },
                  { label: 'Account settings' },
                ]}
              />
            </div>
            <h1>Account settings</h1>
            <p>Manage your account and security.</p>
          </div>
        </section>

        <section className="content-section">
          <div className="container">
            <div style={{ maxWidth: '560px' }} className="help-request-card">
              <h2>Email</h2>
              <p>{email}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                To change your email, please contact support.
              </p>

              <h2 style={{ marginTop: '1.5rem' }}>Password</h2>
              <p style={{ marginBottom: '0.5rem' }}>
                Use the link below to reset your password. You&rsquo;ll receive an email with instructions.
              </p>
              <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="btn btn-outline">
                Reset password
              </Link>

              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                <Link href="/dashboard/profile">Back to profile</Link>
              </p>
            </div>
          </div>
        </section>

      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
