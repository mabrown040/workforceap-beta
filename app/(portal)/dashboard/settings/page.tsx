import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import SettingsForm from '@/components/portal/SettingsForm';
import DeleteAccountButton from '@/components/portal/DeleteAccountButton';
import MobileBottomNav from '@/components/MobileBottomNav';
import StartTourButton from '@/components/onboarding/StartTourButton';

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

  const settingsRows = [
    { label: 'Profile Info', icon: 'person', href: '/dashboard/profile', desc: 'Name, photo, contact details' },
    { label: 'Notifications', icon: 'notifications', href: '#notifications', desc: 'Alerts and email preferences' },
    { label: 'Privacy', icon: 'lock', href: '#privacy', desc: 'Profile visibility, data sharing' },
    { label: 'Account Security', icon: 'security', href: `/forgot-password?email=${encodeURIComponent(dbUser.email)}`, desc: 'Password, login methods' },
  ];

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.25rem' }}>
            Settings
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Manage your account and preferences.
          </p>
        </div>

        {/* Tappable Section Rows */}
        <div style={{ padding: '0 1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '0.875rem',
              overflow: 'hidden',
            }}
          >
            {settingsRows.map((row, idx) => (
              <a
                key={row.label}
                href={row.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  borderBottom: idx < settingsRows.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    background: 'var(--surface-container-highest)',
                    borderRadius: '0.5rem',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '1.125rem', color: 'var(--color-accent)' }}
                  >
                    {row.icon}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{row.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.desc}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                  chevron_right
                </span>
              </a>
            ))}
            {/* Portal Tour row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.875rem 1rem',
                borderBottom: 'none',
              }}
            >
              <div
                style={{
                  background: 'var(--surface-container-highest)',
                  borderRadius: '0.5rem',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1.125rem', color: 'var(--color-accent)' }}
                >
                  route
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Portal Tour</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Take a guided tour of your dashboard
                </div>
              </div>
              <StartTourButton style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ padding: '0 1rem' }}>
          <div
            style={{
              background: 'rgba(176,0,32,0.06)',
              border: '1px solid rgba(176,0,32,0.2)',
              borderRadius: '0.875rem',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.125rem', color: 'var(--color-error, #b00020)', fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-error, #b00020)' }}>Danger Zone</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.875rem' }}>
              Permanently deactivate your account. Your data will be retained for records but you will no longer have access.
            </p>
            <DeleteAccountButton />
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden wa-md:wa-block">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Portal Tour</h2>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-on-surface-variant)' }}>
            New to the portal? Take a quick guided tour of your dashboard, tools, and features.
          </p>
          <StartTourButton />
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-error, #c00)' }}>Delete Account</h2>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-on-surface-variant)' }}>
            Permanently deactivate your account. Your data will be retained for records but you will no longer have access.
          </p>
          <DeleteAccountButton />
        </section>
      </div>
    </>
  );
}
