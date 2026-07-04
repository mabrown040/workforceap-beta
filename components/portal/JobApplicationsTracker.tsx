'use client';

import { useEffect, useState } from 'react';
import type { JobApplication } from '@/types/job-application';
import JobApplicationForm from './JobApplicationForm';
import JobApplicationKanban from './JobApplicationKanban';
import PortalEmptyState from './PortalEmptyState';
import ApplicationAiFeedbackPrompt from '@/components/portal/ApplicationAiFeedbackPrompt';
import type { RecentToolOption } from '@/components/portal/ApplicationAiFeedbackPrompt';
import { getErrorMessageFromResponse } from '@/lib/fetchWithTimeout';

interface JobApplicationsTrackerProps {
  userId: string;
}

export default function JobApplicationsTracker({ userId }: JobApplicationsTrackerProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{
    jobApplicationId: string;
    recentTools: RecentToolOption[];
  } | null>(null);

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch('/api/member/job-applications');
        if (!res.ok) {
          const msg = await getErrorMessageFromResponse(res);
          setError(msg);
          return;
        }
        const data = await res.json();
        setApplications(data);
        setError(null);
      } catch {
        setError("We couldn't load your applications. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleAddApplication = async (formData: Partial<JobApplication>) => {
    try {
      setError(null);
      const res = await fetch('/api/member/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const msg = await getErrorMessageFromResponse(res);
        setError(msg);
        return;
      }
      
      const payload = await res.json();
      const newApp = (payload.application ?? payload) as JobApplication;
      setApplications([newApp, ...applications]);
      setIsModalOpen(false);
      setError(null);
      if (payload.promptAiFeedback && payload.recentTools?.length && newApp.id) {
        setFeedbackPrompt({
          jobApplicationId: newApp.id,
          recentTools: payload.recentTools as RecentToolOption[],
        });
      } else {
        setFeedbackPrompt(null);
      }
    } catch {
      setError("We couldn't add this application. Please check your connection and try again.");
    }
  };

  const handleUpdateApplication = async (id: string, updates: Partial<JobApplication>) => {
    try {
      setError(null);
      const res = await fetch(`/api/member/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const msg = await getErrorMessageFromResponse(res);
        setError(msg);
        return;
      }
      
      const updated = await res.json();
      const nextApplication = updated.application ?? updated;
      setApplications(applications.map(app => app.id === id ? nextApplication : app));
      setError(null);
    } catch {
      setError("We couldn't update this application. Please check your connection and try again.");
    }
  };

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading your applications">
        <div className="wa-mb-6 wa-flex wa-justify-between wa-items-center">
          <div className="skeleton skeleton-text wa-h-6 wa-w-40" />
          <div className="skeleton skeleton-rounded wa-h-9 wa-w-36" />
        </div>
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 xl:wa-grid-cols-6 wa-gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="wa-space-y-3">
              <div className="skeleton skeleton-text wa-h-8" />
              <div className="skeleton skeleton-rounded wa-h-24" />
              {i % 2 === 0 && <div className="skeleton skeleton-rounded wa-h-24" />}
            </div>
          ))}
        </div>
        <span className="wa-sr-only">Loading applications…</span>
      </div>
    );
  }

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="wa-mb-6 wa-p-4 wa-rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--wa-danger, #dc2626) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--wa-danger, #dc2626) 30%, transparent)",
            color: "var(--wa-danger, #dc2626)",
          }}
        >
          {error}
        </div>
      )}

      {feedbackPrompt ? (
        <ApplicationAiFeedbackPrompt
          jobApplicationId={feedbackPrompt.jobApplicationId}
          recentTools={feedbackPrompt.recentTools}
          onDone={() => setFeedbackPrompt(null)}
          onSkip={() => setFeedbackPrompt(null)}
        />
      ) : null}

      {/* Header with Button */}
      <div className="wa-mb-6 wa-flex wa-justify-between wa-items-center">
        <div>
          <h2 className="wa-text-xl wa-font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {applications.length} Application{applications.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button type="button"
          onClick={() => setIsModalOpen(true)}
          className="wa-px-4 wa-py-2 wa-text-white wa-rounded-lg hover:wa-opacity-90 wa-transition-opacity wa-font-medium focus-visible:wa-outline-none focus-visible:wa-ring-2 focus-visible:wa-ring-[var(--color-accent)] focus-visible:wa-ring-offset-1"
          style={{ background: "var(--color-accent-dark, #6b0c29)" }}
        >
          + Add Application
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <JobApplicationForm
          onSubmit={handleAddApplication}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Kanban */}
      {applications.length === 0 ? (
        <PortalEmptyState
          title="No applications yet"
          description="Track roles you apply to—add one manually or apply from the job board."
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
