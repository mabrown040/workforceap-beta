'use client';

import { useState, useCallback } from 'react';
import EmployerApplicationChatClient from '@/components/portal/EmployerApplicationChatClient';
import { StatusTag, type KitTone } from '@/components/portal/kit';
import type { AppMsg, EmployerApplicationRow } from './EmployerApplicationsClient';

const STATUS_TONE: Record<string, KitTone> = {
  pending: 'muted',
  reviewing: 'warn',
  interview: 'info',
  offered: 'info',
  hired: 'ok',
  rejected: 'alert',
};

const STATUS_CHIP_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'pending' },
  { label: 'Under Review', value: 'reviewing' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offered' },
  { label: 'Hired', value: 'hired' },
  { label: 'Declined', value: 'rejected' },
];

const STATUS_ACTIONS: Record<string, string[]> = {
  pending: ['reviewing'],
  reviewing: ['interview', 'rejected'],
  interview: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
  hired: [],
  rejected: [],
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'New',
    reviewing: 'Under Review',
    interview: 'Interview',
    offered: 'Offer',
    hired: 'Hired',
    rejected: 'Declined',
  };
  return map[status] ?? status;
}

function initials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function MobileApplicationsClient({
  initialRows,
}: {
  initialRows: EmployerApplicationRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, AppMsg[]>>({});
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchStatus = useCallback(async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      const r = await fetch(`/api/employer/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Update failed');
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, status: data.status ?? status } : row
        )
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  const toggleChat = useCallback(async (applicationId: string) => {
    if (openChatId === applicationId) {
      setOpenChatId(null);
      return;
    }

    setError(null);
    setExpandedId(applicationId);

    if (!chatMessages[applicationId]) {
      setChatLoadingId(applicationId);
      try {
        const r = await fetch(`/api/employer/applications/${applicationId}/messages`, {
          credentials: 'include',
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Unable to load messages');
          return;
        }
        setChatMessages((prev) => ({ ...prev, [applicationId]: Array.isArray(data.messages) ? data.messages : [] }));
      } catch {
        setError('Unable to load messages');
        return;
      } finally {
        setChatLoadingId(null);
      }
    }

    setOpenChatId(applicationId);
  }, [chatMessages, openChatId]);

  const visible =
    filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0 1rem 0.75rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', whiteSpace: 'nowrap' }}>
        {STATUS_CHIP_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button type="button"
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="text-xs font-semibold transition-colors"
              style={Object.assign(
                { flexShrink: 0, padding: '0.375rem 1rem', borderRadius: '9999px', border: '1px solid var(--wa-border)' },
                active ? { background: 'var(--wa-accent)', color: '#ffffff', borderColor: 'var(--wa-accent)' } : { background: 'var(--wa-surface-2)', color: 'var(--wa-muted)' }
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mx-4 mb-2 text-xs text-red-600 font-semibold">{error}</p>
      )}

      {/* Applicant cards */}
      <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {visible.length === 0 ? (
          <div style={{ background: 'var(--wa-surface)', border: '1px solid var(--wa-border)', borderRadius: 'var(--wa-radius-sm)', padding: '1.5rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined text-3xl block mb-2" style={{ color: 'var(--wa-muted)' }} aria-hidden="true">inbox</span>
            <p className="text-sm" style={{ color: 'var(--wa-muted)' }}>No applications found.</p>
          </div>
        ) : (
          visible.map((app) => {
            const isExpanded = expandedId === app.id;
            const isChatOpen = openChatId === app.id;
            const isChatLoading = chatLoadingId === app.id;
            const nextStatuses = STATUS_ACTIONS[app.status] ?? [];
            const studentName = app.student.fullName?.trim() || app.student.email;

            return (
              <div
                key={app.id}
                style={{ borderRadius: 'var(--wa-radius-sm)', overflow: 'hidden', background: 'var(--wa-surface)', border: '1px solid var(--wa-border)', boxShadow: 'var(--wa-shadow)' }}
              >
                {/* Card header — tap to expand */}
                <button type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '1rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-expanded={isExpanded} aria-label={isExpanded ? `Collapse details for ${studentName}` : `Expand details for ${studentName}`} onClick={() => {
                    const nextExpanded = isExpanded ? null : app.id;
                    setExpandedId(nextExpanded);
                    if (nextExpanded !== app.id && openChatId === app.id) {
                      setOpenChatId(null);
                    }
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'linear-gradient(135deg, var(--wa-accent-dark), var(--wa-accent))', color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>
                    {initials(app.student.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 className="font-bold text-sm truncate" style={{ color: 'var(--wa-text)' }}>
                        {studentName}
                      </h4>
                      <span className="flex-shrink-0">
                        <StatusTag tone={STATUS_TONE[app.status] ?? 'muted'}>
                          {statusLabel(app.status)}
                        </StatusTag>
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider truncate mt-0.5" style={{ color: 'var(--wa-muted)' }}>
                      {app.job.title}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--wa-muted)' }}>
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-[18px] flex-shrink-0 mt-1 transition-transform"
                    style={{ color: 'var(--wa-accent)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                   aria-hidden="true">
                    expand_more
                  </span>
                </button>

                {/* Expandable detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--wa-border)' }}>
                    <div className="pt-4 mb-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--wa-muted)' }}>Email</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--wa-text)' }}>{app.student.email}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2" style={{ marginBottom: '0.5rem' }}>
                      <button
                        type="button"
                        disabled={isChatLoading}
                        onClick={() => void toggleChat(app.id)}
                        className="w-full font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          cursor: isChatLoading ? 'default' : 'pointer',
                          background: 'var(--wa-accent-soft)',
                          color: 'var(--wa-accent)',
                          border: isChatOpen ? '1px solid var(--wa-accent)' : '1px solid transparent',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>forum</span>
                        {isChatLoading ? 'Loading…' : isChatOpen ? 'Close messages' : 'Message applicant'}
                      </button>

                    {nextStatuses.length > 0 && (
                      <>
                        {nextStatuses.map((s) => {
                          const isReject = s === 'rejected';
                          return (
                            <button type="button"
                              key={s}
                              disabled={busyId === app.id}
                              onClick={() => patchStatus(app.id, s)}
                              className="w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                              style={
                                isReject
                                  ? { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent-dark)' }
                                  : { background: 'var(--wa-accent)', color: '#ffffff' }
                              }
                            >
                              {busyId === app.id ? '…' : statusLabel(s)}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                    {nextStatuses.length === 0 && !isChatOpen && (
                      <p className="text-xs text-center" style={{ color: 'var(--wa-muted)' }}>No further actions available.</p>
                    )}

                    {isChatOpen && chatMessages[app.id] && (
                      <div style={{ marginTop: '1rem', border: '1px solid var(--wa-border)', borderRadius: '0.875rem', overflow: 'hidden', background: 'var(--wa-surface)', minHeight: '24rem' }}>
                        <EmployerApplicationChatClient
                          applicationId={app.id}
                          studentName={studentName}
                          jobTitle={app.job.title}
                          initialMessages={chatMessages[app.id]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
