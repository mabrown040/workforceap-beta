import { Award, Check, FileText } from 'lucide-react';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';

/**
 * Certifications queue — approval queue for member-submitted credential proof
 * (dense). Mockup: workforceap-admin-subviews.html "Certifications Queue".
 * Target route: /admin/certifications
 *
 * Pure read/presentational view — Approve / Reject are stubs (the orchestrator
 * wires the mutations later), so no 'use client' yet.
 */
export interface CertSubmission {
  id: string;
  /** Credential the member is claiming, e.g. "AWS Cloud Practitioner". */
  credential: string;
  /** Member name. */
  member: string;
  /** Program + any credential id / issuer + submitted-at, as one meta line. */
  meta: string;
  /** Where "View proof" points (wire to the uploaded proof later). */
  proofHref?: string;
}

export interface CertificationsQueueKitProps {
  submissions?: CertSubmission[];
  /** Awaiting-review count for the header. Defaults to submissions.length. */
  awaitingCount?: number;
}

const DEFAULT_SUBMISSIONS: CertSubmission[] = [
  {
    id: 'aws-cp',
    credential: 'AWS Cloud Practitioner',
    member: 'Mike Brown',
    meta: 'Cloud & IT · Credential ID AWS-CP-8841 · submitted 2h ago',
    proofHref: '#',
  },
  {
    id: 'cna',
    credential: 'Certified Nursing Assistant',
    member: 'Tanya Reed',
    meta: 'Healthcare · TX State Board · submitted 5h ago',
    proofHref: '#',
  },
  {
    id: 'epa-608',
    credential: 'EPA 608 Certification',
    member: 'Carlos Torres',
    meta: 'Skilled Trades · submitted 1d ago',
    proofHref: '#',
  },
];

export function CertificationsQueueKit({
  submissions = DEFAULT_SUBMISSIONS,
  awaitingCount,
}: CertificationsQueueKitProps) {
  const count = awaitingCount ?? submissions.length;

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader title="Certifications queue" kicker="Approval queue" />

      {/* Gold "achievement" banner. wa-kit-card--gradient-gold falls back to a
          calm gold tint in the dense surface (per the kit). */}
      <div
        className="wa-kit-card wa-kit-card--gradient-gold"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="wa-flex md:wa-flex-row wa-flex-col md:wa-items-center wa-justify-between wa-gap-3">
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.85,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Award size={13} /> Approval queue
            </div>
            <h3
              className="h-font"
              style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 2px' }}
            >
              {count} awaiting review
            </h3>
            <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
              Verify proof to count toward outcomes.
            </p>
          </div>
          <button
            type="button"
            className="wa-kit-focus"
            style={{
              alignSelf: 'flex-start',
              whiteSpace: 'nowrap',
              padding: '10px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--wa-gold)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Approve all verified
          </button>
        </div>
      </div>

      <div className="wa-space-y-3">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="wa-kit-card wa-kit-card--sm"
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--wa-gold-soft)',
                color: 'var(--wa-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{sub.credential}</div>
              <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>
                {sub.member} · {sub.meta}
              </div>
            </div>

            <a
              href={sub.proofHref ?? '#'}
              className="wa-hidden md:wa-inline-flex wa-kit-focus"
              style={{
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--wa-info)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <FileText size={13} /> View proof
            </a>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="wa-kit-focus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--wa-success)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <Check size={13} /> Approve
              </button>
              <button
                type="button"
                className="wa-kit-focus"
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--wa-border)',
                  background: 'var(--wa-surface)',
                  color: 'var(--wa-text)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </DesignSurface>
  );
}
