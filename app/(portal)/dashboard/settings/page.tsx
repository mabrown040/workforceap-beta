import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import SettingsForm from '@/components/portal/SettingsForm';
import DeleteAccountButton from '@/components/portal/DeleteAccountButton';

export const metadata: Metadata = buildPageMetadata({
  title: 'Settings',
  description: 'Account and notification settings.',
  path: '/dashboard/settings',
});

export default async function DashboardSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/settings');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      notificationsUpdates: true,
      notificationsReminders: true,
    },
  });

  if (!dbUser) redirect('/login');

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Settings</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
        Manage your account and preferences.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Change Password</h2>
        <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
          Use the link below to reset your password. You&apos;ll receive an email with instructions.
        </p>
        <Link href={`/forgot-password?email=${encodeURIComponent(dbUser.email)}`} className="btn btn-outline">
          Reset password
        </Link>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Email notification preferences</h2>
        <SettingsForm
          defaultUpdates={dbUser.notificationsUpdates ?? true}
          defaultReminders={dbUser.notificationsReminders ?? true}
        />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-error, #c00)' }}>Delete Account</h2>
        <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-gray-600)' }}>
          Permanently deactivate your account. Your data will be retained for records but you will no longer have access.
        </p>
        <DeleteAccountButton />
      </section>

      <Footer />
    </>
  );
}
