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
      <div className="wa-flex wa-items-center wa-justify-center wa-py-12">
        <p className="wa-text-gray-500">Loading applications...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="wa-mb-6 wa-p-4 wa-bg-red-50 wa-border wa-border-red-200 wa-rounded-lg wa-text-red-700">
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
          <h2 className="wa-text-xl wa-font-semibold wa-text-gray-900">
            {applications.length} Application{applications.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button type="button"
          onClick={() => setIsModalOpen(true)}
          className="wa-px-4 wa-py-2 wa-bg-[#8c0f37] wa-text-white wa-rounded-lg hover:wa-bg-[#6b0a2a] wa-transition-colors wa-font-medium"
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
