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

export default function ApplicationTrackerTable() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [status, setStatus] = useState('SAVED');
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch('/api/member/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, url: jobUrl || null, status }),
      });
      if (res.ok) {
        setCompany('');
        setRole('');
        setJobUrl('');
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
                  <td>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDelete(app.id)}
                      aria-label="Delete"
                    >
                      Delete
                    </button>
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
