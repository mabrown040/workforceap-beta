import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import WorkforceApModuleLessons from '@/components/portal/WorkforceApModuleLessons';

afterEach(cleanup);

const LESSONS = [
  {
    title: 'Getting Started on a Computer',
    minutes: 21,
    url: 'https://www.digitallearn.org/courses/getting-started-on-a-computer',
  },
  {
    title: 'Basic Search',
    minutes: 7,
    url: 'https://www.digitallearn.org/courses/basic-search',
  },
];

describe('WorkforceAP module lesson CTAs', () => {
  it('makes the first lesson a kit CTA button, not a naked title link', () => {
    render(<WorkforceApModuleLessons lessons={LESSONS} />);

    const start = screen.getByRole('link', { name: /start this lesson/i });
    expect(start).toHaveClass('wa-kit-cta');
    expect(start).toHaveClass('wa-kit-cta--xl');
    expect(start).toHaveAttribute('href', LESSONS[0].url);
    expect(start).toHaveAttribute('target', '_blank');
    expect(start).toHaveTextContent('Start this lesson');
    expect(start).not.toHaveTextContent(LESSONS[0].title);

    const title = screen.getByText(LESSONS[0].title);
    expect(title.closest('a')).toBeNull();
  });

  it('keeps later lessons outline so Start is the only filled CTA', () => {
    render(<WorkforceApModuleLessons lessons={LESSONS} />);

    const start = screen.getByRole('link', { name: /start this lesson/i });
    expect(start).not.toHaveClass('wa-kit-cta--ghost');

    const open = screen.getByRole('link', { name: /open this lesson/i });
    expect(open).toHaveClass('wa-kit-cta');
    expect(open).toHaveClass('wa-kit-cta--ghost');
    expect(open).toHaveAttribute('href', LESSONS[1].url);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveTextContent('Open this lesson');
    expect(open).not.toHaveTextContent(LESSONS[1].title);

    const title = screen.getByText(LESSONS[1].title);
    expect(title.closest('a')).toBeNull();
  });
});
