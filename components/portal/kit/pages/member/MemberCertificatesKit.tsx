'use client';

import { CheckCircle2, Download, Award } from 'lucide-react';
import Link from 'next/link';
import { DesignSurface, KpiStrip, ProgressBar, PageOpener } from '@/components/portal/kit';
import ShareButton from '@/components/ui/ShareButton';
import { buildCertificateShare, getBrowserShareOrigin } from '@/lib/og/shareAchievementLinks';

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
  /**
   * ISO date the credential was earned. When present, the Share action builds a
   * dated share link via `buildCertificateShare`; the route should forward the
   * member's real `earnedAt` here. Title-only sharing is used when omitted.
   */
  earnedAtIso?: string;
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
  /** Empty-state counselor CTA. Proofs pass /dev/member/messages. */
  counselorHref?: string;
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
    note: 'Finish AWS Practitioner to unlock the voucher.',
  },
];

/**
 * Share action for an earned certificate card. Mirrors the legacy
 * CertificationViewButton wiring: builds the dated share link via
 * `buildCertificateShare` and hands the title/text/url to the shared
 * `ShareButton` (Web Share API with copy-link fallback).
 */
function EarnedCertShareButton({ title, earnedAtIso }: { title: string; earnedAtIso?: string }) {
  const share = buildCertificateShare({
    origin: getBrowserShareOrigin(),
    certificateTitle: title,
    // Pass the real earned date through when the route forwards it; otherwise
    // leave it empty rather than inventing one (the share link's date param is
    // simply omitted). The shared credential title is real either way.
    earnedAtIso: earnedAtIso ?? '',
  });
  return <ShareButton chrome="kit" url={share.url} title={share.title} text={share.text} />;
}

export function MemberCertificatesKit({
  earnedCount = 2,
  inProgressCount = 1,
  learningHours = 86,
  verifiedCount = 2,
  earned = DEFAULT_EARNED,
  inProgress = DEFAULT_IN_PROGRESS,
  counselorHref = '/dashboard/messages',
}: MemberCertificatesKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-5">
        <PageOpener
          kicker="Credentials"
          title="Certificates and achievements"
          lede="Verified credentials, plus what's in progress."
          icon={<Award size={13} aria-hidden="true" />}
        />
        <KpiStrip
          items={[
            { label: 'Earned', value: earnedCount, color: 'gold' },
            { label: 'In progress', value: inProgressCount, color: 'accent' },
            { label: 'Hours', value: learningHours, color: 'text' },
            { label: 'Verified', value: verifiedCount, color: 'success' },
          ]}
        />

        <div className="wa-space-y-4">
          {/* Earned certificates — quiet bordered surface, rows + hairlines
              rather than a card mosaic (each row's own actions are the
              interaction, not the row itself). */}
          <div>
            <h2 className="sr-only">Earned certificates</h2>
            {earned.length === 0 ? (
              <div className="wa-kit-card">
                <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0 }}>No certificates yet</h3>
                <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  Completed credentials will appear here after they are logged and verified.
                </p>
                <Link
                  href={counselorHref}
                  className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    marginTop: 16,
                    padding: '10px 16px',
                    background: 'var(--wa-accent)',
                    color: 'var(--wa-on-accent)',
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Message counselor
                </Link>
              </div>
            ) : (
              <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
                {earned.map((cert, i) => (
                  <div
                    key={cert.id}
                    className="wa-flex wa-items-start wa-gap-4"
                    style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--wa-border)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wa-flex wa-flex-wrap wa-items-center wa-gap-2">
                        <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>{cert.title}</h3>
                        {cert.verified ? (
                          <CheckCircle2 size={15} color="var(--wa-success)" aria-label="Verified" style={{ flexShrink: 0 }} />
                        ) : null}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--wa-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{cert.meta}</p>
                      <div className="wa-flex wa-flex-wrap wa-gap-2" style={{ marginTop: 12 }}>
                        <a
                          href="/api/member/certifications/export"
                          download="my-certificates.csv"
                          className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none wa-flex wa-items-center wa-gap-1"
                          title="Download your certificate records (CSV)"
                          style={{
                            minHeight: 44,
                            padding: '10px 12px',
                            background: 'var(--wa-accent)',
                            color: 'var(--wa-on-accent)',
                            fontWeight: 600,
                            fontSize: 13,
                            borderRadius: 999,
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'none',
                          }}
                        >
                          <Download size={14} aria-hidden="true" /> Download
                        </a>
                        <EarnedCertShareButton title={cert.title} earnedAtIso={cert.earnedAtIso} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {inProgress.length > 0 ? (
            <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
              <h2 className="sr-only">Certificates in progress</h2>
              {inProgress.map((cert, i) => {
                const pct = Math.max(0, Math.min(100, Math.round(cert.percent)));
                return (
                  <div
                    key={cert.id}
                    style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--wa-border)' }}
                  >
                    <div className="wa-flex wa-flex-wrap wa-items-center wa-justify-between wa-gap-2">
                      <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>{cert.title}</h3>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-accent)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <ProgressBar pct={pct} aria-label={`${cert.title} progress`} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--wa-muted)', marginTop: 8, lineHeight: 1.45 }}>{cert.note}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </DesignSurface>
  );
}
