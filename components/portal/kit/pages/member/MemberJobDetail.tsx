import { Briefcase } from 'lucide-react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { DesignSurface, PageOpener } from '@/components/portal/kit';

/**
 * Member Portal — JOB DETAIL (open role).
 * Same PageOpener + wa-kit-card chrome as the listing/board so
 * /dev/member/jobs?state=detail and /dashboard/jobs/[id] read as one product.
 *
 * Target route: app/(portal)/dashboard/jobs/[id]
 * Surface: warm (member-facing).
 */

export interface JobDetailScreeningQuestion {
  id?: string;
  prompt?: string;
  type?: string;
}

export interface MemberJobDetailProps {
  title: string;
  company: string;
  location: string;
  jobType: string;
  salary?: string | null;
  description?: string | null;
  requirements?: string[];
  backHref?: string;
  backLabel?: string;
  logoUrl?: string | null;
  screening?: {
    packTitle: string;
    employerLabel: string;
    questions: JobDetailScreeningQuestion[];
  } | null;
  referral?: { company: string; message: string; copySlot?: ReactNode } | null;
  applySlot?: ReactNode;
}

function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NextLink
      href={href}
      className="wa-kit-focus"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 44,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--wa-accent)',
        textDecoration: 'none',
      }}
    >
      {children}
    </NextLink>
  );
}

export function MemberJobDetail({
  title,
  company,
  location,
  jobType,
  salary,
  description,
  requirements = [],
  backHref = '/dashboard/jobs',
  backLabel = 'Back to board',
  logoUrl,
  screening,
  referral,
  applySlot,
}: MemberJobDetailProps) {
  const lede = [company, location, jobType].filter(Boolean).join(' · ');

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <PageOpener
          kicker="Job search"
          title={title}
          lede={lede}
          icon={<Briefcase size={13} aria-hidden="true" />}
          action={
            <span
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--wa-surface-2)',
                color: 'var(--wa-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Briefcase size={20} />
              )}
            </span>
          }
        />

        {salary ? (
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--wa-text)', margin: 0 }}>
            {salary}
          </p>
        ) : null}

        {description ? (
          <div className="wa-kit-card">
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Description
            </h2>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: 'var(--wa-text)' }}>
              {description}
            </div>
          </div>
        ) : null}

        {requirements.length > 0 ? (
          <div className="wa-kit-card">
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Requirements
            </h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--wa-text)', fontSize: 14, lineHeight: 1.55 }}>
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {screening && screening.questions.length > 0 ? (
          <div className="wa-kit-card">
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              What this employer looks for
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--wa-muted)', lineHeight: 1.5 }}>
              {screening.packTitle} — shared by {screening.employerLabel}. Informational, so you can prepare before you apply.
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, fontSize: 14, lineHeight: 1.55 }}>
              {screening.questions.map((q, i) => (
                <li key={q.id ?? i}>
                  {q.prompt ?? 'See counselor for details.'}
                  {q.type ? (
                    <span style={{ fontSize: 13, color: 'var(--wa-muted)' }}>
                      {' '}
                      ({q.type.replace(/_/g, ' ')})
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {referral ? (
          <div
            className="wa-kit-card"
            style={{
              background: 'var(--wa-accent-soft)',
              borderLeft: '3px solid var(--wa-accent)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Know someone at {referral.company}?
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--wa-muted)' }}>
              A warm intro more than doubles your odds vs. applying cold. If you know anyone there — even loosely — send them this:
            </p>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.55,
                padding: '12px 14px',
                borderRadius: 'var(--wa-radius-sm)',
                border: '1px solid var(--wa-border)',
                background: 'var(--wa-surface)',
                color: 'var(--wa-text)',
                marginBottom: 12,
              }}
            >
              {referral.message}
            </div>
            {referral.copySlot}
          </div>
        ) : null}

        {applySlot}
      </div>
    </DesignSurface>
  );
}
