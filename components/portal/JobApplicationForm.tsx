'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { JobApplicationSource } from '@prisma/client';

interface JobApplicationFormProps {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function JobApplicationForm({ onSubmit, onClose }: JobApplicationFormProps) {
  const titleId = useId();
  const errorId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    appliedAt: new Date().toISOString().split('T')[0],
    source: 'OTHER' as JobApplicationSource,
    notes: '',
    nextInterviewDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({
        ...formData,
        appliedAt: formData.appliedAt ? new Date(formData.appliedAt) : null,
        nextInterviewDate: formData.nextInterviewDate ? new Date(formData.nextInterviewDate) : null,
        status: 'APPLIED',
      });
    } catch {
      setError('We couldn\'t save this application. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    background: 'var(--surface-container-low)',
    color: 'var(--color-on-surface)',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--color-on-surface)',
    marginBottom: '0.35rem',
  };

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          maxWidth: '28rem',
          width: '100%',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--surface-container-lowest)',
          borderBottom: '1px solid var(--outline-variant)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 id={titleId} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
            Add Application
          </h2>
          <button
            onClick={onClose}
            aria-label="Close add application dialog"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '0.25rem' }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              id={errorId}
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(173,44,77,0.08)',
                border: '1px solid rgba(173,44,77,0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-accent)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>Job Title *</label>
            <input
              ref={firstFieldRef}
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              aria-describedby={error ? errorId : undefined}
              style={inputStyle}
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div>
            <label style={labelStyle}>Company *</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="e.g., Techvera"
            />
          </div>

          <div>
            <label style={labelStyle}>Date Applied *</label>
            <input
              type="date"
              name="appliedAt"
              value={formData.appliedAt}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Where did you find it? *</label>
            <select name="source" value={formData.source} onChange={handleChange} style={inputStyle}>
              <option value="INDEED">Indeed</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="DIRECT">Company website</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Interview Date <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
            <input
              type="date"
              name="nextInterviewDate"
              value={formData.nextInterviewDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={3}
              placeholder="Any notes about this application…"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {isSubmitting ? 'Adding…' : 'Add Application'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
