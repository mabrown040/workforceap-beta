import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Partner resources',
  description: 'Links and contacts for partner organizations.',
  path: '/partner/resources',
});
}

const PUBLIC_LINKS = [
  { href: '/programs', label: 'Training Programs', desc: 'Certificates and pathways we offer.' },
  { href: '/how-it-works', label: 'How It Works', desc: 'Timeline from application to job search support.' },
  { href: '/faq', label: 'FAQ', desc: 'Common questions for participants and partners.' },
  { href: '/contact', label: 'Contact', desc: 'Reach the WorkforceAP team.' },
];

export default async function PartnerResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/resources');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const partner = await prisma.partner.findUnique({
    where: { id: ctx.partnerId },
    select: { contactName: true, contactEmail: true, contactPhone: true },
  });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Partner Resources"
        subtitle={`Quick links for ${ctx.partner.name} and your internal team.`}
      />
      {/* Mobile View */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
      {(partner?.contactEmail || partner?.contactPhone || partner?.contactName) && (
        <section
          style={{
            marginBottom: '2rem',
            padding: '1.25rem',
            borderRadius: 10,
            background: 'var(--surface-container)',
            maxWidth: 560,
          }}
        >
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Partner contacts (on file)</h2>
          {partner.contactName && <p style={{ margin: '0 0 0.35rem' }}>{partner.contactName}</p>}
          {partner.contactEmail && (
            <p style={{ margin: '0 0 0.35rem' }}>
              <a href={`mailto:${partner.contactEmail}`} style={{ color: 'var(--color-accent)' }}>
                {partner.contactEmail}
              </a>
            </p>
          )}
          {partner.contactPhone && <p style={{ margin: 0 }}>{partner.contactPhone}</p>}
        </section>
      )}

      <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>WorkforceAP</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {PUBLIC_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '1rem',
              borderRadius: 10,
              textDecoration: 'none',
              color: 'inherit',
              background: 'var(--surface-container)',
            }}
          >
            <strong style={{ color: 'var(--color-accent)' }}>{item.label}</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', padding: '0 1rem' }}>
        Member-facing tools (resume, learning, assessments) live in the{' '}
        <Link href="/dashboard" style={{ color: 'var(--color-accent)' }}>
          Member Portal
        </Link>{' '}
        after they enroll.
      </p>
    </div>

    {/* Desktop View */}
    <div className="wa-hidden md:wa-block">
      {(partner?.contactEmail || partner?.contactPhone || partner?.contactName) && (
        <section
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            background: 'var(--surface-container-low)',
            maxWidth: 560,
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>Partner contacts (on file)</h2>
          {partner.contactName && <p style={{ margin: '0 0 0.35rem', color: 'var(--color-on-surface)' }}>{partner.contactName}</p>}
          {partner.contactEmail && (
            <p style={{ margin: '0 0 0.35rem' }}>
              <a href={`mailto:${partner.contactEmail}`} style={{ color: 'var(--color-accent)' }}>
                {partner.contactEmail}
              </a>
            </p>
          )}
          {partner.contactPhone && <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>{partner.contactPhone}</p>}
        </section>
      )}

      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-on-surface-variant)' }}>WorkforceAP</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {PUBLIC_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '1.25rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              color: 'inherit',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <strong style={{ color: 'var(--color-accent)' }}>{item.label}</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
        Member-facing tools (resume, learning, assessments) live in the{' '}
        <Link href="/dashboard" style={{ color: 'var(--color-accent)' }}>
          Member Portal
        </Link>{' '}
        after they enroll.
      </p>
    </div>
    </PortalPageFrame>
  );
}
