import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import WorkforceApLessonCtas from './WorkforceApLessonCtas';

afterEach(cleanup);

const LESSONS = [
  {
    title: 'Getting Started on a Computer',
    minutes: 21,
    url: 'https://www.digitallearn.org/courses/getting-started-on-a-computer',
    verificationLabel: 'Verified public course page · 2026-09-12',
  },
  {
    title: 'Introduction: How to Begin to Create Documents',
    minutes: 4,
    url: 'https://www.digitallearn.org/courses/microsoft-word',
    fallbackUrl: 'https://training.digitallearn.org/courses/computer-basics-windows-10-87e0526c-b9a9-4d0b-9af2-e8db08ac85c0',
    fallbackLabel: 'Open DigitalLearn course materials instead',
  },
] as const;

describe('WorkforceApLessonCtas', () => {
  it('renders the first DigitalLearn destination as a big crimson Start this lesson button', () => {
    render(<WorkforceApLessonCtas lessons={LESSONS} />);

    const start = screen.getByRole('link', { name: /start this lesson/i });
    expect(start).toHaveAttribute('href', LESSONS[0].url);
    expect(start).toHaveAttribute('target', '_blank');
    expect(start).toHaveClass('wa-kit-cta', 'wa-kit-cta--lg', 'wa-kit-cta--block');
    expect(start).not.toHaveClass('wa-page-action');
    expect(screen.getByText(LESSONS[0].title)).toBeInTheDocument();
    expect(screen.getByText(/21 min/)).toBeInTheDocument();
  });

  it('keeps remaining lessons as stacked crimson buttons, not naked title links', () => {
    render(<WorkforceApLessonCtas lessons={LESSONS} />);

    const remaining = screen.getByRole('link', { name: `Open ${LESSONS[1].title}` });
    expect(remaining).toHaveAttribute('href', LESSONS[1].url);
    expect(remaining).toHaveClass('wa-kit-cta', 'wa-kit-cta--lg');
    expect(screen.queryByRole('link', { name: LESSONS[0].title })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: LESSONS[1].title })).not.toBeInTheDocument();
  });

  it('demotes a materials fallback to a ghost button so it cannot outrank Start', () => {
    render(<WorkforceApLessonCtas lessons={LESSONS} />);

    const fallback = screen.getByRole('link', { name: 'Open DigitalLearn course materials instead' });
    expect(fallback).toHaveAttribute('href', LESSONS[1].fallbackUrl);
    expect(fallback).toHaveClass('wa-kit-cta', 'wa-kit-cta--ghost');
    expect(fallback).not.toHaveClass('wa-kit-cta--lg');
  });
});
