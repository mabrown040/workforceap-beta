'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { JobApplication, JobApplicationStatus } from '@prisma/client';

interface JobApplicationCardProps {
  application: JobApplication;
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
  availableStatuses: JobApplicationStatus[];
}

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone Screen',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  SAVED: 'Saved',
  REJECTED: 'Rejected',
};

const CARD_ACCENT: Record<JobApplicationStatus, string> = {
  SAVED:        '#64748b',
  APPLIED:      '#8c0f37',
  PHONE_SCREEN: '#2563eb',
  INTERVIEWING: '#d97706',
  OFFER:        '#16a34a',
  REJECTED:     '#dc2626',
};

const fieldStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem',
  background: 'var(--surface-container-lowest)',
  color: 'var(--color-on-surface)',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-on-surface-variant)',
  marginBottom: '0.35rem',
};

export default function JobApplicationCard({
  application,
  onStatusChange,
  availableStatuses,
}: JobApplicationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(application.status);
  const [notes, setNotes] = useState(application.notes || '');

  const handleSave = () => {
    if (selectedStatus !== application.status) {
      onStatusChange(application.id, { status: selectedStatus });
    }
    if (notes !== application.notes) {
      onStatusChange(application.id, { notes });
    }
    setIsEditing(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isEditing) {
    return (
      <div className="portal-card portal-card--flat job-app-card job-app-card--editing" style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Status</label>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as JobApplicationStatus)} style={fieldStyle}>
            {availableStatuses.map(status => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...fieldStyle, resize: 'vertical' }}
            rows={3}
            placeholder="Add notes about this application…"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSave} type="button" className="btn btn-primary" style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}>
            Save
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="portal-kanban-card job-app-card"
      style={{ padding: '0.75rem', cursor: 'pointer', '--portal-kanban-accent': CARD_ACCENT[application.status] } as CSSProperties}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsEditing(true); }}
      aria-label={`Edit ${application.role} at ${application.company}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0, flex: 1 }}>
          {application.role}
        </h4>
        {application.curatedJobId && (
          <span
            style={{
              flexShrink: 0,
              fontSize: '0.625rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.15rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(217,119,6,0.12)',
              color: '#d97706',
            }}
            title="From WorkforceAP Job Board"
          >
            Board
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', marginTop: 0 }}>
        {application.company}
      </p>

      {application.curatedJobId && application.url && (
        <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem', marginTop: 0 }}>
          <Link
            href={application.url}
            style={{ fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            View job posting →
          </Link>
        </p>
      )}

      {application.appliedAt && (
        <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', opacity: 0.9, margin: '0 0 0.25rem' }}>
          Applied {formatDate(application.appliedAt)} · {application.source}
        </p>
      )}

      {application.nextInterviewDate && (
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
          Interview: {formatDate(application.nextInterviewDate)}
        </p>
      )}

      {application.notes && (
        <p style={{
          fontSize: '0.7rem',
          color: 'var(--color-on-surface-variant)',
          borderTop: '1px solid rgba(222,191,194,0.25)',
          paddingTop: '0.5rem',
          marginTop: '0.5rem',
          marginBottom: 0,
        }}>
          {application.notes}
        </p>
      )}

      <p style={{
        fontSize: '0.65rem',
        color: 'var(--color-on-surface-variant)',
        opacity: 0.6,
        marginTop: '0.5rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid rgba(222,191,194,0.25)',
        marginBottom: 0,
      }}>
        Tap to update
      </p>
    </div>
  );
}
