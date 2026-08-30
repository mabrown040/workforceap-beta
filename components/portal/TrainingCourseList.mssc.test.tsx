import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PROGRAMS } from '@/lib/content/programs';
import TrainingCourseList from './TrainingCourseList';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/components/portal/TrackedCourseraLaunchLink', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href} data-testid="coursera-launch">
      {children}
    </a>
  ),
}));

describe.each([
  'certified-production-technician-cpt',
  'certified-logistics-technician-clt',
])('%s training CTAs', (programSlug) => {
  it('opens every course as a local WorkforceAP module and never renders a Coursera CTA', () => {
    const program = PROGRAMS.find((candidate) => candidate.slug === programSlug);
    expect(program).toBeDefined();

    render(
      <TrainingCourseList
        courses={program!.courses}
        completedSlugs={[]}
        programSlug={programSlug}
      />,
    );

    const localLinks = screen.getAllByRole('link', {
      name: /Open WorkforceAP module:/i,
    });
    expect(localLinks).toHaveLength(program!.courses.length);
    for (const [index, link] of localLinks.entries()) {
      const course = program!.courses[index]!;
      expect(link).toHaveAttribute(
        'href',
        `/dashboard/learning/modules/${course.slug}?program=${programSlug}`,
      );
    }

    expect(screen.queryByTestId('coursera-launch')).not.toBeInTheDocument();
    expect(screen.queryByText(/Coursera/i)).not.toBeInTheDocument();
  });
});
