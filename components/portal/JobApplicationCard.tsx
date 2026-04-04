'use client';

import { useState } from 'react';
import Link from 'next/link';
import { JobApplication, JobApplicationStatus } from '@prisma/client';

interface JobApplicationCardProps {
  application: JobApplication;
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
  availableStatuses: JobApplicationStatus[];
}

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone Screen',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  SAVED: 'Saved',
  REJECTED: 'Rejected',
};

export default function JobApplicationCard({
  application,
  onStatusChange,
  availableStatuses,
}: JobApplicationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(application.status);
  const [notes, setNotes] = useState(application.notes || '');

  const handleStatusChange = async () => {
    if (selectedStatus !== application.status) {
      onStatusChange(application.id, { status: selectedStatus });
    }
    if (notes !== application.notes) {
      onStatusChange(application.id, { notes });
    }
    setIsEditing(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isEditing) {
    return (
      <div className="wa-bg-white wa-border-2 wa-border-[#8c0f37] wa-rounded-lg wa-p-4 wa-shadow-md">
        <div className="wa-mb-4">
          <label className="wa-block wa-text-xs wa-font-bold wa-uppercase wa-text-gray-700 wa-mb-2">Status</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as JobApplicationStatus)}
            className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded wa-text-sm"
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="wa-mb-4">
          <label className="wa-block wa-text-xs wa-font-bold wa-uppercase wa-text-gray-700 wa-mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded wa-text-sm"
            rows={3}
            placeholder="Add notes about this application..."
          />
        </div>

        <div className="wa-flex wa-gap-2">
          <button
            onClick={handleStatusChange}
            className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-[#8c0f37] wa-text-white wa-text-sm wa-font-medium wa-rounded hover:wa-bg-[#6b0a2a]"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-gray-200 wa-text-gray-700 wa-text-sm wa-font-medium wa-rounded hover:wa-bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="wa-bg-white wa-border wa-rounded-lg wa-p-3 wa-cursor-pointer hover:wa-shadow-md wa-transition-shadow"
    >
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-2 wa-mb-1">
        <h4 className="wa-font-bold wa-text-sm wa-text-gray-900">{application.role}</h4>
        {application.curatedJobId && (
          <span
            className="wa-shrink-0 wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-wide wa-px-2 wa-py-0.5 wa-rounded wa-bg-amber-100 wa-text-amber-900"
            title="From WorkforceAP Job Board"
          >
            Board
          </span>
        )}
      </div>
      <p className="wa-text-xs wa-text-gray-600 wa-mb-2">{application.company}</p>

      {application.curatedJobId && application.url && (
        <p className="wa-text-xs wa-mb-2">
          <Link
            href={application.url}
            className="wa-text-[#8c0f37] wa-font-medium hover:wa-underline"
            onClick={(e) => e.stopPropagation()}
          >
            View job posting →
          </Link>
        </p>
      )}

      {application.appliedAt && (
        <p className="wa-text-xs wa-text-gray-500 wa-mb-1">
          Applied {formatDate(application.appliedAt)} · {application.source}
        </p>
      )}

      {application.nextInterviewDate && (
        <p className="wa-text-xs wa-text-[#8c0f37] wa-font-medium wa-mb-2">
          🗓️ Interview: {formatDate(application.nextInterviewDate)}
        </p>
      )}

      {application.notes && (
        <p className="wa-text-xs wa-text-gray-600 wa-border-t wa-pt-2 wa-mt-2">{application.notes}</p>
      )}

      <p className="wa-text-xs wa-text-gray-400 wa-mt-2 wa-pt-2 wa-border-t">
        Click to edit
      </p>
    </div>
  );
}
