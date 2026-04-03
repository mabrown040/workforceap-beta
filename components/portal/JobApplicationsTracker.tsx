'use client';

import { useEffect, useState } from 'react';
import { JobApplication } from '@prisma/client';
import JobApplicationForm from './JobApplicationForm';
import JobApplicationKanban from './JobApplicationKanban';

interface JobApplicationsTrackerProps {
  userId: string;
}

export default function JobApplicationsTracker({ userId }: JobApplicationsTrackerProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/member/job-applications');
        if (!res.ok) throw new Error('Failed to fetch applications');
        const data = await res.json();
        setApplications(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
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

      if (!res.ok) throw new Error('Failed to create application');
      
      const newApp = await res.json();
      setApplications([newApp, ...applications]);
      setIsModalOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdateApplication = async (id: string, updates: Partial<JobApplication>) => {
    try {
      const res = await fetch(`/api/member/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update application');
      
      const updated = await res.json();
      const nextApplication = updated.application ?? updated;
      setApplications(applications.map(app => app.id === id ? nextApplication : app));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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

      {/* Header with Button */}
      <div className="wa-mb-6 wa-flex wa-justify-between wa-items-center">
        <div>
          <h2 className="wa-text-xl wa-font-semibold wa-text-gray-900">
            {applications.length} Application{applications.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button
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
        <div className="wa-text-center wa-py-12 wa-border-2 wa-border-dashed wa-border-gray-300 wa-rounded-lg">
          <p className="wa-text-gray-500 wa-mb-3">No applications yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="wa-text-[#8c0f37] wa-font-medium hover:wa-underline"
          >
            Add your first application
          </button>
        </div>
      ) : (
        <JobApplicationKanban
          applications={applications}
          onStatusChange={handleUpdateApplication}
        />
      )}
    </div>
  );
}
