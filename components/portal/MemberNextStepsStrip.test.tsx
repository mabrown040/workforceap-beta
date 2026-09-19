import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MemberNextStepsStrip from './MemberNextStepsStrip';
import type { NextBestAction } from '@/lib/member/nextBestActions';

/**
 * Dismissing a next-step card is optimistic: the card hides and PATCH
 * /api/member/nba/{id} records it. The failure used to be swallowed, so a
 * rejected dismissal only showed up as the card coming back on the next
 * page load. The card must return as soon as the server says no.
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === 'dismissAction' ? `Dismiss ${values?.title ?? ''}` : key,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/events/client', () => ({ postMemberEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/analytics/events', () => ({ trackFunnelEvent: vi.fn() }));

const action: NextBestAction = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Finish your profile',
  body: 'Two fields left.',
  href: '/dashboard/profile',
  cta: 'Open profile',
  variant: 'default',
  weight: 10,
};

describe('MemberNextStepsStrip — dismiss', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('puts the card back when the server rejects the dismissal', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const user = userEvent.setup();

    render(<MemberNextStepsStrip actions={[action]} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss Finish your profile' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/member/nba/${action.id}`, { method: 'PATCH' }),
    );
    await waitFor(() => expect(screen.getByText('Finish your profile')).toBeInTheDocument());
  });

  it('puts the card back when the request never reaches the server', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();

    render(<MemberNextStepsStrip actions={[action]} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss Finish your profile' }));

    await waitFor(() => expect(screen.getByText('Finish your profile')).toBeInTheDocument());
  });

  it('keeps the card hidden when the server records the dismissal', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();

    render(<MemberNextStepsStrip actions={[action]} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss Finish your profile' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    // Give a wrongly-triggered restore a tick to run before asserting.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Finish your profile')).toBeNull();
  });
});
