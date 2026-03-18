'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramCourse } from '@/lib/content/programs';

type TrainingCourseListProps = {
  courses: ProgramCourse[];
  completedSlugs: string[];
};

export default function TrainingCourseList({ courses, completedSlugs }: TrainingCourseListProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const completedSet = new Set(completedSlugs);

  const getStatus = (slug: string): 'complete' | 'in_progress' | 'not_started' => {
    if (completedSet.has(slug)) return 'complete';
    return 'not_started';
  };

  const handleMarkComplete = async (slug: string) => {
    setMarking(slug);
    try {
      const res = await fetch('/api/member/courses/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: slug }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMarking(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {courses.map((c) => {
        const status = getStatus(c.slug);
        const isComplete = status === 'complete';
        return (
          <div
            key={c.slug}
            style={{
              padding: '1.25rem',
              border: '1px solid var(--color-border, #e5e5e5)',
              borderRadius: 'var(--radius-md)',
              background: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{c.name}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>~{c.estimatedHours} hrs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  background: isComplete ? 'rgba(74, 155, 79, 0.15)' : '#f0f0f0',
                  color: isComplete ? 'var(--color-accent)' : 'var(--color-gray-600)',
                }}
              >
                {isComplete ? 'Complete' : 'Not Started'}
              </span>
              <a
                href="https://coursera.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Open in Coursera
              </a>
              {!isComplete && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => handleMarkComplete(c.slug)}
                  disabled={!!marking}
                >
                  {marking === c.slug ? '...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
