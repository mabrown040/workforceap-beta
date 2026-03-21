'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type MatchedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  matchPct: number;
};

export default function MatchedRoles() {
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/member/matched-jobs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.jobs)) setJobs(data.jobs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (jobs.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Based on your assessment, you match these roles:</h3>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        These jobs are ranked by how well they fit your skills and program.
      </p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {jobs.map((job) => {
          const matchColor = job.matchPct >= 70 ? '#16a34a' : job.matchPct >= 40 ? '#d97706' : '#6b7280';
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              style={{
                display: 'block',
                padding: '1rem 1.25rem',
                background: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{job.title}</div>
                  <div style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
                    {job.company} &middot; {job.location}
                  </div>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: matchColor,
                    background: `${matchColor}15`,
                    border: `1px solid ${matchColor}30`,
                  }}
                >
                  {job.matchPct}% match
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
