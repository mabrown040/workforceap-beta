import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * `/admin/placements/new` used to render `String(err)` when the POST failed
 * before the app got an answer, so a dropped connection showed staff
 * "TypeError: Failed to fetch". It must show the shared plain copy instead.
 */

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('memberId=11111111-1111-4111-8111-111111111111'),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import RecordPlacementPage from '@/app/admin/placements/new/page';

/** The member id comes from the URL; the two required text fields still gate submit. */
async function fillRequiredFieldsAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  render(<RecordPlacementPage />);
  await user.type(screen.getByLabelText(/Employer Name/), 'Acme Corp');
  await user.type(screen.getByLabelText(/Job Title/), 'Help Desk Technician');
  await user.click(screen.getByRole('button', { name: 'Save Placement' }));
}

describe('record placement — failed request copy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    push.mockReset();
  });

  it('shows the plain connection copy, not the browser TypeError, when fetch rejects', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();

    await fillRequiredFieldsAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('connectionError');
    expect(alert.textContent).not.toMatch(/TypeError|Failed to fetch/);
    expect(push).not.toHaveBeenCalled();
  });

  it('still shows the server-provided error for a 4xx answer', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Employer name is required' }),
    } as Response);
    const user = userEvent.setup();

    await fillRequiredFieldsAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Employer name is required');
  });
});
