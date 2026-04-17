'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { JobApplication, JobApplicationStatus } from '@prisma/client';
import JobApplicationCard from './JobApplicationCard';

interface JobApplicationKanbanProps {
  applications: JobApplication[];
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}

const STATUSES: JobApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'PHONE_SCREEN',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
];

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone Screen',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  SAVED: 'Saved',
  REJECTED: 'Rejected',
};

const STATUS_BADGE_STYLES: Record<JobApplicationStatus, CSSProperties> = {
  APPLIED:      { background: 'var(--surface-container-high)', color: 'var(--color-on-surface-variant)' },
  PHONE_SCREEN: { background: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  INTERVIEWING: { background: 'rgba(217,119,6,0.1)', color: '#d97706' },
  OFFER:        { background: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  SAVED:        { background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' },
  REJECTED:     { background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)' },
};

const STATUS_ACCENTS: Record<JobApplicationStatus, string> = {
  SAVED:        '#64748b',
  APPLIED:      'var(--color-accent)',
  PHONE_SCREEN: '#2563eb',
  INTERVIEWING: '#d97706',
  OFFER:        '#16a34a',
  REJECTED:     '#dc2626',
};

function MobileApplicationCard({
  application,
  onStatusChange,
}: {
  application: JobApplication;
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(application.status);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (selectedStatus !== application.status) {
      onStatusChange(application.id, { status: selectedStatus });
    }
    setOpen(false);
  };

  return (
    <div
      className="portal-kanban-card"
      style={{ padding: '1rem', marginBottom: '0.75rem', '--portal-kanban-accent': STATUS_ACCENTS[application.status] } as CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {application.role}
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.125rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>
            {application.company}
          </p>
          {application.appliedAt && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-on-surface-variant)', opacity: 0.85, margin: '0.25rem 0 0' }}>
              Applied {formatDate(application.appliedAt)}
            </p>
          )}
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '999px',
            ...STATUS_BADGE_STYLES[application.status],
          }}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      {open ? (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem' }}>
            Update Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as JobApplicationStatus)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '0.75rem', background: 'var(--surface-container)', color: 'var(--color-on-surface)' }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleSave} className="btn btn-primary" style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}>
              Save
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          Update Status
        </button>
      )}
    </div>
  );
}

export default function JobApplicationKanban({
  applications,
  onStatusChange,
}: JobApplicationKanbanProps) {
  const grouped = STATUSES.reduce(
    (acc, status) => {
      acc[status] = applications.filter((app) => app.status === status);
      return acc;
    },
    {} as Record<JobApplicationStatus, JobApplication[]>
  );

  return (
    <>
      {/* Mobile card list */}
      <div className="wa-block wa-md:wa-hidden">
        {applications.length === 0 ? (
          <div className="portal-kanban-mobile-empty">
            <p style={{ margin: 0 }}>No applications yet.</p>
          </div>
        ) : (
          <div>
            {STATUSES.map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <div key={status} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        ...STATUS_BADGE_STYLES[status],
                      }}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{group.length}</span>
                  </div>
                  {group.map((app) => (
                    <MobileApplicationCard key={app.id} application={app} onStatusChange={onStatusChange} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop kanban */}
      <div className="wa-hidden wa-md:wa-block">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {STATUSES.map((status) => (
            <div
              key={status}
              className="portal-kanban-column"
              style={{ '--portal-kanban-accent': STATUS_ACCENTS[status] } as CSSProperties}
            >
              <div className="portal-kanban-column__head">
                <span className="portal-kanban-column__title">{STATUS_LABELS[status]}</span>
                <span className="portal-kanban-column__count">{grouped[status].length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {grouped[status].length === 0 ? (
                  <div className="portal-kanban-empty">No applications</div>
                ) : (
                  grouped[status].map((app) => (
                    <JobApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={onStatusChange}
                      availableStatuses={STATUSES}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
