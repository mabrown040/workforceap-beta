'use client';

import { useState, useCallback } from 'react';
import EmployerApplicationChatClient from '@/components/portal/EmployerApplicationChatClient';
import type { AppMsg, EmployerApplicationRow } from './EmployerApplicationsClient';

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

function statusColor(status: string): { bg: string; color: string } {
  if (status === 'hired') return { bg: '#dcfce7', color: '#166534' };
  if (status === 'rejected') return { bg: '#fee2e2', color: '#991b1b' };
  if (status === 'pending') return { bg: '#fff1f2', color: 'var(--color-accent)' };
  if (status === 'reviewing') return { bg: '#fef3c7', color: 'var(--color-gold)' };
  if (status === 'interview') return { bg: '#dbeafe', color: '#1e3a8a' };
  if (status === 'offered') return { bg: '#f3e8ff', color: '#6b21a8' };
  return { bg: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' };
}

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
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0 1rem 0.75rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {STATUS_CHIP_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="text-xs font-semibold transition-colors"
              style={Object.assign(
                { flexShrink: 0, padding: '0.375rem 1rem', borderRadius: '9999px' },
                active ? { background: 'var(--color-accent)', color: '#ffffff' } : { background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' }
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
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined text-3xl block mb-2" style={{ color: 'var(--outline-variant)' }} aria-hidden="true">inbox</span>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>No applications found.</p>
          </div>
        ) : (
          visible.map((app) => {
            const isExpanded = expandedId === app.id;
            const isChatOpen = openChatId === app.id;
            const isChatLoading = chatLoadingId === app.id;
            const sc = statusColor(app.status);
            const nextStatuses = STATUS_ACTIONS[app.status] ?? [];
            const studentName = app.student.fullName?.trim() || app.student.email;

            return (
              <div
                key={app.id}
                style={{ borderRadius: '0.75rem', overflow: 'hidden', background: '#ffffff', boxShadow: '0 4px 24px -2px rgba(28,27,27,0.06)' }}
              >
                {/* Card header — tap to expand */}
                <button
                  className="active:opacity-80" style={{ width: '100%', textAlign: 'left', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
                  onClick={() => {
                    const nextExpanded = isExpanded ? null : app.id;
                    setExpandedId(nextExpanded);
                    if (nextExpanded !== app.id && openChatId === app.id) {
                      setOpenChatId(null);
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="text-white font-bold text-base" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--color-accent)' }}
                  >
                    {initials(app.student.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h4 className="font-bold text-sm truncate" style={{ color: 'var(--color-on-surface)' }}>
                        {studentName}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tighter flex-shrink-0"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {statusLabel(app.status)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider truncate mt-0.5" style={{ color: 'var(--color-gold)' }}>
                      {app.job.title}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-[18px] flex-shrink-0 mt-1 transition-transform"
                    style={{ color: 'var(--color-accent)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                   aria-hidden="true">
                    expand_more
                  </span>
                </button>

                {/* Expandable detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--surface-container)' }}>
                    <div className="pt-4 mb-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>Email</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>{app.student.email}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        disabled={isChatLoading}
                        onClick={() => void toggleChat(app.id)}
                        className="py-2.5 px-4 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                        style={{
                          background: isChatOpen ? '#f3e8ff' : '#fff1f2',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {isChatLoading ? 'Loading chat…' : isChatOpen ? 'Close messages' : '💬 Message applicant'}
                      </button>
                    </div>

                    {/* Status action buttons */}
                    {nextStatuses.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {nextStatuses.map((s) => {
                          const isReject = s === 'rejected';
                          return (
                            <button
                              key={s}
                              disabled={busyId === app.id}
                              onClick={() => patchStatus(app.id, s)}
                              className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                              style={
                                isReject
                                  ? { background: '#ffdad6', color: '#93000a' }
                                  : { background: 'var(--color-accent)', color: '#ffffff' }
                              }
                            >
                              {busyId === app.id ? '…' : statusLabel(s)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {nextStatuses.length === 0 && !isChatOpen && (
                      <p className="text-xs text-center" style={{ color: 'var(--color-on-surface-variant)' }}>No further actions available.</p>
                    )}

                    {isChatOpen && chatMessages[app.id] && (
                      <div style={{ marginTop: '1rem', border: '1px solid #ebe7e7', borderRadius: '0.875rem', overflow: 'hidden', background: '#fff', minHeight: '24rem' }}>
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
