import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Account settings',
  description: 'Manage your account and password.',
  path: '/dashboard/account',
});
}

export default async function DashboardAccountPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/account');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  const email = dbUser?.email ?? user.email ?? '';

  return (
    <>
      <div className="portal-main-content">
        <PageHeader
          title="Account settings"
          subtitle="Manage your account and security."
          breadcrumbs={[
            { href: '/dashboard', label: 'Member Portal' },
            { label: 'Account settings' },
          ]}
        />

        <div style={{ maxWidth: '560px' }} className="content-card">
          <h2 className="portal-section-title">Email</h2>
          <p>{email}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            To change your email, please contact support.
          </p>

          <h2 className="portal-section-title" style={{ marginTop: '1.5rem' }}>Password</h2>
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
      </div>    </>
  );
}
