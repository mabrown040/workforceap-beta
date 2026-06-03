'use client';

import type { CSSProperties, ReactNode } from 'react';

import { logCourseraLaunchFromPortal } from '@/app/(portal)/dashboard/_actions/analyticsActions';
import { trackLearningMilestone } from '@/lib/analytics/events';

type TrackedCourseraLaunchLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  /** When set, included in analytics payload for course-level launches. */
  courseSlug?: string | null;
};

export default function TrackedCourseraLaunchLink({
  href,
  children,
  className,
  style,
  courseSlug,
  'aria-label': ariaLabel,
}: TrackedCourseraLaunchLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={() => {
        void logCourseraLaunchFromPortal(courseSlug ?? undefined);
        trackLearningMilestone('course_launched', courseSlug ?? 'unknown');
      }}
    >
      {children}
    </a>
  );
}
