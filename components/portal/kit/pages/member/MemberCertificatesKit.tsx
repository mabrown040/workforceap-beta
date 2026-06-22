import { CheckCircle2, Download, Award, Hourglass } from 'lucide-react';
import { DesignSurface, KpiStrip } from '@/components/portal/kit';

/**
 * Member Portal — CERTIFICATES view.
 * Faithful port of `data-view-panel="certs"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Target route: app/(portal)/dashboard/certificates
 * Surface: warm (member-facing).
 */

interface EarnedCert {
  id: string;
  title: string;
  meta: string;
  verified?: boolean;
}

interface InProgressCert {
  id: string;
  title: string;
  /** 0–100. */
  percent: number;
  note: string;
}

export interface MemberCertificatesKitProps {
  earnedCount?: number;
  inProgressCount?: number;
  learningHours?: number;
  verifiedCount?: number;
  earned?: EarnedCert[];
  inProgress?: InProgressCert[];
}

const DEFAULT_EARNED: EarnedCert[] = [
  { id: 'aws-cp', title: 'AWS Cloud Practitioner', meta: 'Issued May 2026 · Credential ID AWS-CP-8841', verified: true },
  { id: 'sf-adm', title: 'Salesforce Administrator', meta: 'Issued Mar 2026 · Credential ID SF-ADM-2207', verified: true },
];

const DEFAULT_IN_PROGRESS: InProgressCert[] = [
  {
    id: 'aws-saa',
    title: 'AWS Solutions Architect Associate',
    percent: 40,
    note: 'Complete AWS Practitioner first to unlock the exam voucher.',
  },
];

export function MemberCertificatesKit({
  earnedCount = 2,
  inProgressCount = 1,
  learningHours = 86,
  verifiedCount = 2,
  earned = DEFAULT_EARNED,
  inProgress = DEFAULT_IN_PROGRESS,
}: MemberCertificatesKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        {/* KPI strip */}
        <KpiStrip
          items={[
            { label: 'Earned', value: earnedCount, color: 'gold' },
            { label: 'In Progress', value: inProgressCount, color: 'accent' },
            { label: 'Learning Hrs', value: learningHours, color: 'text' },
            { label: 'Verified', value: verifiedCount, color: 'success' },
          ]}
        />

        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 wa-gap-4">
          {/* Earned certificates */}
          {earned.map((cert) => (
            <div key={cert.id} className="wa-kit-card wa-kit-card--hover wa-flex wa-gap-4 sm:wa-gap-5" style={{ borderColor: '#ece2c8' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--wa-radius-sm)',
                  background: 'var(--wa-gold-soft, #FEF3C7)',
                  color: 'var(--wa-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wa-flex wa-flex-wrap wa-items-center wa-gap-2">
                  <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>{cert.title}</h3>
                  {cert.verified ? <CheckCircle2 size={15} color="var(--wa-success)" aria-label="Verified" style={{ flexShrink: 0 }} /> : null}
                </div>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 2 }}>{cert.meta}</p>
                <div className="wa-flex wa-flex-wrap wa-gap-2" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="wa-kit-focus wa-flex wa-items-center wa-gap-1"
                    style={{
                      padding: '6px 12px',
                      background: 'var(--wa-gold)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={11} /> Download
                  </button>
                  <button
                    type="button"
                    className="wa-kit-focus"
                    style={{
                      padding: '6px 12px',
                      border: '1px solid var(--wa-border)',
                      background: 'transparent',
                      fontWeight: 600,
                      fontSize: 11,
                      borderRadius: 999,
                      cursor: 'pointer',
                    }}
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* In-progress certificates (full-width) */}
          {inProgress.map((cert) => {
            const pct = Math.max(0, Math.min(100, Math.round(cert.percent)));
            return (
              <div
                key={cert.id}
                className="wa-kit-card wa-flex wa-gap-4 sm:wa-gap-5"
                style={{ gridColumn: '1 / -1', background: 'var(--wa-accent-soft)', borderColor: '#f3d4dc' }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--wa-radius-sm)',
                    background: 'var(--wa-surface)',
                    color: 'var(--wa-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #f3d4dc',
                  }}
                >
                  <Hourglass size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wa-flex wa-flex-wrap wa-items-center wa-justify-between wa-gap-2">
                    <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>{cert.title}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--wa-accent)', flexShrink: 0 }}>
                      In Progress · {pct}%
                    </span>
                  </div>
                  <div
                    className="wa-kit-bar-track"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${cert.title} progress`}
                    style={{ marginTop: 12, background: 'var(--wa-surface)' }}
                  >
                    <div className="wa-kit-bar-fill" style={{ width: `${pct}%`, background: 'var(--wa-accent)' }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 8 }}>{cert.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DesignSurface>
  );
}
