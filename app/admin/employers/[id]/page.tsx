import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

type Props = { params: Promise<{ id: string }> };

const CERT_SLUG_NAMES: Record<string, string> = {
  'google-it-support': 'Google IT Support',
  'comptia-a-plus': 'CompTIA A+',
  'aws-cloud-practitioner': 'AWS Cloud Practitioner',
  'google-project-management': 'Google Project Management',
  'ibm-data-analyst': 'IBM Data Analyst',
};

function certSlugToName(slug: string): string {
  return CERT_SLUG_NAMES[slug] ?? slug;
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  partner: 'Hiring Partner',
};

/** Mirrors the status label used on the employers list (list page has 3 states; collapsing to active/inactive here hid "Pending"). */
function accountStatusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'pending_approval') return 'Pending approval';
  return 'Inactive';
}

function getPartnershipTier(
  placementAgreementSigned: boolean,
  hiringPipelineActive: boolean,
): { label: string; color: string; bg: string } {
  if (placementAgreementSigned && hiringPipelineActive) {
    return { label: 'Strategic Hiring Partner', color: '#7b1fa2', bg: 'rgba(123,31,162,0.10)' };
  }
  if (placementAgreementSigned) {
    return { label: 'Hiring Partner', color: '#1565c0', bg: 'rgba(21,101,192,0.10)' };
  }
  if (hiringPipelineActive) {
    return { label: 'Active Pipeline', color: '#2e7d32', bg: 'rgba(46,125,50,0.10)' };
  }
  return { label: 'Standard', color: 'var(--color-on-surface-variant)', bg: 'var(--surface-container)' };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const employer = await prisma.employer.findUnique({
      where: { id },
      select: { companyName: true },
    });
    return buildPageMetadata({
      title: employer ? `Employer: ${employer.companyName}` : 'Employer Detail',
      description: 'Employer pipeline and partnership details.',
      path: `/admin/employers/${id}`,
    });
  } catch {
    return buildPageMetadata({
      title: 'Employer Detail',
      description: 'Employer pipeline and partnership details.',
      path: `/admin/employers/${id}`,
    });
  }
}

export default async function AdminEmployerDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect(`/login?redirectTo=/admin/employers`);
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { id } = await params;

  const employer = await prisma.employer.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, fullName: true } },
      _count: { select: { jobs: true } },
    },
  });

  if (!employer) notFound();

  const pt = getPartnershipTier(employer.placementAgreementSigned, employer.hiringPipelineActive);

  return (
    <PortalPageFrame>
      <PageHeader
        breadcrumbs={[{ label: 'Employers', href: '/admin/employers' }, { label: employer.companyName }]}
        title={employer.companyName}
        subtitle={`${employer.industry ?? 'Unknown industry'} · ${employer.companySize ?? 'Unknown size'}`}
      />

      {/* Partnership Summary Card */}
      <div
        className="portal-card portal-card--flat"
        style={{ padding: '1.75rem', marginBottom: '1.5rem' }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-on-surface)',
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Partnership Overview
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Partnership tier badge */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Partnership Tier
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.625rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                background: pt.bg,
                color: pt.color,
              }}
            >
              {pt.label}
            </span>
          </div>

          {/* Hiring pipeline status */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Hiring Pipeline
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.625rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                background: employer.hiringPipelineActive
                  ? 'rgba(46,125,50,0.10)'
                  : 'var(--surface-container-high)',
                color: employer.hiringPipelineActive
                  ? '#2e7d32'
                  : 'var(--color-on-surface-variant)',
              }}
            >
              {employer.hiringPipelineActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Placement agreement status */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Placement Agreement
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.625rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                background: employer.placementAgreementSigned
                  ? 'rgba(21,101,192,0.10)'
                  : 'var(--surface-container-high)',
                color: employer.placementAgreementSigned
                  ? '#1565c0'
                  : 'var(--color-on-surface-variant)',
              }}
            >
              {employer.placementAgreementSigned ? 'Signed' : 'Not signed'}
            </span>
          </div>
        </div>

        {/* Target certifications */}
        {employer.targetCertifications.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.625rem',
              }}
            >
              Target Certifications
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {employer.targetCertifications.map((slug) => (
                <span
                  key={slug}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                  }}
                >
                  {certSlugToName(slug)}
                </span>
              ))}
            </div>
          </div>
        )}

        {employer.targetCertifications.length === 0 && (
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface-variant)',
              fontStyle: 'italic',
            }}
          >
            No target certifications specified.
          </p>
        )}
      </div>

      {/* Company details */}
      <div className="portal-card portal-card--flat" style={{ padding: '1.75rem' }}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-on-surface)',
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Company Details
        </h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem 2rem',
          }}
        >
          {[
            { label: 'Contact name', value: employer.contactName },
            { label: 'Contact email', value: employer.contactEmail },
            { label: 'Contact phone', value: employer.contactPhone ?? '—' },
            { label: 'Website', value: employer.companyWebsite ?? '—' },
            { label: 'Industry', value: employer.industry ?? '—' },
            { label: 'Company size', value: employer.companySize ?? '—' },
            { label: 'Portal user', value: `${employer.user.fullName} (${employer.user.email})` },
            { label: 'Account tier', value: TIER_LABELS[employer.tier] ?? employer.tier },
            { label: 'Status', value: accountStatusLabel(employer.status) },
            { label: 'Jobs posted', value: String(employer._count.jobs) },
          ].map((row) => (
            <div key={row.label}>
              <dt
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem',
                }}
              >
                {row.label}
              </dt>
              <dd
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-on-surface)',
                  margin: 0,
                  wordBreak: 'break-all',
                }}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </PortalPageFrame>
  );
}
