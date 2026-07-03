'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';

type MatchRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  matchReasons: string[];
  status: string;
  student: { id: string; fullName: string; email: string; enrolledProgram: string | null };
};

const COLUMNS: { id: string; label: string; statuses: string[]; color: string; icon: string }[] = [
  { id: 'new', label: 'New Matches', statuses: ['suggested', 'employer_notified', 'student_notified'], color: 'var(--color-blue, #2b7bb9)', icon: 'auto_awesome' },
  { id: 'contacted', label: 'Contacted', statuses: ['contacted'], color: 'var(--color-gold)', icon: 'mail' },
  { id: 'interviewing', label: 'Interviewing', statuses: ['interviewing'], color: 'var(--color-accent)', icon: 'videocam' },
  { id: 'hired', label: 'Hired', statuses: ['hired'], color: 'var(--color-green, #4a9b4f)', icon: 'check_circle' },
  { id: 'declined', label: 'Declined', statuses: ['rejected'], color: 'var(--color-on-surface-variant)', icon: 'block' },
];

const STATUS_FOR_COLUMN: Record<string, string> = {
  new: 'contacted',
  contacted: 'interviewing',
  interviewing: 'hired',
  hired: 'hired',
  declined: 'rejected',
};

function scoreColor(score: number) {
  if (score >= 80) return 'var(--color-green, #4a9b4f)';
  if (score >= 60) return 'var(--color-gold)';
  return 'var(--color-on-surface-variant)';
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function matchColumnId(status: string): string {
  for (const col of COLUMNS) {
    if (col.statuses.includes(status)) return col.id;
  }
  return 'new';
}

export default function EmployerKanban({ initialMatches }: { initialMatches: MatchRow[] }) {
  const [matches, setMatches] = useState(initialMatches);
  const [busy, setBusy] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragMatch = useRef<MatchRow | null>(null);

  const patchStatus = useCallback(async (match: MatchRow, targetColumnId: string) => {
    const newStatus = targetColumnId === 'declined' ? 'rejected' : STATUS_FOR_COLUMN[targetColumnId] ?? 'contacted';
    if (matchColumnId(match.status) === targetColumnId) return;

    // Optimistic update: move the card immediately in the UI
    setRevertError(null);
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: newStatus } : m));
    setBusy(match.id);
    try {
      const r = await fetch(`/api/employer/jobs/${match.jobId}/matches/${match.student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: data.status ?? newStatus } : m));
      } else {
        // Revert on HTTP error
        setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: match.status } : m));
        setRevertError(match.id);
      }
    } catch {
      // Revert on network error
      setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: match.status } : m));
      setRevertError(match.id);
    } finally {
      setBusy(null);
    }
  }, []);

  const handleDragStart = (match: MatchRow) => {
    setDragId(match.id);
    dragMatch.current = match;
  };

  const handleDrop = async (columnId: string) => {
    setDragOver(null);
    setDragId(null);
    if (dragMatch.current) {
      await patchStatus(dragMatch.current, columnId);
      dragMatch.current = null;
    }
  };

  if (matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '1rem' }} aria-hidden="true">account_tree</span>
        <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>No pipeline yet</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>Post a job and AI will match qualified candidates from the WorkforceAP member pool.</p>
        <Link href="/employer/jobs/new" className="btn btn-primary">Post a Job</Link>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
        Drag cards between columns to move candidates through your pipeline.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`, gap: '0.875rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {COLUMNS.map(col => {
          const colMatches = matches.filter(m => matchColumnId(m.status) === col.id);
          const isOver = dragOver === col.id;
          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => void handleDrop(col.id)}
              style={{
                borderRadius: '0.875rem',
                background: isOver ? `color-mix(in srgb, ${col.color} 8%, var(--surface-container-low))` : 'var(--surface-container-low)',
                border: isOver ? `2px solid ${col.color}` : '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.15s, border 0.15s',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: col.color, fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{col.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-on-surface)' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 800, color: col.color, background: `color-mix(in srgb, ${col.color} 12%, transparent)`, padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
                  {colMatches.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.625rem', flex: 1 }}>
                {colMatches.map(m => {
                  const score = matchScoreAsPercent(m.matchScore);
                  const isBusy = busy === m.id;
                  const isDragging = dragId === m.id;
                  return (
                    <div
                      key={m.id}
                      draggable={!isBusy}
                      onDragStart={() => handleDragStart(m)}
                      onDragEnd={() => { setDragId(null); setDragOver(null); dragMatch.current = null; }}
                      style={{
                        borderRadius: '0.75rem',
                        background: isDragging ? 'var(--surface-container-highest)' : 'var(--surface-container)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '0.75rem',
                        cursor: isBusy ? 'default' : 'grab',
                        opacity: isDragging ? 0.5 : isBusy ? 0.7 : 1,
                        transition: 'opacity 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>
                          {getInitials(m.student.fullName ?? '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.student.fullName}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.jobTitle}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: scoreColor(score), flexShrink: 0 }}>{score}%</span>
                      </div>
                      {m.matchReasons.length > 0 && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
                          {m.matchReasons[0]}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
                        <Link href={`/employer/candidates/${m.student.id}?jobId=${m.jobId}`} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}>
                          View →
                        </Link>
                        {isBusy && <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>Moving…</span>}
                      </div>
                      {revertError === m.id && (
                        <p role="alert" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--wa-danger, #dc2626)', margin: '0.375rem 0 0' }}>
                          Couldn&apos;t update status — try again
                        </p>
                      )}
                    </div>
                  );
                })}
                {colMatches.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', opacity: 0.4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-on-surface-variant)' }} aria-hidden="true">drag_indicator</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
