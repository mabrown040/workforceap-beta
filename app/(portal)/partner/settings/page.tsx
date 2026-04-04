import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner settings',
  description: 'Partner portal settings.',
  path: '/partner/settings',
});

export default async function PartnerSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/settings');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Your partner profile is managed with WorkforceAP. Request changes below — updates require staff approval."
      />
      <div
        className="stitch-card"
        style={{ padding: '1.25rem', maxWidth: 560, marginBottom: '1.25rem' }}
      >
        <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Organization (read-only)</h2>
        <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>{ctx.partner.name}</p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Slug: <code style={{ fontSize: '0.8rem' }}>{ctx.partner.slug}</code>
        </p>
      </div>
      <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 560, lineHeight: 1.6 }}>
        To update contact details, notification preferences, or branding, email{' '}
        <a href="mailto:info@workforceap.org">info@workforceap.org</a> or use the{' '}
        <Link href="/contact" style={{ color: 'var(--color-accent)' }}>
          contact form
        </Link>
        .
      </p>
    </div>
  );
}
