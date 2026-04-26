import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PartnerNotificationPrefs from '@/components/partner/PartnerNotificationPrefs';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner settings',
  description: 'Partner portal settings.',
  path: '/partner/settings',
});

function InfoRow({ label, value, mono }: { label: string; value: string | null | boolean | Date; mono?: boolean }) {
  let display: string;
  if (typeof value === 'boolean') display = value ? 'Active' : 'Inactive';
  else if (value instanceof Date) display = value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  else display = value != null && String(value).trim() ? String(value) : '—';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)', fontFamily: mono ? 'ui-monospace, monospace' : undefined, wordBreak: 'break-all', textAlign: 'right' }}>
        {display}
      </span>
    </div>
  );
}

export default async function PartnerSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/settings');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const partner = await prisma.partner.findUnique({
    where: { id: ctx.partnerId },
    select: {
      name: true,
      slug: true,
      referralCode: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      organizationType: true,
      active: true,
      notifyOnEnrollment: true,
      notifyOnCourse: true,
      notifyOnCertified: true,
      notifyOnPlaced: true,
      onboardingCompletedAt: true,
      tourCompletedAt: true,
    },
  });
  if (!partner) redirect('/dashboard');

  return (
    <>
      <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '5rem' }}>
        <PageHeader
          title="Partner Settings"
          subtitle="Your organization profile and notification preferences."
          breadcrumbs={[{ label: 'Partner Portal', href: '/partner' }, { label: 'Settings' }]}
        />

      <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1rem' }}>
        <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Organization</h2>
        <InfoRow label="Name" value={partner.name} />
        <InfoRow label="Slug" value={partner.slug} mono />
        <InfoRow label="Referral code" value={partner.referralCode} mono />
        <InfoRow label="Type" value={partner.organizationType} />
        <InfoRow label="Status" value={partner.active} />
        <InfoRow label="Onboarding done" value={partner.onboardingCompletedAt} />
        <InfoRow label="Portal tour" value={partner.tourCompletedAt} />
      </div>

      <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1rem' }}>
        <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Primary contact</h2>
        <InfoRow label="Contact name" value={partner.contactName} />
        <InfoRow label="Email" value={partner.contactEmail} />
        <InfoRow label="Phone" value={partner.contactPhone} />
      </div>

      <PartnerNotificationPrefs
        initial={{
          notifyOnEnrollment: partner.notifyOnEnrollment,
          notifyOnCourse: partner.notifyOnCourse,
          notifyOnCertified: partner.notifyOnCertified,
          notifyOnPlaced: partner.notifyOnPlaced,
        }}
      />

      <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 640, lineHeight: 1.6, marginBottom: '1rem' }}>
        To change contact details or branding, email{' '}
        <a href="mailto:info@workforceap.org">info@workforceap.org</a> or use the{' '}
        <Link href="/contact" style={{ color: 'var(--color-accent)' }}>
          contact form
        </Link>
        .
      </p>
      </div>
      <MobileBottomNav variant="partner" />
    </>
  );
}
