'use client';

import Link from 'next/link';
import TrainingCourseList from '@/components/portal/TrainingCourseList';
import type { ProgramCourse } from '@/lib/content/programs';

type LearningHubEnrolledCoursesProps = {
  programTitle: string | null;
  courses: ProgramCourse[];
  completedSlugs: string[];
  assessmentCompleted: boolean;
  variant?: 'mobile' | 'desktop';
};

export default function LearningHubEnrolledCourses({
  programTitle,
  courses,
  completedSlugs,
  assessmentCompleted,
  variant = 'desktop',
}: LearningHubEnrolledCoursesProps) {
  const isMobile = variant === 'mobile';
  const wrapStyle = isMobile
    ? { margin: '0 1.5rem 1.5rem' }
    : { marginBottom: 'var(--space-8)' };

  if (!programTitle || courses.length === 0) {
    return (
      <section style={wrapStyle}>
        <div
          className="wa-bg-[#f2eeed] wa-md:wa-bg-[var(--surface-container)]"
          style={{
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: isMobile ? undefined : '1px solid var(--outline-variant)',
          }}
        >
          <h3
            className={isMobile ? 'wa-text-lg wa-font-bold wa-text-[#1c1b1b]' : undefined}
            style={
              isMobile
                ? { marginBottom: '0.5rem' }
                : { fontSize: 'var(--font-size-h4)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }
            }
          >
            Enrolled classes
          </h3>
          <p
            className={isMobile ? 'wa-text-sm wa-text-[#584144]' : undefined}
            style={isMobile ? { marginBottom: '1rem' } : { color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}
          >
            When you enroll in a program, your Coursera course list appears here with progress. Choose a track on{' '}
            <strong>My Program</strong> to get started.
          </p>
          <Link href="/dashboard/program" className="btn btn-primary">
            Go to My Program
          </Link>
        </div>
      </section>
    );
  }

  const completedInProgram = completedSlugs.filter((s) => courses.some((c) => c.slug === s)).length;
  const pct = courses.length > 0 ? Math.round((completedInProgram / courses.length) * 100) : 0;

  return (
    <section style={wrapStyle}>
      <div
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          padding: isMobile ? '1.25rem' : 'var(--space-6)',
          border: '1px solid var(--outline-variant)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-accent)',
                marginBottom: '0.25rem',
              }}
            >
              Enrolled classes
            </p>
            <h3 style={{ fontSize: isMobile ? '1.125rem' : 'var(--font-size-h3)', fontWeight: 700, margin: 0 }}>
              {programTitle}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.35rem' }}>
              {completedInProgram} of {courses.length} courses marked complete · {pct}%
            </p>
          </div>
          <Link href="/dashboard/training" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
            Open Training page
          </Link>
        </div>

        {!assessmentCompleted ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
            Complete your skills assessment to unlock full training access.{' '}
            <Link href="/dashboard/skills-assessment" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Skills assessment
            </Link>
          </p>
        ) : null}

        <TrainingCourseList courses={courses} completedSlugs={completedSlugs} />
      </div>
    </section>
  );
}
