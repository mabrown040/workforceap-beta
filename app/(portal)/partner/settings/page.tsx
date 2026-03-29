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
        subtitle={`Portal context: ${ctx.partner.name}. Contact WorkforceAP to update partner contact details or notification preferences.`}
      />
      <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 560, lineHeight: 1.6 }}>
        For changes to your organization profile, email{' '}
        <a href="mailto:info@workforceap.org">info@workforceap.org</a> or use the{' '}
        <Link href="/contact" style={{ color: 'var(--color-accent)' }}>
          contact form
        </Link>
        .
      </p>
    </div>
  );
}
