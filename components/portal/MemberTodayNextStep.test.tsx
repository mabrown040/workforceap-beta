/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MemberDoThisNextCard from '@/components/portal/MemberDoThisNextCard';
import MemberNextStepsStrip from '@/components/portal/MemberNextStepsStrip';
import type { NextBestAction } from '@/lib/member/nextBestActions';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      todayFocus: 'Today',
      doThisNext: 'Do this next',
      alsoForYou: 'Also for you',
      alsoForYouHint: 'Other helpful next steps',
      recommendedNextStep: 'Recommended next step',
      yourNextStepsTitle: 'Your next steps',
      startHereBasedOnProgress: 'Start here based on your progress',
      pickedForYou: 'Picked for you based on your progress',
      dismissAction: 'Dismiss',
      startHere: 'Start here',
    };
    return map[key] ?? key;
  },
}));

vi.mock('@/lib/analytics/events', () => ({
  trackFunnelEvent: vi.fn(),
}));

vi.mock('@/lib/events/client', () => ({
  postMemberEvent: vi.fn(),
}));

const sampleAction: NextBestAction = {
  id: 'action-1',
  title: 'Continue your next course',
  body: 'Pick up where you left off in training.',
  href: '/dashboard/learning',
  cta: 'Open course',
  variant: 'default',
  weight: 10,
};

describe('MemberDoThisNextCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels the primary CTA as Today', () => {
    render(<MemberDoThisNextCard action={sampleAction} paddingX="0" />);
    expect(screen.getByLabelText('Today')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open course' })).toHaveAttribute('href', '/dashboard/learning');
  });
});

describe('MemberNextStepsStrip', () => {
  it('demotes secondary strip copy and CTA style', () => {
    render(
      <MemberNextStepsStrip
        actions={[sampleAction]}
        prominence="secondary"
      />,
    );
    expect(screen.getByText('Also for you')).toBeInTheDocument();
    expect(screen.getByText('Other helpful next steps')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Open course' });
    expect(cta.className).toContain('btn-muted');
    expect(cta.className).not.toContain('btn-primary');
  });

  it('keeps primary strip CTA emphasis when not demoted', () => {
    render(<MemberNextStepsStrip actions={[sampleAction]} prominence="primary" />);
    expect(screen.getByText('Your next steps')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Open course' });
    expect(cta.className).toContain('btn-primary');
  });
});
