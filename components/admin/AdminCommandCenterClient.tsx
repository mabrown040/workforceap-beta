'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type {
  AdminApplicationPendingRow,
  AdminAtRiskRow,
  AdminCommandCenter,
  AdminInterviewingRow,
  AdminNeedsReplyRow,
} from '@/lib/admin/commandCenter';

type ReviewStatus = 'APPROVED' | 'NEEDS_INFO' | 'DENIED';

const REVIEW_ACTIONS: Array<{ status: ReviewStatus; label: string; tone: 'primary' | 'outline' | 'danger' }> = [
  { status: 'APPROVED', label: 'Approve', tone: 'primary' },
  { status: 'NEEDS_INFO', label: 'Ask for info', tone: 'outline' },
  { status: 'DENIED', label: 'Not a fit', tone: 'danger' },
];

export default function AdminCommandCenterClient({ data }: { data: AdminCommandCenter }) {
  const total =
    data.totals.needsReplyCount +
    data.totals.atRiskCount +
    data.totals.interviewingCount +
    data.totals.applicationsPendingCount;
  const oldest = data.totals.oldestPendingApplicationDays;

  return (
    <div style={{ padding: '0 1.5rem 2rem' }}>
      <section
        className="portal-card portal-card--flat"
        style={{
          padding: '1.25rem',
          marginBottom: '1.25rem',
          border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--outline-variant))',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, white), white 72%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: 'var(--color-accent)' }}>
              Today&apos;s walk-in plan
            </p>
            <h2 style={{ margin: '0.25rem 0 0', fontSize: 'clamp(1.35rem, 4vw, 2rem)', lineHeight: 1.1 }}>
              {total === 0 ? 'No one is waiting on you.' : `${total} ${total === 1 ? 'person needs' : 'people need'} a next step`}
            </h2>
            <p style={{ margin: '0.45rem 0 0', color: 'var(--color-on-surface-variant)', maxWidth: '48rem' }}>
              Single-org queue for replies, risk check-ins, interviews, and application review. Start at the left and work down.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(7.5rem, 1fr))', gap: '0.6rem', minWidth: 'min(100%, 20rem)' }}>
            <Metric label="Needs reply" value={data.totals.needsReplyCount} />
            <Metric label="At risk" value={data.totals.atRiskCount} />
            <Metric label="Interviewing" value={data.totals.interviewingCount} />
            <Metric label="Applications" value={data.totals.applicationsPendingCount} accent={oldest != null && oldest >= 7} />
          </div>
        </div>
        {oldest != null ? (
          <p style={{ margin: '1rem 0 0', fontSize: '0.9rem', color: oldest >= 7 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', fontWeight: oldest >= 7 ? 700 : 500 }}>
            Oldest pending application: {oldest === 0 ? 'submitted today' : `${oldest} ${oldest === 1 ? 'day' : 'days'} old`}.
          </p>
        ) : null}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', gap: '1rem' }}>
        <Bucket title="Needs Reply" count={data.totals.needsReplyCount} icon="mark_email_unread" empty="No member messages waiting for a reply.">
          {data.needsReply.map((row) => <NeedsReplyCard key={row.threadId} row={row} />)}
        </Bucket>

        <Bucket title="At Risk" count={data.totals.atRiskCount} icon="warning" empty="No enrolled students have gone quiet for 14+ days.">
          {data.atRisk.map((row) => <AtRiskCard key={row.memberId} row={row} />)}
        </Bucket>

        <Bucket title="Interviewing" count={data.totals.interviewingCount} icon="record_voice_over" empty="No active interviews or offers to prep right now.">
          {data.interviewing.map((row) => <InterviewingCard key={`${row.memberId}-${row.company}-${row.role}`} row={row} />)}
        </Bucket>

        <Bucket title="Applications Pending" count={data.totals.applicationsPendingCount} icon="assignment_ind" empty="No applications are waiting for review.">
          {data.applicationsPending.map((row) => <ApplicationCard key={row.applicationId} row={row} />)}
        </Bucket>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ borderRadius: '0.75rem', background: 'white', border: '1px solid var(--outline-variant)', padding: '0.75rem' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '1.45rem', fontWeight: 800, color: accent ? 'var(--color-accent)' : 'var(--color-on-surface)' }}>
        {value}
      </p>
    </div>
  );
}

function Bucket({ title, count, icon, empty, children }: { title: string; count: number; icon: string; empty: string; children: React.ReactNode }) {
  return (
    <section className="portal-card portal-card--flat" style={{ padding: '1rem', minHeight: '14rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.9rem' }}>
        <span className="material-symbols-outlined" aria-hidden style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <h2 style={{ flex: 1, margin: 0, fontSize: '1rem', fontWeight: 800 }}>{title}</h2>
        <span aria-label={`${count} items`} style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </header>
      {count === 0 ? (
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
      )}
    </section>
  );
}

function NeedsReplyCard({ row }: { row: AdminNeedsReplyRow }) {
  return (
    <ActionCard
      name={row.memberName}
      meta={`${formatHours(row.hoursWaiting)} waiting`}
      detail={row.lastMessageBody}
      href={`/admin/members/${row.memberId}`}
      action="Open student"
      urgent={row.hoursWaiting >= 48}
    />
  );
}

function AtRiskCard({ row }: { row: AdminAtRiskRow }) {
  return (
    <ActionCard
      name={row.memberName}
      meta={`${row.daysInactive} days without activity`}
      detail={row.enrolledProgram ? `Program: ${row.enrolledProgram}` : 'Enrolled, no program label'}
      href={`/admin/members/${row.memberId}`}
      action="Check in"
      urgent={row.daysInactive >= 21}
    />
  );
}

function InterviewingCard({ row }: { row: AdminInterviewingRow }) {
  return (
    <ActionCard
      name={row.memberName}
      meta={`${row.statusLabel} · ${row.company}`}
      detail={`${row.role}${row.nextInterviewDate ? ` · ${formatDate(row.nextInterviewDate)}` : ''}`}
      href={`/admin/members/${row.memberId}`}
      action="Prep them"
    />
  );
}

function ApplicationCard({ row }: { row: AdminApplicationPendingRow }) {
  return (
    <article style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', padding: '0.85rem', background: 'var(--surface-container-low)' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/admin/members/${row.memberId}`} style={{ color: 'var(--color-on-surface)', textDecoration: 'none', fontWeight: 800 }}>
            {row.memberName}
          </Link>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.82rem' }}>
            {row.programLabel} · {row.statusLabel}
          </p>
          <p style={{ margin: '0.2rem 0 0', color: row.submittedDaysAgo != null && row.submittedDaysAgo >= 7 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', fontSize: '0.82rem', fontWeight: row.submittedDaysAgo != null && row.submittedDaysAgo >= 7 ? 700 : 500 }}>
            {row.submittedDaysAgo == null ? 'Submitted recently' : row.submittedDaysAgo === 0 ? 'Submitted today' : `Submitted ${row.submittedDaysAgo}d ago`}
          </p>
        </div>
        <a className="btn btn-outline btn-sm" href={row.emailPacket.mailto} style={{ whiteSpace: 'nowrap' }}>
          Email packet
        </a>
      </div>
      {row.recommendedCareerTitle ? (
        <p style={{ margin: '0.55rem 0 0', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
          Career match: {row.recommendedCareerTitle}
        </p>
      ) : null}
      <ReviewButtons applicationId={row.applicationId} applicantName={row.memberName} />
    </article>
  );
}

function ReviewButtons({ applicationId, applicantName }: { applicationId: string; applicantName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const note = useMemo(() => `Reviewed from Dad Command Center for ${applicantName}.`, [applicantName]);

  function review(status: ReviewStatus) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/members/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: note }),
      });
      if (!response.ok) {
        setError('Review did not save. Open the student and try again.');
        return;
      }
      setDone(status === 'APPROVED' ? 'Approved' : status === 'NEEDS_INFO' ? 'Marked needs info' : 'Marked not a fit');
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
        {REVIEW_ACTIONS.map((action) => (
          <button
            key={action.status}
            type="button"
            className={`btn btn-sm ${action.tone === 'primary' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => review(action.status)}
            disabled={isPending}
            aria-busy={isPending}
            style={action.tone === 'danger' ? { borderColor: '#fecaca', color: '#b91c1c' } : undefined}
          >
            <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {isPending ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span>
                  Saving…
                </>
              ) : (
                action.label
              )}
            </span>
          </button>
        ))}
      </div>
      {done ? <p role="status" style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#166534' }}>{done}</p> : null}
      {error ? <p role="alert" style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>{error}</p> : null}
    </div>
  );
}

function ActionCard({ name, meta, detail, href, action, urgent }: { name: string; meta: string; detail?: string | null; href: string; action: string; urgent?: boolean }) {
  return (
    <Link href={href} style={{ display: 'block', padding: '0.85rem', borderRadius: '0.75rem', textDecoration: 'none', color: 'inherit', background: urgent ? 'color-mix(in srgb, var(--color-accent) 7%, white)' : 'var(--surface-container-low)', border: urgent ? '1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)' : '1px solid var(--outline-variant)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: urgent ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', fontWeight: urgent ? 700 : 500 }}>{meta}</p>
          {detail ? <p style={{ margin: '0.25rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</p> : null}
        </div>
        <span style={{ flexShrink: 0, color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: 800 }}>{action} →</span>
      </div>
    </Link>
  );
}

function formatHours(hours: number): string {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}
