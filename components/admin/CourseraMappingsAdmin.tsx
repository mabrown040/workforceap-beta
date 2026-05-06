'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CourseraPipelineFlow from '@/components/admin/CourseraPipelineFlow';
import { DataLandingEmptyArt } from '@/components/graphics/DataLandingEmptyArt';

type MemberOption = {
  id: string;
  fullName: string;
  email: string;
  programTitle: string | null;
  workspaceEmail?: string | null;
  workspaceEmailProvisioned?: boolean;
};

type MappingRow = {
  id: string;
  userId: string;
  courseraEmail: string | null;
  actorIdentifier: string | null;
  actorHomePage: string | null;
  source: string;
  notes: string | null;
  lastSeenAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userEmail: string;
  userFullName: string;
};

type XapiStatementAttentionRow = {
  id: string;
  createdAt: Date | string;
  actorEmail: string | null;
  verb: string;
  courseId: string | null;
  courseName: string | null;
  statementId: string | null;
  processed: boolean;
  reason: 'unprocessed' | 'identity_unmatched';
};

type CourseraSyncStatus = {
  lastXapiReceivedAt: Date | string | null;
  distinctMembersWithCourseProgress: number;
  attentionStatementCount: number;
};

type CourseProgressAuditRow = {
  id: string;
  programSlug: string;
  courseSlug: string;
  courseId: string | null;
  status: string;
  percentComplete: number;
  lastUpdatedAt: Date | string;
};

type ProgramProgressAuditRollup = {
  programSlug: string;
  programTitle: string | null;
  catalogCourseCount: number;
  coursesCompleted: number;
  averagePercent: number;
  fromMemberProgramProgress: boolean;
};

type ProgressAuditPayload =
  | { found: false }
  | {
      found: true;
      userId: string;
      email: string;
      fullName: string;
      enrolledProgram: string | null;
      courseRows: CourseProgressAuditRow[];
      rollups: ProgramProgressAuditRollup[];
    };

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)',
  borderRadius: '1rem',
  padding: '1rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--color-on-surface-variant)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  borderRadius: '0.65rem',
  border: '1px solid var(--outline-variant)',
  background: 'var(--surface-container)',
  color: 'var(--color-on-surface)',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatMemberOptionLabel(member: MemberOption) {
  return `${member.fullName} · ${member.email}`;
}

function formatVerb(verb: string) {
  const v = verb.trim();
  if (!v) return '—';
  if (v.startsWith('http://') || v.startsWith('https://')) {
    try {
      const tail = new URL(v).pathname.split('/').filter(Boolean).pop();
      return tail ? `${tail} (${v})` : v;
    } catch {
      return v;
    }
  }
  return v;
}

function reasonLabel(reason: XapiStatementAttentionRow['reason']) {
  if (reason === 'unprocessed') return 'Unprocessed';
  return 'Identity / completion';
}

export default function CourseraMappingsAdmin({
  members,
  mappings,
  xapiAttention,
  syncStatus,
  progressAudit,
  progressAuditError,
  auditEmailInitial,
}: {
  members: MemberOption[];
  mappings: MappingRow[];
  xapiAttention: XapiStatementAttentionRow[];
  syncStatus: CourseraSyncStatus;
  progressAudit: ProgressAuditPayload | null;
  progressAuditError: string | null;
  auditEmailInitial: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState('');
  const [courseraEmail, setCourseraEmail] = useState('');
  const [actorIdentifier, setActorIdentifier] = useState('');
  const [actorHomePage, setActorHomePage] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [reprocessResult, setReprocessResult] = useState<{ processed: number; matched: number } | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === userId) ?? null,
    [members, userId]
  );

  useEffect(() => {
    const m = members.find((x) => x.id === userId);
    const email = m?.workspaceEmail?.trim() ?? '';
    setCourseraEmail(email);
  }, [userId, members]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/coursera/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            courseraEmail: courseraEmail || undefined,
            actorIdentifier: actorIdentifier || undefined,
            actorHomePage: actorHomePage || undefined,
            notes: notes || undefined,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage({ kind: 'error', text: payload.error || 'Unable to save mapping.' });
          setReprocessResult(null);
          return;
        }

        setMessage({ kind: 'success', text: 'Coursera mapping saved.' });
        if (payload.reprocessed) {
          setReprocessResult({
            processed: payload.reprocessed.processed ?? 0,
            matched: payload.reprocessed.matched ?? 0,
          });
        }
        router.refresh();
      } catch {
        setMessage({ kind: 'error', text: 'Network error while saving mapping.' });
      }
    });
  }

  function applyXapiAttentionRow(row: XapiStatementAttentionRow) {
    setCourseraEmail(row.actorEmail || '');
    setActorIdentifier('');
    setActorHomePage('');
    setNotes(
      (current) =>
        current ||
        `Seeded from xAPI statement ${row.statementId || row.id} (${reasonLabel(row.reason)})`
    );
    setMessage(null);
    requestAnimationFrame(() => {
      const el = document.getElementById('coursera-mapping-form-top');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('coursera-mapping-userId')?.focus();
    });
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <section style={cardStyle}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Sync status</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)' }}>
          Operational view of xAPI ingest and course progress coverage (uses existing DB only).
        </p>
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          <div className="content-chip" style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Last xAPI received</span>
            <strong style={{ fontSize: '1rem' }}>{fmtDate(syncStatus.lastXapiReceivedAt)}</strong>
          </div>
          <div className="content-chip" style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              Members with course progress
            </span>
            <strong style={{ fontSize: '1rem' }}>{syncStatus.distinctMembersWithCourseProgress}</strong>
          </div>
          <div className="content-chip" style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              Statements needing attention
            </span>
            <strong style={{ fontSize: '1rem' }}>{syncStatus.attentionStatementCount}</strong>
          </div>
        </div>
      </section>

      <section style={cardStyle} id="coursera-mapping-form-top">
        <div className="coursera-header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Manual identity mapping</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', maxWidth: '48rem' }}>
              Bind a Coursera learner email or actor ID to a WAP member when direct email matching is not enough.
            </p>
            <div style={{ marginTop: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
                Data path (this page)
              </p>
              <CourseraPipelineFlow variant="compact" />
            </div>
          </div>
          <div className="coursera-chip-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="content-chip">{mappings.length} mapping{mappings.length === 1 ? '' : 's'}</div>
            <div className="content-chip">
              {syncStatus.attentionStatementCount} statement{syncStatus.attentionStatementCount === 1 ? '' : 's'}{' '}
              needing attention
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }} aria-describedby="coursera-manual-mapping-hint">
          <p id="coursera-manual-mapping-hint" className="sr-only">
            Choose a member, enter Coursera identity fields, then save. Use unmatched events below to pre-fill the form.
          </p>
          <div className="coursera-form-grid" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <label htmlFor="coursera-mapping-userId" style={labelStyle}>
                Member
              </label>
              <select
                id="coursera-mapping-userId"
                name="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={inputStyle}
                className="coursera-input"
                required
              >
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {formatMemberOptionLabel(member)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 0 }}>
              <label htmlFor="coursera-mapping-courseraEmail" style={labelStyle}>
                Coursera email
              </label>
              <input
                id="coursera-mapping-courseraEmail"
                name="courseraEmail"
                type="email"
                autoComplete="email"
                value={courseraEmail}
                onChange={(e) => setCourseraEmail(e.target.value)}
                style={inputStyle}
                className="coursera-input"
                placeholder="learner@example.com"
              />
              {selectedMember?.workspaceEmail ? (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                  Suggested from training seat: <strong>{selectedMember.workspaceEmail}</strong>
                  {selectedMember.workspaceEmailProvisioned ? ' (provisioned)' : ''}
                </p>
              ) : null}
            </div>

            <div style={{ minWidth: 0 }}>
              <label htmlFor="coursera-mapping-actorIdentifier" style={labelStyle}>
                Actor identifier
              </label>
              <input
                id="coursera-mapping-actorIdentifier"
                name="actorIdentifier"
                value={actorIdentifier}
                onChange={(e) => setActorIdentifier(e.target.value)}
                style={inputStyle}
                className="coursera-input"
                placeholder="optional stable Coursera actor id"
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <label htmlFor="coursera-mapping-actorHomePage" style={labelStyle}>
                Actor home page
              </label>
              <input
                id="coursera-mapping-actorHomePage"
                name="actorHomePage"
                type="url"
                value={actorHomePage}
                onChange={(e) => setActorHomePage(e.target.value)}
                style={inputStyle}
                className="coursera-input"
                placeholder="optional actor home page"
              />
            </div>
          </div>

          <div>
            <label htmlFor="coursera-mapping-notes" style={labelStyle}>
              Notes
            </label>
            <textarea
              id="coursera-mapping-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: '5rem', resize: 'vertical' }}
              className="coursera-input"
              placeholder="Why this mapping exists, test notes, etc."
            />
          </div>

          {selectedMember && (
            <div className="coursera-selected-member" style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' }}>
              Mapping to <strong style={{ color: 'var(--color-on-surface)' }}>{selectedMember.fullName}</strong> ({selectedMember.email})
              {selectedMember.programTitle ? ` in ${selectedMember.programTitle}` : ''}.
            </div>
          )}

          {message && (
            <div style={{
              padding: '0.8rem 1rem',
              borderRadius: '0.75rem',
              background: message.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${message.kind === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: message.kind === 'success' ? 'var(--color-green, #15803d)' : 'var(--color-error, #b91c1c)',
            }}>
              {message.text}
              {reprocessResult && message.kind === 'success' && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                  Re-processed {reprocessResult.processed} unmatched xAPI event{reprocessResult.processed === 1 ? '' : 's'} — {reprocessResult.matched} matched to this member.
                </div>
              )}
            </div>
          )}

          <div className="coursera-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary coursera-action-button" disabled={isPending || !userId || (!courseraEmail && !actorIdentifier)}>
              {isPending ? 'Saving…' : 'Save mapping'}
            </button>
            <button
              type="button"
              className="btn btn-outline coursera-action-button"
              onClick={() => {
                setUserId('');
                setCourseraEmail('');
                setActorIdentifier('');
                setActorHomePage('');
                setNotes('');
                setMessage(null);
              }}
            >
              Clear
            </button>
          </div>
        </form>

        <style jsx>{`
          .coursera-form-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .coursera-input {
            box-sizing: border-box;
            min-width: 0;
          }

          .coursera-selected-member {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .coursera-actions {
            align-items: stretch;
          }

          .coursera-action-button {
            min-height: 44px;
          }

          @media (max-width: 640px) {
            .coursera-header-row {
              gap: 0.75rem;
            }

            .coursera-chip-row {
              width: 100%;
              gap: 0.5rem;
            }

            .coursera-actions {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
            }

            .coursera-action-button {
              width: 100%;
              justify-content: center;
            }
          }

          @media (min-width: 860px) {
            .coursera-form-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        `}</style>
      </section>

      <section style={cardStyle} key={`audit-wrap-${auditEmailInitial}`}>
        <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem' }}>Member progress audit</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)' }}>
          Search by email to list <code style={{ fontSize: '0.85em' }}>CourseProgress</code> rows and program rollups
          (same catalog counts and <code style={{ fontSize: '0.85em' }}>MemberProgramProgress</code> averages as training dashboard).
        </p>
        <form method="get" action="/admin/coursera" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label htmlFor="coursera-audit-email" style={labelStyle}>
              Member email
            </label>
            <input
              id="coursera-audit-email"
              name="auditEmail"
              type="email"
              defaultValue={auditEmailInitial}
              style={inputStyle}
              placeholder="member@example.org"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
            Search
          </button>
        </form>

        {progressAuditError && auditEmailInitial.trim() ? (
          <p style={{ color: '#fca5a5', margin: 0 }}>Progress audit failed: {progressAuditError}</p>
        ) : null}

        {!progressAudit || !auditEmailInitial.trim() ? (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>Enter an email and search to load progress.</p>
        ) : !progressAudit.found ? (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>No user found for that email.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ color: 'var(--color-on-surface-variant)' }}>
              <strong style={{ color: 'var(--color-on-surface)' }}>{progressAudit.fullName}</strong> · {progressAudit.email}
              <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                User id: {progressAudit.userId}
                {progressAudit.enrolledProgram ? ` · Enrolled program slug: ${progressAudit.enrolledProgram}` : ''}
              </div>
            </div>

            {progressAudit.rollups.length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>No course progress rows for this member.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Program</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Complete</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Avg %</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Rollup source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressAudit.rollups.map((r) => (
                      <tr key={r.programSlug} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700 }}>{r.programTitle || r.programSlug}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{r.programSlug}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                          {r.coursesCompleted} of {r.catalogCourseCount || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{r.averagePercent}%</td>
                        <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                          {r.fromMemberProgramProgress ? 'MemberProgramProgress' : 'Derived from rows'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {progressAudit.courseRows.length > 0 ? (
              <div>
                <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>Course progress rows</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Program</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Course</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Coursera id</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>%</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressAudit.courseRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', fontSize: '0.875rem' }}>{row.programSlug}</td>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{row.courseSlug}</td>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                            {row.courseId || '—'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{row.status}</td>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{row.percentComplete}</td>
                          <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', fontSize: '0.875rem' }}>{fmtDate(row.lastUpdatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Saved mappings</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            These mappings are checked before direct email match during xAPI completion processing.
          </p>
        </div>

        <div className="coursera-unmatched-table-wrap">
          <table className="coursera-unmatched-table coursera-admin-data-table" style={{ minWidth: '760px' }}>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Coursera email</th>
                <th scope="col">Actor ID</th>
                <th scope="col">Source</th>
                <th scope="col">Last seen</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="coursera-empty-row">
                    <div className="coursera-empty-row__inner">
                      <DataLandingEmptyArt />
                      <span>No manual mappings yet. When xAPI cannot match a learner automatically, save a row here so statements route to the right member.</span>
                    </div>
                  </td>
                </tr>
              ) : mappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700 }}>{mapping.userFullName}</div>
                    <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>{mapping.userEmail}</div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>{mapping.courseraEmail || '—'}</td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div>{mapping.actorIdentifier || '—'}</div>
                    {mapping.actorHomePage ? (
                      <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{mapping.actorHomePage}</div>
                    ) : null}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>{mapping.source}</td>
                  <td style={{ verticalAlign: 'top' }}>{fmtDate(mapping.lastSeenAt)}</td>
                  <td style={{ verticalAlign: 'top', color: 'var(--color-on-surface-variant)' }}>{mapping.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle}>
        <div
          style={{
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>xAPI statements needing attention</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', maxWidth: '48rem' }}>
              From <code style={{ fontSize: '0.85em' }}>XapiStatement</code>: still unprocessed, or linked to an identity/completion
              issue. <strong>{xapiAttention.length}</strong> row{xapiAttention.length === 1 ? '' : 's'} below — use{' '}
              <strong>Create mapping</strong> to load actor email into the form, pick the member, then save.
            </p>
          </div>
          <a href="#coursera-mapping-form-top" className="btn btn-primary coursera-unmatched-cta" style={{ textDecoration: 'none' }}>
            Jump to mapping form
          </a>
        </div>

        {xapiAttention.length === 0 ? (
          <div className="coursera-empty-row__inner" style={{ padding: '1.5rem 0' }}>
            <DataLandingEmptyArt />
            <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', textAlign: 'center', maxWidth: '28rem' }}>
              No statement rows need attention right now — ingest is caught up or the attention filters returned nothing.
            </p>
          </div>
        ) : (
          <>
            <div className="coursera-unmatched-cards md:wa-hidden" style={{ marginBottom: '0.5rem' }}>
              {xapiAttention.map((row) => (
                <article key={`a-${row.id}`} className="coursera-unmatched-card">
                  <div className="coursera-unmatched-card__label">When · actor</div>
                  <div className="coursera-unmatched-card__value">
                    {fmtDate(row.createdAt)}
                    <div style={{ marginTop: '0.35rem' }}>{row.actorEmail || '—'}</div>
                  </div>
                  <div className="coursera-unmatched-card__label">Verb</div>
                  <div className="coursera-unmatched-card__value" style={{ fontSize: '0.8125rem', wordBreak: 'break-word' }}>
                    {formatVerb(row.verb)}
                  </div>
                  <div className="coursera-unmatched-card__label">Course · reason</div>
                  <div className="coursera-unmatched-card__value">
                    {row.courseName || '—'}
                    {row.statementId ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
                        stmt: {row.statementId}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                      {reasonLabel(row.reason)} · processed: {row.processed ? 'yes' : 'no'}
                    </div>
                  </div>
                  <div className="coursera-unmatched-card__actions">
                    <button
                      type="button"
                      className="btn btn-primary coursera-unmatched-cta"
                      style={{ width: '100%' }}
                      onClick={() => applyXapiAttentionRow(row)}
                    >
                      Create mapping
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="coursera-unmatched-table-wrap wa-hidden md:wa-block">
              <table className="coursera-unmatched-table" style={{ minWidth: '920px' }}>
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Actor email</th>
                    <th scope="col">Verb</th>
                    <th scope="col">Course</th>
                    <th scope="col">Reason</th>
                    <th scope="col" className="coursera-unmatched-actions">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {xapiAttention.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(row.createdAt)}</td>
                      <td>{row.actorEmail || '—'}</td>
                      <td style={{ fontSize: '0.8125rem', maxWidth: '280px', wordBreak: 'break-word' }}>{formatVerb(row.verb)}</td>
                      <td>
                        <div>{row.courseName || '—'}</div>
                        {row.courseId ? (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>id: {row.courseId}</div>
                        ) : null}
                        {row.statementId ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>stmt: {row.statementId}</div>
                        ) : null}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {reasonLabel(row.reason)}
                        <div style={{ color: 'var(--color-on-surface-variant)' }}>processed: {row.processed ? 'yes' : 'no'}</div>
                      </td>
                      <td className="coursera-unmatched-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm coursera-unmatched-cta"
                          onClick={() => applyXapiAttentionRow(row)}
                        >
                          Create mapping
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
