import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import PageHeader from '@/components/portal/PageHeader';
import EmployerSettingsForm from '@/components/employer/EmployerSettingsForm';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Company settings',
  description: 'Employer portal company settings.',
  path: '/employer/settings',
});
}

export default async function EmployerSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/settings');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: {
      companyName: true,
      companyDescription: true,
      companyWebsite: true,
      companySize: true,
      industry: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      logoUrl: true,
    },
  });
  if (!employer) redirect(await unlinkedEmployerHref(user.id));

  const employerInitial = {
    ...employer,
    logoUrl: resolveSupabasePublicAssetUrl('employer-logos', employer.logoUrl),
  };

  return (
    <>
      <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '5rem' }}>
        <PageHeader
          title="Company Settings"
          subtitle="Update your company profile, logo, and hiring contact."
          breadcrumbs={[{ label: 'Employer Portal', href: '/employer' }, { label: 'Settings' }]}
        />

        {/* Logo + form card */}
        <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Company Profile</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <EmployerSettingsForm initial={employerInitial} />
          </div>
        </div>

        {/* Quick nav */}
        <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.875rem' }}>
            What you can do now
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { href: '/employer/jobs', icon: 'work', label: 'Manage job postings', desc: 'Create, edit, submit for review, and publish roles.' },
              { href: '/employer/applications', icon: 'grading', label: 'Review applicants', desc: 'See applications and update hiring status.' },
              { href: '/employer/messages', icon: 'forum', label: 'Messages & support', desc: 'Contact WorkforceAP about billing, users, or details.' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="portal-quick-action-item" style={{ textDecoration: 'none' }}>
                <div className="portal-quick-action-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="portal-quick-action-item__label">{item.label}</p>
                  <p className="portal-quick-action-item__desc">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
              </Link>
            ))}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginTop: '1rem' }}>
            For urgent changes email{' '}
            <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              info@workforceap.org
            </a>.
          </p>
        </div>
      </div>
    </>
  );
}
