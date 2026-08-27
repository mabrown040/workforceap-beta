import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';

/**
 * Index of the credential-free staff (dense) proof routes.
 *
 * The real staff surfaces under /admin, /employer, /partner and /counselor all
 * redirect to Sign In without Supabase credentials, so these pages are the only
 * way to review dense UI without secrets. This page just lists them — without
 * it the proofs are undiscoverable unless you already know the URLs.
 */
export const dynamic = 'force-dynamic';

interface Proof {
  href: string;
  title: string;
  detail: string;
}

const GROUPS: { label: string; proofs: Proof[] }[] = [
  {
    label: 'Admin',
    proofs: [
      { href: '/dev/staff/admin-command', title: 'Command Center', detail: 'KPI sparklines, work queue, program health, system health' },
      { href: '/dev/staff/students-roster', title: 'Students roster', detail: 'Saved-view filter chips over the member roster' },
      { href: '/dev/staff/invites', title: 'Invites', detail: 'Acceptance KPIs and the invite table' },
      { href: '/dev/staff/counselors', title: 'Counselors roster', detail: 'Caseload and response-time roster' },
      { href: '/dev/staff/jobs-board', title: 'Jobs board', detail: 'Approved open roles' },
      { href: '/dev/staff/placements', title: 'Placements', detail: 'Confirmed hires and retention' },
      { href: '/dev/staff/pipeline-funnel', title: 'Applications funnel', detail: 'Stage-by-stage conversion' },
      { href: '/dev/staff/crons-monitor', title: 'Cron monitor', detail: 'Scheduled job health' },
    ],
  },
  {
    label: 'Employer',
    proofs: [
      { href: '/dev/staff/employer-command', title: 'Employer home', detail: 'Hiring cockpit' },
      { href: '/dev/staff/employer-jobs', title: 'Employer jobs', detail: 'Posted roles and applicants' },
    ],
  },
  {
    label: 'Partner',
    proofs: [
      { href: '/dev/staff/partner-command', title: 'Partner home', detail: 'Referral and outcome cockpit' },
      { href: '/dev/staff/partner', title: 'Partner overview', detail: 'Partner overview composite' },
      { href: '/dev/staff/partner-members', title: 'Partner members', detail: 'Referred member roster' },
    ],
  },
  {
    label: 'Counselor',
    proofs: [
      { href: '/dev/staff/counselor-command', title: 'Counselor home', detail: 'Caseload cockpit and reply queue' },
      { href: '/dev/staff/counselor-atrisk', title: 'At-risk caseload', detail: 'Members needing outreach' },
    ],
  },
  {
    label: 'Cross-cutting',
    proofs: [
      {
        href: '/dev/staff/empty-states',
        title: 'Empty states',
        detail: 'Every dense roster with zero rows — the next action each one offers',
      },
    ],
  },
];

export default function DevStaffIndexPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Staff surface proofs"
        kicker="Dev"
        goal="Dense admin, employer, partner and counselor surfaces rendered without auth or a database."
      />

      {GROUPS.map((group) => (
        <section key={group.label} style={{ marginTop: 24 }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--wa-muted)',
              margin: '0 0 8px',
            }}
          >
            {group.label}
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {group.proofs.map((proof) => (
              <li key={proof.href}>
                <Link
                  href={proof.href}
                  className="wa-kit-focus"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '4px 10px',
                    minHeight: 44,
                    padding: '10px 12px',
                    borderRadius: 'var(--wa-radius-sm)',
                    border: '1px solid var(--wa-border)',
                    background: 'var(--wa-surface)',
                    color: 'var(--wa-text)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{proof.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{proof.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DesignSurface>
  );
}
