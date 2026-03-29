'use client';

import { useState, useCallback } from 'react';
import type { EmployerApplicationRow } from './EmployerApplicationsClient';

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
  if (status === 'pending') return { bg: '#fff1f2', color: '#8c0f37' };
  if (status === 'reviewing') return { bg: '#fef3c7', color: '#7b5800' };
  if (status === 'interview') return { bg: '#dbeafe', color: '#1e3a8a' };
  if (status === 'offered') return { bg: '#f3e8ff', color: '#6b21a8' };
  return { bg: '#f0edec', color: '#584144' };
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

  const visible =
    filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        {STATUS_CHIP_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={
                active
                  ? { background: '#ad2c4d', color: '#ffffff' }
                  : { background: '#f0edec', color: '#584144' }
              }
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
      <div className="px-4 space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-3xl block mb-2" style={{ color: '#debfc2' }}>inbox</span>
            <p className="text-sm" style={{ color: '#584144' }}>No applications found.</p>
          </div>
        ) : (
          visible.map((app) => {
            const isExpanded = expandedId === app.id;
            const sc = statusColor(app.status);
            const nextStatuses = STATUS_ACTIONS[app.status] ?? [];

            return (
              <div
                key={app.id}
                className="rounded-xl overflow-hidden"
                style={{ background: '#ffffff', boxShadow: '0 4px 24px -2px rgba(28,27,27,0.06)' }}
              >
                {/* Card header — tap to expand */}
                <button
                  className="w-full text-left p-4 flex gap-4 items-start active:opacity-80"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-base"
                    style={{ background: '#ad2c4d' }}
                  >
                    {initials(app.student.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm truncate" style={{ color: '#1c1b1b' }}>
                        {app.student.fullName}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tighter flex-shrink-0"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {statusLabel(app.status)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider truncate mt-0.5" style={{ color: '#7b5800' }}>
                      {app.job.title}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: '#584144' }}>
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-[18px] flex-shrink-0 mt-1 transition-transform"
                    style={{ color: '#8c0f37', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    expand_more
                  </span>
                </button>

                {/* Expandable detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: '#f0edec' }}>
                    <div className="pt-4 mb-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: '#8b7073' }}>Email</p>
                      <p className="text-sm font-semibold" style={{ color: '#1c1b1b' }}>{app.student.email}</p>
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
                                  : { background: '#8c0f37', color: '#ffffff' }
                              }
                            >
                              {busyId === app.id ? '…' : statusLabel(s)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {nextStatuses.length === 0 && (
                      <p className="text-xs text-center" style={{ color: '#584144' }}>No further actions available.</p>
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
