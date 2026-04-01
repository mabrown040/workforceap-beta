'use client';

import { useState } from 'react';
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
      <div className="bg-white border-2 border-[#8c0f37] rounded-lg p-4 shadow-md">
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-gray-700 mb-2">Status</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as JobApplicationStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={3}
            placeholder="Add notes about this application..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStatusChange}
            className="flex-1 px-3 py-2 bg-[#8c0f37] text-white text-sm font-medium rounded hover:bg-[#6b0a2a]"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300"
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
      className="bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <h4 className="font-bold text-sm text-gray-900">{application.role}</h4>
      <p className="text-xs text-gray-600 mb-2">{application.company}</p>

      {application.appliedAt && (
        <p className="text-xs text-gray-500 mb-1">
          Applied {formatDate(application.appliedAt)} · {application.source}
        </p>
      )}

      {application.nextInterviewDate && (
        <p className="text-xs text-[#8c0f37] font-medium mb-2">
          🗓️ Interview: {formatDate(application.nextInterviewDate)}
        </p>
      )}

      {application.notes && (
        <p className="text-xs text-gray-600 border-t pt-2 mt-2">{application.notes}</p>
      )}

      <p className="text-xs text-gray-400 mt-2 pt-2 border-t">
        Click to edit
      </p>
    </div>
  );
}
