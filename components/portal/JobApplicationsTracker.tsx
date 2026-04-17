'use client';

import { useEffect, useState } from 'react';
import { JobApplication } from '@prisma/client';
import JobApplicationForm from './JobApplicationForm';
import JobApplicationKanban from './JobApplicationKanban';
import PortalEmptyState from './PortalEmptyState';

interface JobApplicationsTrackerProps {
  userId: string;
}

export default function JobApplicationsTracker({ userId }: JobApplicationsTrackerProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/member/job-applications');
        if (!res.ok) throw new Error('load');
        const data = await res.json();
        setApplications(data);
        setError(null);
      } catch {
        setError('We couldn\'t load your applications. Try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleAddApplication = async (formData: Partial<JobApplication>) => {
    try {
      const res = await fetch('/api/member/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('create');

      const newApp = await res.json();
      setApplications([newApp, ...applications]);
      setIsModalOpen(false);
      setError(null);
    } catch {
      setError('We couldn\'t save that application. Check your connection and try again.');
    }
  };

  const handleUpdateApplication = async (id: string, updates: Partial<JobApplication>) => {
    try {
      const res = await fetch(`/api/member/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('update');

      const updated = await res.json();
      const nextApplication = updated.application ?? updated;
      setApplications(applications.map(app => app.id === id ? nextApplication : app));
      setError(null);
    } catch {
      setError('We couldn\'t save that change. Try again in a moment.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading your applications…</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1rem',
            background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-accent)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
          {applications.length} Application{applications.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ fontSize: '0.9rem' }}
        >
          + Add Application
        </button>
      </div>

      {isModalOpen && (
        <JobApplicationForm
          onSubmit={handleAddApplication}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {applications.length === 0 ? (
        <PortalEmptyState
          title="No applications yet"
          description="Track roles you apply to — add one manually or apply from the job board."
          primaryAction={{ label: 'Add application', onClick: () => setIsModalOpen(true) }}
          secondaryAction={{ label: 'Browse jobs', href: '/dashboard/jobs' }}
        />
      ) : (
        <JobApplicationKanban
          applications={applications}
          onStatusChange={handleUpdateApplication}
        />
      )}
    </div>
  );
}
