"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { JobApplication } from "@/types/job-application";
import {
  JOB_APPLICATION_PIPELINE_COLUMNS,
  type JobApplicationStatus,
} from "@/lib/jobApplications/constants";
import JobApplicationCard from "./JobApplicationCard";

interface JobApplicationKanbanProps {
  applications: JobApplication[];
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  SAVED: "Saved",
  REJECTED: "Rejected",
};

const STATUS_BADGE_CLASSES: Record<JobApplicationStatus, string> = {
  APPLIED: "wa-bg-gray-100 wa-text-gray-700",
  PHONE_SCREEN: "wa-bg-blue-100 wa-text-blue-700",
  INTERVIEWING: "wa-bg-amber-100 wa-text-amber-700",
  OFFER: "wa-bg-green-100 wa-text-green-700",
  ACCEPTED: "wa-bg-emerald-100 wa-text-emerald-800",
  SAVED: "wa-bg-slate-200 wa-text-slate-800",
  REJECTED: "wa-bg-red-100 wa-text-red-700",
};

/** Left accent on kanban cards / columns — WorkforceAP burgundy on Applied */
const STATUS_ACCENTS: Record<JobApplicationStatus, string> = {
  SAVED: "#64748b",
  APPLIED: "#8c0f37",
  PHONE_SCREEN: "#2563eb",
  INTERVIEWING: "#d97706",
  OFFER: "#16a34a",
  ACCEPTED: "#059669",
  REJECTED: "#dc2626",
};

function MobileApplicationCard({
  application,
  onStatusChange,
}: {
  application: JobApplication;
  onStatusChange: (id: string, updates: Partial<JobApplication>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(
    application.status,
  );

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSave = () => {
    if (selectedStatus !== application.status) {
      onStatusChange(application.id, { status: selectedStatus });
    }
    setOpen(false);
  };

  return (
    <div
      className="portal-kanban-card"
      style={
        {
          padding: "1rem",
          marginBottom: "0.75rem",
          "--portal-kanban-accent": STATUS_ACCENTS[application.status],
        } as CSSProperties
      }
    >
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-2">
        <div className="wa-flex-1 wa-min-w-0">
          <p
            className="wa-font-bold wa-text-sm wa-truncate"
            style={{ color: "var(--color-on-surface)" }}
          >
            {application.role}
          </p>
          <p
            className="wa-text-xs wa-mt-0.5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {application.company}
          </p>
          {application.appliedAt && (
            <p
              className="wa-text-xs wa-mt-1"
              style={{
                color: "var(--color-on-surface-variant)",
                opacity: 0.85,
              }}
            >
              Applied {formatDate(application.appliedAt)}
            </p>
          )}
        </div>
        <span
          className={`wa-shrink-0 wa-text-xs wa-font-semibold wa-px-2 wa-py-1 wa-rounded-full ${STATUS_BADGE_CLASSES[application.status]}`}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      {open ? (
        <div
          id={`mobile-status-panel-${application.id}`}
          className="wa-mt-3 wa-border-t wa-pt-3"
        >
          <label
            htmlFor={`mobile-status-${application.id}`}
            className="wa-block wa-text-xs wa-font-bold wa-uppercase wa-text-gray-700 wa-mb-1"
          >
            Update Status
          </label>
          <select
            id={`mobile-status-${application.id}`}
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as JobApplicationStatus)
            }
            className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded wa-text-sm wa-mb-3"
          >
            {JOB_APPLICATION_PIPELINE_COLUMNS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="wa-flex wa-gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-[#8c0f37] wa-text-white wa-text-sm wa-font-medium wa-rounded hover:wa-bg-[#6b0a2a]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="wa-flex-1 wa-px-3 wa-py-2 wa-bg-gray-200 wa-text-gray-700 wa-text-sm wa-font-medium wa-rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={`mobile-status-panel-${application.id}`}
          className="wa-mt-3 wa-text-xs wa-text-[#8c0f37] wa-font-medium hover:wa-underline focus-visible:wa-outline-none focus-visible:wa-ring-2 focus-visible:wa-ring-[#8c0f37] focus-visible:wa-ring-offset-1 wa-rounded-sm"
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
  const grouped = JOB_APPLICATION_PIPELINE_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = applications.filter((app) => app.status === status);
      return acc;
    },
    {} as Record<JobApplicationStatus, JobApplication[]>,
  );

  return (
    <>
      {/* Mobile card list — hidden on md+ */}
      <div className="wa-block md:wa-hidden">
        {applications.length === 0 ? (
          <div className="portal-kanban-mobile-empty">
            <p style={{ margin: 0 }}>No applications yet.</p>
          </div>
        ) : (
          <div>
            {JOB_APPLICATION_PIPELINE_COLUMNS.map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <div key={status} className="wa-mb-4">
                  <div className="wa-flex wa-items-center wa-gap-2 wa-mb-2">
                    <span
                      className={`wa-text-xs wa-font-bold wa-uppercase wa-tracking-wide wa-px-2 wa-py-0.5 wa-rounded-full ${STATUS_BADGE_CLASSES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="wa-text-xs wa-text-gray-500">
                      {group.length}
                    </span>
                  </div>
                  {group.map((app) => (
                    <MobileApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop kanban — hidden on mobile */}
      <div className="wa-hidden md:wa-block">
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 xl:wa-grid-cols-6 wa-gap-4">
          {JOB_APPLICATION_PIPELINE_COLUMNS.map((status) => (
            <div
              key={status}
              className="portal-kanban-column"
              style={
                {
                  "--portal-kanban-accent": STATUS_ACCENTS[status],
                } as CSSProperties
              }
            >
              <div className="portal-kanban-column__head">
                <span className="portal-kanban-column__title">
                  {STATUS_LABELS[status]}
                </span>
                <span className="portal-kanban-column__count">
                  {grouped[status].length}
                </span>
              </div>

              <div className="wa-space-y-3">
                {grouped[status].length === 0 ? (
                  <div className="portal-kanban-empty">No applications</div>
                ) : (
                  grouped[status].map((app) => (
                    <JobApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={onStatusChange}
                      availableStatuses={[...JOB_APPLICATION_PIPELINE_COLUMNS]}
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
