'use client';

import { JobApplication, JobApplicationStatus } from '@prisma/client';
import JobApplicationCard from './JobApplicationCard';

interface JobApplicationKanbanProps {
  applications: JobApplication[];
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}

const STATUSES: JobApplicationStatus[] = ['APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER'];

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone Screen',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  SAVED: 'Saved',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<JobApplicationStatus, { bg: string; badge: string; text: string }> = {
  APPLIED: { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', text: 'text-gray-600' },
  PHONE_SCREEN: { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
  INTERVIEWING: { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
  OFFER: { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
  SAVED: { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', text: 'text-gray-600' },
  REJECTED: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', text: 'text-red-600' },
};

export default function JobApplicationKanban({
  applications,
  onStatusChange,
}: JobApplicationKanbanProps) {
  const grouped = STATUSES.reduce(
    (acc, status) => {
      acc[status] = applications.filter(app => app.status === status);
      return acc;
    },
    {} as Record<JobApplicationStatus, JobApplication[]>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUSES.map(status => (
        <div key={status} className={`${STATUS_COLORS[status].bg} rounded-lg p-4 min-h-[500px]`}>
          {/* Column Header */}
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              {STATUS_LABELS[status]}
            </h3>
            <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[status].badge}`}>
              {grouped[status].length}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {grouped[status].length === 0 ? (
              <div className={`p-4 text-center text-sm ${STATUS_COLORS[status].text} border border-dashed border-gray-300 rounded`}>
                No applications
              </div>
            ) : (
              grouped[status].map(app => (
                <JobApplicationCard
                  key={app.id}
                  application={app}
                  onStatusChange={onStatusChange}
                  availableStatuses={STATUSES}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
