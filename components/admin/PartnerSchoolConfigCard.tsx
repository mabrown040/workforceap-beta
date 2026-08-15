import Link from 'next/link';
import { getProgramBySlug } from '@/lib/content/programs';
import { enrollmentPathForSlug } from '@/lib/enroll/enrollmentPath';
import { CardHead, StatusTag } from '@/components/portal/kit';

export type PartnerSchoolConfig = {
  partnerType: string;
  referralCode: string | null;
  slug: string;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource: string | null;
  sponsorshipTermLabel: string | null;
  enrollmentPageEnabled: boolean;
  schoolDistrict: string | null;
  enrollmentHeadline: string | null;
  programSlugs: string[];
};

export default function PartnerSchoolConfigCard({ config }: { config: PartnerSchoolConfig }) {
  const enrollPath = enrollmentPathForSlug(config.slug);
  const programs = config.programSlugs
    .map((slug) => getProgramBySlug(slug)?.title ?? slug)
    .filter(Boolean);

  return (
    <div className="wa-kit-card" style={{ marginBottom: 24 }}>
      <CardHead title="School enrollment" />
      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, margin: 0 }}>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>Type</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>{config.partnerType}</dd>
        </div>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>Referral code</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>{config.referralCode || '—'}</dd>
        </div>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>Student page</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>
            {config.enrollmentPageEnabled ? (
              <Link href={enrollPath} style={{ color: 'var(--wa-accent)', fontWeight: 700 }}>
                {enrollPath}
              </Link>
            ) : (
              <StatusTag tone="muted">Off</StatusTag>
            )}
          </dd>
        </div>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>Sponsorship</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>
            {config.sponsoredEnrollment
              ? [config.sponsorshipFundingSource, config.sponsorshipTermLabel].filter(Boolean).join(' · ') || 'On'
              : 'Off'}
          </dd>
        </div>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>District</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>{config.schoolDistrict || '—'}</dd>
        </div>
        <div>
          <dt className="wa-kit-stat-label" style={{ marginBottom: 2 }}>Programs</dt>
          <dd style={{ margin: 0, fontSize: 14 }}>{programs.length > 0 ? programs.join(', ') : 'None selected'}</dd>
        </div>
      </dl>
      {config.enrollmentHeadline ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--wa-muted)' }}>{config.enrollmentHeadline}</p>
      ) : null}
    </div>
  );
}
