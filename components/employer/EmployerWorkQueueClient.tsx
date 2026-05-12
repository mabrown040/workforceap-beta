'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

export type WqApp = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  jobTitle: string;
  studentName: string;
  studentId: string;
};

export type WqJob = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

type Focus = 'all' | 'review' | 'stale' | 'interview';

export default function EmployerWorkQueueClient({
  needsReviewTodayApps,
  jobsAwaitingPublish,
  staleApps,
  interviewPending,
  initialFocus = 'all',
}: {
  needsReviewTodayApps: WqApp[];
  jobsAwaitingPublish: WqJob[];
  staleApps: WqApp[];
  interviewPending: WqApp[];
  initialFocus?: Focus;
}) {
  const [focus, setFocus] = useState<Focus>(initialFocus);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const patchApp = useCallback(async (appId: string, status: string) => {
    setBusy(appId);
    setMsg(null);
    try {
      const r = await fetch(`/api/employer/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof data.error === 'string' ? data.error : 'Update failed');
        return;
      }
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }, []);

  const sections = useMemo(
    () => [
      {
        id: 'review' as const,
        title: 'Needs review today',
        urgency: 'high',
        subtitle: 'New applications today and jobs awaiting WorkforceAP publish/review.',
        apps: needsReviewTodayApps,
        jobs: jobsAwaitingPublish,
      },
      {
        id: 'stale' as const,
        title: 'Stale >48h',
        urgency: 'high',
        subtitle: 'Applications still in pending or reviewing with no activity for two days.',
        apps: staleApps,
        jobs: [] as WqJob[],
      },
      {
        id: 'interview' as const,
        title: 'Interview pending',
        urgency: 'medium',
        subtitle: 'Candidates marked interview — keep momentum with next steps.',
        apps: interviewPending,
        jobs: [] as WqJob[],
      },
    ],
    [needsReviewTodayApps, jobsAwaitingPublish, staleApps, interviewPending]
  );

  const visible = sections.filter((s) => focus === 'all' || focus === s.id);

  return (
    <div className="employer-work-queue">
      {msg ? (
        <p className="employer-work-queue-msg" role="alert">
          {msg}
        </p>
      ) : null}

      <div className="employer-work-queue-filters" role="tablist" aria-label="Queue focus">
        {(
          [
            ['all', 'All queues'],
            ['review', 'Review today'],
            ['stale', 'Stale'],
            ['interview', 'Interview'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={focus === k}
            className={`employer-work-queue-filter${focus === k ? ' is-active' : ''}`}
            onClick={() => setFocus(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.map((sec) => (
        <section key={sec.id} className={`employer-work-queue-section urgency-${sec.urgency}`} id={`wq-${sec.id}`}>
          <header className="employer-work-queue-section-head">
            <h2>{sec.title}</h2>
            <p>{sec.subtitle}</p>
          </header>

          {sec.jobs.length > 0 ? (
            <ul className="employer-work-queue-job-list">
              {sec.jobs.map((j) => (
                <li key={j.id} className="employer-work-queue-card">
                  <div>
                    <span className="employer-work-queue-pill">Job</span>
                    <strong>{j.title}</strong>
                    <div className="employer-work-queue-meta">
                      Status: {j.status} · Updated {new Date(j.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="employer-work-queue-actions">
                    <Link href={`/employer/jobs/${j.id}`} className="btn btn-primary btn-sm">
                      Open job
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {sec.apps.length > 0 ? (
            <ul className="employer-work-queue-app-list">
              {sec.apps.map((a) => (
                <li key={a.id} className="employer-work-queue-card">
                  <div>
                    <span className="employer-work-queue-pill">Applicant</span>
                    <strong>{a.studentName}</strong>
                    <div className="employer-work-queue-meta">
                      {a.jobTitle} · Applied {new Date(a.appliedAt).toLocaleString()} · {a.status}
                    </div>
                  </div>
                  <div className="employer-work-queue-actions">
                    <Link href="/employer/applications" className="btn btn-outline btn-sm">
                      Table view
                    </Link>
                    {sec.id === 'review' && a.status === 'pending' ? (
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={busy === a.id}
                        onClick={() => void patchApp(a.id, 'reviewing')}
                      >
                        {busy === a.id ? '…' : 'Start review'}
                      </button>
                    ) : null}
                    {sec.id === 'stale' && (a.status === 'pending' || a.status === 'reviewing') ? (
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={busy === a.id}
                        onClick={() => void patchApp(a.id, 'interview')}
                      >
                        {busy === a.id ? '…' : 'Move to interview'}
                      </button>
                    ) : null}
                    {sec.id === 'interview' ? (
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={busy === a.id}
                        onClick={() => void patchApp(a.id, 'offered')}
                      >
                        {busy === a.id ? '…' : 'Mark offered'}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {sec.apps.length === 0 && sec.jobs.length === 0 ? (
            <p className="employer-work-queue-empty">Nothing in this queue right now.</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
