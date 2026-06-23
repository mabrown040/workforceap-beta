import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { DefinitionList, DefinitionRow } from '@/components/portal/ui/DefinitionList';
import PartnerNotificationPrefs from '@/components/partner/PartnerNotificationPrefs';
import PartnerContactEditForm from '@/components/partner/PartnerContactEditForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Partner settings',
  description: 'Partner portal settings.',
  path: '/partner/settings',
});
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
  if (!partner) redirect(await unlinkedPartnerHref(user.id));

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
        <DefinitionList>
          <DefinitionRow label="Name" value={partner.name} />
          <DefinitionRow label="Slug" value={partner.slug} mono />
          <DefinitionRow label="Referral Code" value={partner.referralCode} mono />
          <DefinitionRow label="Type" value={partner.organizationType} />
          <DefinitionRow label="Status" value={partner.active} />
          <DefinitionRow label="Onboarding Complete" value={partner.onboardingCompletedAt} />
          <DefinitionRow label="Portal Tour" value={partner.tourCompletedAt} />
        </DefinitionList>
      </div>

      <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1rem' }}>
        <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Primary Contact</h2>
        <DefinitionList>
          <DefinitionRow label="Email" value={partner.contactEmail} />
        </DefinitionList>
        <PartnerContactEditForm
          partnerId={ctx.partnerId}
          initialContactName={partner.contactName}
          initialContactPhone={partner.contactPhone}
        />
      </div>

      <PartnerNotificationPrefs
        initial={{
          notifyOnEnrollment: partner.notifyOnEnrollment,
          notifyOnCourse: partner.notifyOnCourse,
          notifyOnCertified: partner.notifyOnCertified,
          notifyOnPlaced: partner.notifyOnPlaced,
        }}
      />

      <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 640, lineHeight: 1.6, marginBottom: '1rem', fontSize: '0.875rem' }}>
        To change your organization name, slug, or referral code, please{' '}
        <a href="mailto:info@workforceap.org">contact our team</a>.
      </p>
      </div>
    </>
  );
}
