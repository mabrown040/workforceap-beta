'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Funnel {
  name: string;
  current: number;
  target: number;
  rate: number;
  description: string;
}

interface TrendPoint {
  week: string;
  count: number;
}

interface MetricsData {
  summary: {
    totalMembers: number;
    enrolledMembers: number;
    enrollmentRate: number;
    assessmentRate: number;
    activeDashboardUsers: number;
    activationRate: number;
    aiToolRuns: number;
    jobApplicationsTracked: number;
    totalPlacements: number;
    recentPlacements: number;
    avgPlacementSalary: number;
    placementRate: number;
  };
  funnels: Funnel[];
  trends: {
    signups: TrendPoint[];
    enrollments: TrendPoint[];
    dashboardViews: TrendPoint[];
  };
}

import MfaStatusBanner from '@/components/admin/MfaStatusBanner';

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading metrics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)' }}>
        <p>Error loading metrics: {error || 'No data'}</p>
      </div>
    );
  }

  const { summary, funnels, trends } = data;

  // Format week labels
  const formatWeek = (w: string) => {
    const d = new Date(w);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const signupData = trends.signups.map((t) => ({ week: formatWeek(t.week), count: t.count }));
  const enrollmentData = trends.enrollments.map((t) => ({ week: formatWeek(t.week), count: t.count }));
  const viewData = trends.dashboardViews.map((t) => ({ week: formatWeek(t.week), count: t.count }));

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <nav style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
          <Link href="/admin" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Admin</Link>
          <span style={{ margin: '0 0.35rem' }}>/</span>
          <span style={{ fontWeight: 600 }}>Executive Dashboard</span>
        </nav>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Executive Dashboard</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
          Real-time metrics across all 7 CEO funnels and placement KPIs
        </p>
      </div>

      {/* MFA Status Banner for staff */}
      <MfaStatusBanner />

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <SummaryCard label="Total Members" value={summary.totalMembers} />
        <SummaryCard label="Enrolled" value={summary.enrolledMembers} suffix={`${summary.enrollmentRate}%`} color="var(--color-green)" />
        <SummaryCard label="Assessment Done" value={`${summary.assessmentRate}%`} color="var(--color-blue)" />
        <SummaryCard label="Dashboard Active" value={summary.activeDashboardUsers} />
        <SummaryCard label="Activation Rate" value={`${summary.activationRate}%`} color="var(--color-accent)" />
        <SummaryCard label="AI Tool Runs" value={summary.aiToolRuns} color="var(--color-gold)" />
        <SummaryCard label="Placements" value={summary.totalPlacements} color="var(--color-green)" />
        <SummaryCard label="Placement Rate" value={`${summary.placementRate}%`} color="var(--color-accent)" />
        <SummaryCard label="Avg Salary" value={`$${summary.avgPlacementSalary.toLocaleString()}`} color="var(--color-blue)" />
      </div>

      {/* Funnel Cards */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>CEO Funnels</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {funnels.map((f) => (
          <div
            key={f.name}
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{f.name}</h3>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: f.rate >= 50 ? 'var(--color-green)' : f.rate >= 25 ? 'var(--color-gold)' : 'var(--color-accent)',
                }}
              >
                {f.rate}%
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}>
              {f.description}
            </p>
            {/* Progress bar */}
            <div
              style={{
                height: 8,
                background: 'var(--surface-container-highest)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${f.rate}%`,
                  height: '100%',
                  background:
                    f.rate >= 50
                      ? 'var(--color-green)'
                      : f.rate >= 25
                        ? 'var(--color-gold)'
                        : 'var(--color-accent)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', textAlign: 'right' }}>
              {f.current} of {f.target}
            </p>
          </div>
        ))}
      </div>

      {/* Trend Charts */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>30-Day Trends</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Signups */}
        <div style={{ background: 'var(--surface-container-low)', borderRadius: 12, padding: '1rem', border: '1px solid var(--outline-variant)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Member Signups</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enrollments */}
        <div style={{ background: 'var(--surface-container-low)', borderRadius: 12, padding: '1rem', border: '1px solid var(--outline-variant)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Program Enrollments</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dashboard views */}
        <div style={{ background: 'var(--surface-container-low)', borderRadius: 12, padding: '1rem', border: '1px solid var(--outline-variant)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Dashboard Views</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-blue)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
        Metrics refresh on page load. Data sourced from member_events and user tables.
        <br />
        Placement tracking KPIs coming soon (waiting on placement workflow completion).
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  color = 'var(--color-on-surface)',
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-container-low)',
        borderRadius: 12,
        padding: '0.875rem 1rem',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
        {suffix && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>{suffix}</span>}
      </div>
    </div>
  );
}
