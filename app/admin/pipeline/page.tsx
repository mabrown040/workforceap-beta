'use client';

import { useEffect, useState } from 'react';

const STAGES = [
  { key: 'holding', label: 'Holding Room', color: '#6b7280', desc: 'Invited, not yet in Coursera' },
  { key: 'funding', label: 'Funding Evaluated', color: '#f59e0b', desc: 'WIOA/qualification complete' },
  { key: 'coursera', label: 'Coursera Enrolled', color: '#3b82f6', desc: 'In training' },
  { key: 'paid', label: 'Payment Received', color: '#10b981', desc: 'Funding secured' },
  { key: 'complete', label: 'Training Complete', color: '#8b5cf6', desc: 'Certificates earned' },
  { key: 'ready', label: 'Workforce Ready', color: '#06b6d4', desc: 'Resume, interview, job match' },
  { key: 'placed', label: 'Placed', color: '#f59e0b', desc: 'Employed' },
];

type SurveyStats = {
  totalSent: number;
  totalCompleted: number;
  responseRate: number;
  atRiskCount: number;
};

type AtRiskPlacement = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  employerName: string;
  jobTitle: string;
  placedAt: string;
  daysSincePlacement: number;
  surveySent: boolean;
  surveyCompleted: boolean;
  wave: string;
};

export default function PipelinePage() {
  const [data, setData] = useState<Record<string, number>>({});
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [reSending, setReSending] = useState<string | null>(null);
  const [reSendResult, setReSendResult] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/pipeline')
      .then((r) => r.json())
      .then((d) => { setData(d.counts || {}); })
      .catch(() => {});

    fetch('/api/admin/pipeline/surveys')
      .then((r) => r.json())
      .then((d) => {
        setSurveyStats(d.stats || null);
        setAtRisk(d.atRisk || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = Object.values(data).reduce((a, b) => a + (b || 0), 0);

  async function handleReSend(placementId: string) {
    setReSending(placementId);
    setReSendResult(null);
    try {
      const res = await fetch('/api/admin/placement-surveys/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReSendResult({ id: placementId, msg: 'Sent!' });
        // Refresh at-risk list
        const refresh = await fetch('/api/admin/pipeline/surveys');
        const d = await refresh.json().catch(() => ({}));
        setAtRisk(d.atRisk || []);
      } else {
        setReSendResult({ id: placementId, msg: json.error || 'Failed' });
      }
    } catch {
      setReSendResult({ id: placementId, msg: 'Network error' });
    } finally {
      setReSending(null);
    }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Member Pipeline</h1>
      <p className="admin-page-subtitle">7-stage journey from invitation to employment</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {STAGES.map((stage) => (
          <div key={stage.key} className="portal-card portal-card--flat" style={{ borderLeft: `4px solid ${stage.color}`, padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              {stage.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
              {loading ? '—' : (data[stage.key] || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              {stage.desc}
            </div>
          </div>
        ))}
      </div>

      <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Total Members in Pipeline</h3>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent)' }}>{total.toLocaleString()}</span>
        </div>
        <div style={{ height: '2rem', background: 'var(--surface-container)', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex' }}>
          {STAGES.map((stage) => {
            const count = data[stage.key] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stage.key} style={{ width: `${pct}%`, background: stage.color, minWidth: count > 0 ? '2px' : 0 }} title={`${stage.label}: ${count}`} />
            );
          })}
        </div>
      </div>

      {/* Survey Stats */}
      {surveyStats && (
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', marginTop: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Placement Survey Response Rate</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Surveys Sent</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{surveyStats.totalSent}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Completed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{surveyStats.totalCompleted}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Response Rate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: surveyStats.responseRate >= 50 ? '#10b981' : surveyStats.responseRate >= 25 ? '#f59e0b' : '#ef4444' }}>
                {surveyStats.responseRate}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>At Risk (No Response)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: surveyStats.atRiskCount > 0 ? '#ef4444' : 'inherit' }}>{surveyStats.atRiskCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* At-Risk Placements */}
      {atRisk.length > 0 && (
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', marginTop: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Placements at Risk — No Survey Response</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Member</th>
                  <th style={{ padding: '0.75rem' }}>Employer</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Days Since Placement</th>
                  <th style={{ padding: '0.75rem' }}>Wave</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.fullName ?? '—'}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{p.email ?? '—'}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{p.employerName}</td>
                    <td style={{ padding: '0.75rem' }}>{p.jobTitle}</td>
                    <td style={{ padding: '0.75rem' }}>{p.daysSincePlacement}</td>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{p.wave.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleReSend(p.id)}
                        disabled={reSending === p.id}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          cursor: reSending === p.id ? 'wait' : 'pointer',
                          opacity: reSending === p.id ? 0.7 : 1,
                        }}
                      >
                        {reSending === p.id ? 'Sending…' : reSendResult?.id === p.id ? reSendResult.msg : 'Re-send'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
