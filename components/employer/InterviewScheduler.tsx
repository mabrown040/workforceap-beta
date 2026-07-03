'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

type InterviewSchedulerProps = {
  applicationId: string;
  applicantName: string;
  currentScheduledAt?: string | null;
  onScheduled?: () => void;
};

export default function InterviewScheduler({
  applicationId,
  applicantName,
  currentScheduledAt,
  onScheduled,
}: InterviewSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    currentScheduledAt ? new Date(currentScheduledAt).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSchedule = async () => {
    if (!scheduledDate) {
      setMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/employer/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'interview',
          interviewScheduledAt: new Date(scheduledDate).toISOString(),
          interviewNotes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to schedule interview' });
        return;
      }

      setMessage({ type: 'success', text: 'Interview scheduled successfully!' });
      setTimeout(() => {
        setIsOpen(false);
        onScheduled?.();
      }, 1500);
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setIsOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Calendar size={16} aria-hidden />
        {currentScheduledAt ? 'Reschedule Interview' : 'Schedule Interview'}
      </button>
    );
  }

  return (
    <div style={{
      padding: '1.25rem',
      background: 'var(--surface-container-lowest)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--outline-variant)',
      marginTop: '1rem'
    }}>
      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
        Schedule Interview with {applicantName}
      </h4>

      {message && (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: message.type === 'success' ? 'var(--color-success-container, #d1fae5)' : 'var(--color-error-container, #fee2e2)',
            color: message.type === 'success' ? 'var(--color-on-success-container, #065f46)' : 'var(--color-on-error-container, #991b1b)',
            fontSize: '0.9rem'
          }}
        >
          {message.text}
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label htmlFor="interview-datetime">
          Date & Time <span style={{ color: 'var(--color-accent)' }}>*</span>
        </label>
        <input
          id="interview-datetime"
          type="datetime-local"
          className="form-control"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          disabled={saving}
        />
        <small style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          Applicant will receive an email notification with interview details
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="interview-notes">Interview Notes (optional)</label>
        <textarea
          id="interview-notes"
          className="form-control"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any details for the applicant (location, what to bring, etc.)"
          disabled={saving}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSchedule}
          disabled={saving || !scheduledDate}
        >
          {saving ? 'Scheduling...' : 'Schedule Interview'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setIsOpen(false);
            setMessage(null);
          }}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
