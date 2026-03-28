import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner resources',
  description: 'Links and contacts for partner organizations.',
  path: '/partner/resources',
});

const PUBLIC_LINKS = [
  { href: '/programs', label: 'Training programs', desc: 'Certifications and pathways we offer.' },
  { href: '/how-it-works', label: 'How it works', desc: 'Timeline from application to job search support.' },
  { href: '/faq', label: 'FAQ', desc: 'Common questions for participants and partners.' },
  { href: '/contact', label: 'Contact', desc: 'Reach the WorkforceAP team.' },
];

export default async function PartnerResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/resources');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const partner = await prisma.partner.findUnique({
    where: { id: ctx.partnerId },
    select: { contactName: true, contactEmail: true, contactPhone: true },
  });

  return (
    <div>
      <PageHeader
        title="Partner resources"
        subtitle={`Quick links for ${ctx.partner.name} and your internal team.`}
      />

      {(partner?.contactEmail || partner?.contactPhone || partner?.contactName) && (
        <section className="partner-contact-section">
          <h2>Partner contacts (on file)</h2>
          {partner.contactName && <p>{partner.contactName}</p>}
          {partner.contactEmail && (
            <p>
              <a href={`mailto:${partner.contactEmail}`} className="link-accent">
                {partner.contactEmail}
              </a>
            </p>
          )}
          {partner.contactPhone && <p>{partner.contactPhone}</p>}
        </section>
      )}

      <h2 className="partner-resources-heading">WorkforceAP</h2>
      <div className="partner-resources-grid">
        {PUBLIC_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="partner-resource-link">
            <strong className="partner-resource-title">{item.label}</strong>
            <p className="partner-resource-desc">{item.desc}</p>
          </Link>
        ))}
      </div>

      <p className="partner-resource-note">
        Member-facing tools (resume, learning, assessments) live in the{' '}
        <Link href="/dashboard" className="link-accent">
          member portal
        </Link>{' '}
        after they enroll.
      </p>
    </div>
  );
}
