import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner settings',
  description: 'Partner portal settings.',
  path: '/partner/settings',
});

function row(label: string, value: string | null | boolean | Date, opts?: { mono?: boolean; bool?: boolean }) {
  let display: string;
  if (opts?.bool === true) {
    display = value === true ? 'On' : value === false ? 'Off' : '—';
  } else if (value instanceof Date) {
    display = value.toLocaleDateString();
  } else {
    display = value != null && String(value).trim() ? String(value) : '—';
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 140px) 1fr', gap: '0.5rem 1rem', alignItems: 'baseline', padding: '0.5rem 0', borderBottom: '1px solid var(--outline-variant)' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>{label}</span>
      <span
        style={{
          fontSize: opts?.mono ? '0.8rem' : '0.875rem',
          fontFamily: opts?.mono ? 'ui-monospace, monospace' : undefined,
          color: 'var(--color-on-surface)',
          wordBreak: 'break-word',
        }}
      >
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
    <div>
      <PageHeader
        title="Settings"
        subtitle="Your organization profile and notification defaults (read-only). Request changes through WorkforceAP staff — updates require approval."
      />

      <div className="stitch-card" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Organization</h2>
        {row('Name', partner.name)}
        {row('Slug', partner.slug, { mono: true })}
        {row('Referral code', partner.referralCode, { mono: true })}
        {row('Type', partner.organizationType)}
        {row('Status', partner.active, { bool: true })}
        {row('Onboarding done', partner.onboardingCompletedAt)}
        {row('Portal tour', partner.tourCompletedAt)}
      </div>

      <div className="stitch-card" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Primary contact</h2>
        {row('Contact name', partner.contactName)}
        {row('Email', partner.contactEmail)}
        {row('Phone', partner.contactPhone)}
      </div>

      <div className="stitch-card" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Email notifications (defaults)</h2>
        {row('New enrollment', partner.notifyOnEnrollment, { bool: true })}
        {row('Course milestones', partner.notifyOnCourse, { bool: true })}
        {row('Certified', partner.notifyOnCertified, { bool: true })}
        {row('Placed', partner.notifyOnPlaced, { bool: true })}
      </div>

      <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 640, lineHeight: 1.6, marginBottom: '1rem' }}>
        To change contact details, branding, or notification preferences, email{' '}
        <a href="mailto:info@workforceap.org">info@workforceap.org</a> or use the{' '}
        <Link href="/contact" style={{ color: 'var(--color-accent)' }}>
          contact form
        </Link>
        . Our team will confirm updates with you.
      </p>
    </div>
  );
}
