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

export default function PipelinePage() {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/pipeline')
      .then((r) => r.json())
      .then((d) => { setData(d.counts || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const total = Object.values(data).reduce((a, b) => a + (b || 0), 0);

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
    </div>
  );
}
