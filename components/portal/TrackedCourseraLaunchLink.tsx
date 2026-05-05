'use client';

import type { CSSProperties, ReactNode } from 'react';

import { logCourseraLaunchFromPortal } from '@/app/(portal)/dashboard/_actions/analyticsActions';

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
      }}
    >
      {children}
    </a>
  );
}
