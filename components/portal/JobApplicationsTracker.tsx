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
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading applications...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Header with Button */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {applications.length} Application{applications.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#8c0f37] text-white rounded-lg hover:bg-[#6b0a2a] transition-colors font-medium"
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
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-3">No applications yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[#8c0f37] font-medium hover:underline"
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
