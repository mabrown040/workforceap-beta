'use client';

import type { JobReadinessIssue } from '@/lib/employer/jobReadiness';
import { scrollBehavior } from '@/lib/a11y/scrollBehavior';

const READINESS_TARGET_IDS: Record<JobReadinessIssue['target'], string> = {
  location: 'job-form-target-location',
  salary: 'job-form-target-salary',
  description: 'job-form-target-description',
  requirements: 'job-form-target-requirements',
  suggestedPrograms: 'job-form-target-suggested-programs',
};

function focusWithinTarget(target: HTMLElement) {
  const focusable = target.matches('input, textarea, select, button, [tabindex]:not([tabindex="-1"])')
    ? target
    : target.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');

  focusable?.focus({ preventScroll: true });
}

export default function JobReadinessIssueList({ issues }: { issues: JobReadinessIssue[] }) {
  const handleClick = (issue: JobReadinessIssue) => {
    const targetId = READINESS_TARGET_IDS[issue.target];
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    window.history.replaceState(null, '', `#${targetId}`);
    window.setTimeout(() => focusWithinTarget(target), 160);
  };

  return (
    <ul className="employer-job-edit-readiness__list">
      {issues.map((issue) => (
        <li key={issue.key}>
          <button type="button" className="employer-job-edit-readiness__issue-button" onClick={() => handleClick(issue)}>
            <span className="employer-job-edit-readiness__issue-message">{issue.message}</span>
            <span className="employer-job-edit-readiness__issue-action">{issue.action} →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
