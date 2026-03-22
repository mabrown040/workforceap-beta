'use client';

import { useState, useEffect, useRef } from 'react';
import { trackApplicationTrackerOpen } from '@/lib/analytics/events';
import { TableSkeleton } from '@/components/ui/Skeleton';

type JobApplication = {
  id: string;
  company: string;
  role: string;
  status: string;
  appliedAt: string | null;
  notes: string | null;
  url: string | null;
};

const STATUS_OPTIONS = ['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER', 'REJECTED'];
const STATUS_LABELS: Record<string, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone Screen',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function ApplicationTrackerTable() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [appliedAt, setAppliedAt] = useState('');
  const [status, setStatus] = useState('SAVED');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAppliedAt, setEditAppliedAt] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const filteredApplications = applications.filter((app) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'interview') {
        if (app.status !== 'PHONE_SCREEN' && app.status !== 'INTERVIEWING') return false;
      } else {
        const statusMap: Record<string, string> = { applied: 'APPLIED', offer: 'OFFER', rejected: 'REJECTED', saved: 'SAVED' };
        if (app.status !== statusMap[statusFilter]) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        app.company.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countByStatus = (status: string) => {
    if (status === 'interview') {
      return applications.filter((a) => a.status === 'PHONE_SCREEN' || a.status === 'INTERVIEWING').length;
    }
    if (status === 'all') return applications.length;
    return applications.filter((a) => a.status === status).length;
  };

  const FILTER_OPTIONS = [
    { value: 'all', label: 'All', count: () => applications.length },
    { value: 'applied', label: 'Applied', count: () => countByStatus('APPLIED') },
    { value: 'interview', label: 'Interview', count: () => countByStatus('interview') },
    { value: 'offer', label: 'Offer', count: () => countByStatus('OFFER') },
    { value: 'rejected', label: 'Rejected', count: () => countByStatus('REJECTED') },
    { value: 'saved', label: 'Saved', count: () => countByStatus('SAVED') },
  ];

  useEffect(() => {
    trackApplicationTrackerOpen();
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const res = await fetch('/api/member/applications');
    const data = await res.json();
    if (res.ok) setApplications(data.applications ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { company, role, url: jobUrl || null, status };
      if (appliedAt.trim()) payload.appliedAt = `${appliedAt}T12:00:00.000Z`;
      const res = await fetch('/api/member/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCompany('');
        setRole('');
        setJobUrl('');
        setAppliedAt('');
        setStatus('SAVED');
        setShowForm(false);
        fetchApplications();
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? 'Failed to add application. Please try again.');
      }
    } catch {
      setAddError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/member/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((data as { error?: string }).error ?? 'Could not update status. Try again.');
        await fetchApplications();
        return;
      }
      await fetchApplications();
    } catch {
      setActionError('Network error while updating status.');
      await fetchApplications();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setActionError(null);
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/member/applications/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((data as { error?: string }).error ?? 'Could not delete. Try again.');
        return;
      }
      await fetchApplications();
    } catch {
      setActionError('Network error while deleting.');
    }
  };

  const startEdit = (app: JobApplication) => {
    setEditingId(app.id);
    setEditAppliedAt(toDateInputValue(app.appliedAt));
    setEditUrl(app.url ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAppliedAt('');
    setEditUrl('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setActionError(null);
    const payload: Record<string, unknown> = {};
    if (editAppliedAt.trim()) payload.appliedAt = `${editAppliedAt}T12:00:00.000Z`;
    else payload.appliedAt = null;
    payload.url = editUrl.trim() || null;
    try {
      const res = await fetch(`/api/member/applications/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((data as { error?: string }).error ?? 'Could not save changes. Try again.');
        return;
      }
      setEditingId(null);
      await fetchApplications();
    } catch {
      setActionError('Network error while saving.');
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div className="application-tracker">
      <div className="application-tracker-header">
        <h2>Your applications</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const next = !showForm;
            setShowForm(next);
            if (next) {
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }
          }}
        >
          {showForm ? 'Cancel' : '+ Add application'}
        </button>
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={handleAdd} className="application-tracker-form">
          <div className="form-row">
            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Applied date (optional)</label>
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Job URL (optional)</label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
                disabled={submitting}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={submitting}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
          {addError && (
            <p className="form-error" role="alert">{addError}</p>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Add
          </button>
        </form>
      )}

      {applications.length === 0 ? (
        <div className="application-tracker-empty">
          <p>No applications yet. Add one to start tracking.</p>
        </div>
      ) : (
        <>
          <div className="application-tracker-filters">
            <div className="application-tracker-filter-chips">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`application-tracker-filter-chip ${statusFilter === opt.value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label} ({opt.count()})
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="application-tracker-search"
              aria-label="Search applications"
            />
          </div>
          {actionError && (
            <p className="form-error application-tracker-action-error" role="alert">
              {actionError}
            </p>
          )}
          <p className="application-tracker-scroll-hint">On a small screen, scroll sideways to see all columns.</p>
          <div className="application-tracker-table-wrap">
          <table className="application-tracker-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((app) => (
                <tr key={app.id}>
                  <td>{app.company}</td>
                  <td>{app.role}</td>
                  <td>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="application-status-select"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {editingId === app.id ? (
                      <input
                        type="date"
                        value={editAppliedAt}
                        onChange={(e) => setEditAppliedAt(e.target.value)}
                        className="application-tracker-edit-input"
                      />
                    ) : (
                      <span>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '— (add date)'}</span>
                    )}
                  </td>
                  <td>
                    {editingId === app.id ? (
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://..."
                        className="application-tracker-edit-input"
                      />
                    ) : app.url ? (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {editingId === app.id ? (
                      <span style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>
                          Save
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => startEdit(app)}
                          aria-label="Edit date and link"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setPendingDeleteId(app.id)}
                          aria-label="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredApplications.length === 0 && applications.length > 0 && (
          <p className="application-tracker-no-results">No applications match your filters.</p>
        )}
        </>
      )}

      <p className="application-tracker-summary">
        <strong>{applications.length}</strong> application{applications.length !== 1 ? 's' : ''} tracked
        {statusFilter !== 'all' || searchQuery.trim() ? ` (${filteredApplications.length} shown)` : ''}
      </p>

      {pendingDeleteId && (
        <div className="application-tracker-delete-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-delete-title">
          <div className="application-tracker-delete-modal__panel">
            <h3 id="tracker-delete-title">Delete this application?</h3>
            <p>This removes it from your tracker. You can add it again later.</p>
            <div className="application-tracker-delete-modal__actions">
              <button type="button" className="btn btn-outline" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
