import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PartnerNotificationPrefs from '@/components/partner/PartnerNotificationPrefs';
import PartnerSettingsEditRequest from '@/components/partner/PartnerSettingsEditRequest';
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
  if (!ctx) redirect('/dashboard');

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

        {/* Organization profile card */}
        <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Organization</h2>
            <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: partner.active ? 'rgba(74,155,79,0.12)' : 'rgba(173,44,77,0.1)', color: partner.active ? 'var(--color-green, #4a9b4f)' : 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {partner.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="portal-profile-section-card__body">
            <InfoRow label="Organization name" value={partner.name} />
            <InfoRow label="Type" value={partner.organizationType} />
            <InfoRow label="Slug" value={partner.slug} mono />
            <InfoRow label="Referral code" value={partner.referralCode} mono />
            <InfoRow label="Onboarding" value={partner.onboardingCompletedAt} />
          </div>
        </div>

        {/* Primary contact card */}
        <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Primary Contact</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <InfoRow label="Name" value={partner.contactName} />
            <InfoRow label="Email" value={partner.contactEmail} />
            <InfoRow label="Phone" value={partner.contactPhone} />
          </div>
        </div>

        {/* Edit request — partners can request one set of changes */}
        <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Request Changes</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Need to update your contact info or organization name? Submit a change request and our team will apply it within one business day.
            </p>
            <PartnerSettingsEditRequest
              currentName={partner.name}
            currentContactName={partner.contactName ?? ''}
            currentContactEmail={partner.contactEmail ?? ''}
              currentContactPhone={partner.contactPhone ?? ''}
              currentOrgType={partner.organizationType ?? ''}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Notifications</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <PartnerNotificationPrefs
              initial={{
                notifyOnEnrollment: partner.notifyOnEnrollment,
                notifyOnCourse: partner.notifyOnCourse,
                notifyOnCertified: partner.notifyOnCertified,
                notifyOnPlaced: partner.notifyOnPlaced,
              }}
            />
          </div>
        </div>
      </div>
      <MobileBottomNav variant="partner" />
    </>
  );
}
