import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import PrivacySettingsPage from '@/app/(portal)/account/privacy/page';

const consentCheckbox = () => screen.getByRole('checkbox') as HTMLInputElement;

/** Resolves once the initial GET /api/gdpr/consent has hydrated the toggle. */
async function renderLoaded(initialConsent: boolean) {
  render(<PrivacySettingsPage />);
  await waitFor(() => expect(consentCheckbox().checked).toBe(initialConsent));
  await waitFor(() => expect(consentCheckbox().disabled).toBe(false));
}

describe('privacy settings — marketing consent toggle', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let patchResponse: Response | Error;

  beforeEach(() => {
    patchResponse = new Response(null, { status: 200 });
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/gdpr/consent' && (init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify({ consentTerms: true, consentCommunications: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/api/gdpr/consent' && init?.method === 'PATCH') {
        if (patchResponse instanceof Error) throw patchResponse;
        return patchResponse;
      }
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('keeps the toggle off and confirms when the server accepts the change', async () => {
    const user = userEvent.setup();
    await renderLoaded(true);

    await user.click(consentCheckbox());

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/gdpr/consent',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ consentCommunications: false }) }),
      ),
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('consentSuccess'));
    expect(consentCheckbox().checked).toBe(false);
  });

  it('does not report success and reverts the toggle when the server rejects the change', async () => {
    patchResponse = new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    const user = userEvent.setup();
    await renderLoaded(true);

    await user.click(consentCheckbox());

    // The stored consent record is unchanged, so the control must go back to it.
    await waitFor(() => expect(consentCheckbox().checked).toBe(true));
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('consentError');
    expect(banner).not.toHaveTextContent('consentSuccess');
  });

  it('does not report success and reverts the toggle when the request never reaches the server', async () => {
    patchResponse = new Error('network down');
    const user = userEvent.setup();
    await renderLoaded(true);

    await user.click(consentCheckbox());

    await waitFor(() => expect(consentCheckbox().checked).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent('consentError');
  });
});
