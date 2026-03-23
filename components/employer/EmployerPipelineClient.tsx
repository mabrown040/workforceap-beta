'use client';

import { useState, useCallback } from 'react';

type MatchRow = {
  id: string;
  matchScore: number;
  matchReasons: string[];
  status: string;
  student: { id: string; fullName: string; email: string; enrolledProgram: string | null };
};

export default function EmployerPipelineClient({
  jobId,
  jobTitle,
  initialMatches,
}: {
  jobId: string;
  jobTitle: string;
  initialMatches: MatchRow[];
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = useCallback(
    async (studentId: string, status: string) => {
      setBusy(studentId);
      try {
        const r = await fetch(`/api/employer/jobs/${jobId}/matches/${studentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return;
        setMatches((prev) =>
          prev.map((m) => (m.student.id === studentId ? { ...m, status: data.status ?? status } : m))
        );
      } finally {
        setBusy(null);
      }
    },
    [jobId]
  );

  if (matches.length === 0) {
    return (
      <p style={{ color: 'var(--color-gray-600)' }}>
        No AI-suggested matches for <strong>{jobTitle}</strong> yet. Matches appear after admin review runs.
      </p>
    );
  }

  return (
    <div className="employer-pipeline-job-block">
      <h3 className="employer-pipeline-job-title">{jobTitle}</h3>
      <ul className="employer-pipeline-match-list">
        {matches.map((m) => (
          <li key={m.id} className="employer-pipeline-match-card">
            <div>
              <strong>{m.student.fullName}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>{m.student.email}</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                Score: {m.matchScore}
                {m.matchReasons?.length ? (
                  <span style={{ color: 'var(--color-gray-500)' }}> · {m.matchReasons.slice(0, 2).join(' · ')}</span>
                ) : null}
              </div>
            </div>
            <div className="employer-pipeline-match-actions">
              <span className="employer-pipeline-status">{m.status.replace(/_/g, ' ')}</span>
              <select
                value={m.status}
                disabled={busy === m.student.id}
                onChange={(e) => void setStatus(m.student.id, e.target.value)}
                aria-label={`Match status for ${m.student.fullName}`}
              >
                <option value="suggested">Suggested</option>
                <option value="employer_notified">Employer notified</option>
                <option value="student_notified">Student notified</option>
                <option value="rejected">Not a fit</option>
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
