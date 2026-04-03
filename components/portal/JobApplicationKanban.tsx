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
    <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-4 wa-gap-4">
      {STATUSES.map(status => (
        <div key={status} className={`${STATUS_COLORS[status].bg} wa-rounded-lg wa-p-4 wa-min-h-[500px]`}>
          {/* Column Header */}
          <div className="wa-mb-4">
            <h3 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-wide wa-text-gray-900">
              {STATUS_LABELS[status]}
            </h3>
            <span className={`wa-inline-block wa-mt-2 wa-px-3 wa-py-1 wa-text-xs wa-font-bold wa-rounded-full ${STATUS_COLORS[status].badge}`}>
              {grouped[status].length}
            </span>
          </div>

          {/* Cards */}
          <div className="wa-space-y-3">
            {grouped[status].length === 0 ? (
              <div className={`wa-p-4 wa-text-center wa-text-sm ${STATUS_COLORS[status].text} wa-border wa-border-dashed wa-border-gray-300 wa-rounded`}>
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
