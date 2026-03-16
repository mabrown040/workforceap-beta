'use client';

import { useState, useEffect } from 'react';
import { trackApplicationTrackerOpen } from '@/lib/analytics/events';

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
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/member/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchApplications();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    await fetch(`/api/member/applications/${id}`, { method: 'DELETE' });
    fetchApplications();
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
    const payload: Record<string, unknown> = {};
    if (editAppliedAt.trim()) payload.appliedAt = `${editAppliedAt}T12:00:00.000Z`;
    else payload.appliedAt = null;
    payload.url = editUrl.trim() || null;
    await fetch(`/api/member/applications/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingId(null);
    fetchApplications();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="application-tracker">
      <div className="application-tracker-header">
        <h2>Your applications</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add application'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="application-tracker-form">
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
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
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
              {applications.map((app) => (
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
                        <option key={s} value={s}>{s}</option>
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
                      <span>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}</span>
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
                          onClick={() => handleDelete(app.id)}
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
      )}

      <p className="application-tracker-summary">
        <strong>{applications.length}</strong> application{applications.length !== 1 ? 's' : ''} tracked
      </p>
    </div>
  );
}
