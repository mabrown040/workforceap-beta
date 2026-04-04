'use client';

import { Fragment, useState, useCallback } from 'react';
import Link from 'next/link';
import EmployerApplicationChatClient from '@/components/portal/EmployerApplicationChatClient';

export type AppMsg = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  isFromEmployer: boolean;
};

export type EmployerApplicationRow = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  employerNotes: string | null;
  job: { id: string; title: string };
  student: { id: string; fullName: string | null; email: string };
};

const STATUSES = ['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected'] as const;

export default function EmployerApplicationsClient({ initialRows }: { initialRows: EmployerApplicationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, AppMsg[]>>({});
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
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
          row.id === id
            ? {
                ...row,
                status: data.status ?? status,
                employerNotes: data.employerNotes ?? row.employerNotes,
              }
            : row
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

    setOpenChatId(applicationId);
  }, [openChatId]);

  if (rows.length === 0) {
    return <p style={{ color: 'var(--color-on-surface-variant)' }}>No applications yet.</p>;
  }

  return (
    <div>
      {error ? (
        <p className="employer-apps-error" role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Job</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => {
              const studentName = app.student.fullName?.trim() || app.student.email;
              const isChatOpen = openChatId === app.id;
              const isChatLoading = chatLoadingId === app.id;
              const initialMessages = chatMessages[app.id] ?? [];

              return (
                <Fragment key={app.id}>
                  <tr id={app.id}>
                    <td>
                      <div>
                        <strong>{studentName}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                          {app.student.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Link href={`/employer/jobs/${app.job.id}`} style={{ color: 'var(--color-accent)' }}>
                        {app.job.title}
                      </Link>
                    </td>
                    <td>
                      <select
                        className="employer-app-status-select"
                        value={app.status}
                        disabled={busyId === app.id}
                        onChange={(e) => void patchStatus(app.id, e.target.value)}
                        aria-label={`Status for ${studentName}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void toggleChat(app.id)}
                        disabled={isChatLoading}
                        aria-expanded={isChatOpen}
                        aria-controls={`employer-chat-${app.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          background: isChatOpen ? '#f3e8ff' : '#fff1f2',
                          color: 'var(--color-accent)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          opacity: isChatLoading ? 0.7 : 1,
                        }}
                      >
                        <span aria-hidden="true">💬</span>
                        {isChatLoading ? 'Loading…' : isChatOpen ? 'Close' : 'Message'}
                      </button>
                    </td>
                  </tr>
                  {isChatOpen ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '0 0 1rem' }}>
                        <div
                          id={`employer-chat-${app.id}`}
                          style={{
                            marginTop: '0.75rem',
                            border: '1px solid #ebe7e7',
                            borderRadius: '0.875rem',
                            overflow: 'hidden',
                            background: '#fff',
                            minHeight: '28rem',
                          }}
                        >
                          <EmployerApplicationChatClient
                            applicationId={app.id}
                            studentName={studentName}
                            jobTitle={app.job.title}
                            initialMessages={initialMessages}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
