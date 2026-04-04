'use client';

import { useState } from 'react';
import { JobApplication, JobApplicationStatus } from '@prisma/client';
import JobApplicationCard from './JobApplicationCard';

interface JobApplicationKanbanProps {
  applications: JobApplication[];
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}

/** Full pipeline including saved leads and rejections (curated board "track only" lands in Saved). */
const STATUSES: JobApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'PHONE_SCREEN',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
];

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
  SAVED: { bg: 'bg-slate-50', badge: 'bg-slate-200 text-slate-800', text: 'text-slate-600' },
  REJECTED: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', text: 'text-red-600' },
};

const STATUS_BADGE_CLASSES: Record<JobApplicationStatus, string> = {
  APPLIED: 'wa-bg-gray-100 wa-text-gray-700',
  PHONE_SCREEN: 'wa-bg-blue-100 wa-text-blue-700',
  INTERVIEWING: 'wa-bg-amber-100 wa-text-amber-700',
  OFFER: 'wa-bg-green-100 wa-text-green-700',
  SAVED: 'wa-bg-slate-200 wa-text-slate-800',
  REJECTED: 'wa-bg-red-100 wa-text-red-700',
};

function MobileApplicationCard({
  application,
  onStatusChange,
}: {
  application: JobApplication;
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(application.status);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (selectedStatus !== application.status) {
      onStatusChange(application.id, { status: selectedStatus });
    }
    setOpen(false);
  };

  return (
    <div
      style={{
        background: 'var(--surface-container)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-2">
        <div className="wa-flex-1 wa-min-w-0">
          <p className="wa-font-bold wa-text-sm wa-text-gray-900 wa-truncate">{application.role}</p>
          <p className="wa-text-xs wa-text-gray-600 wa-mt-0.5">{application.company}</p>
          {application.appliedAt && (
            <p className="wa-text-xs wa-text-gray-500 wa-mt-1">Applied {formatDate(application.appliedAt)}</p>
          )}
        </div>
        <span
          className={`wa-shrink-0 wa-text-xs wa-font-semibold wa-px-2 wa-py-1 wa-rounded-full ${STATUS_BADGE_CLASSES[application.status]}`}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      {open ? (
        <div className="wa-mt-3 wa-border-t wa-pt-3">
          <label className="wa-block wa-text-xs wa-font-bold wa-uppercase wa-text-gray-700 wa-mb-1">Update Status</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as JobApplicationStatus)}
            className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded wa-text-sm wa-mb-3"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div className="wa-flex wa-gap-2">
            <button
              onClick={handleSave}
              className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-[#8c0f37] wa-text-white wa-text-sm wa-font-medium wa-rounded hover:wa-bg-[#6b0a2a]"
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-gray-200 wa-text-gray-700 wa-text-sm wa-font-medium wa-rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="wa-mt-3 wa-text-xs wa-text-[#8c0f37] wa-font-medium hover:wa-underline"
        >
          Update Status
        </button>
      )}
    </div>
  );
}

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
    <>
    {/* Mobile card list — hidden on md+ */}
    <div className="wa-block wa-md:wa-hidden">
      {applications.length === 0 ? (
        <div className="wa-text-center wa-py-12 wa-border-2 wa-border-dashed wa-border-gray-300 wa-rounded-lg">
          <p className="wa-text-gray-500">No applications yet.</p>
        </div>
      ) : (
        <div>
          {STATUSES.map(status => {
            const group = grouped[status];
            if (group.length === 0) return null;
            return (
              <div key={status} className="wa-mb-4">
                <div className="wa-flex wa-items-center wa-gap-2 wa-mb-2">
                  <span className={`wa-text-xs wa-font-bold wa-uppercase wa-tracking-wide wa-px-2 wa-py-0.5 wa-rounded-full ${STATUS_BADGE_CLASSES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="wa-text-xs wa-text-gray-500">{group.length}</span>
                </div>
                {group.map(app => (
                  <MobileApplicationCard key={app.id} application={app} onStatusChange={onStatusChange} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Desktop kanban — hidden on mobile */}
    <div className="wa-hidden wa-md:wa-block">
    <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 xl:wa-grid-cols-6 wa-gap-4">
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
    </div>
    </>
  );
}
