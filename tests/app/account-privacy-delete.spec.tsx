import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The privacy page (`/account/privacy`, the page the privacy policy links
// members to) deletes through POST /api/gdpr/delete, which re-authenticates
// with the member's password before erasing anything.

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import PrivacySettingsPage from '@/app/(portal)/account/privacy/page';

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('/account/privacy — Delete My Account', () => {
  const calls: FetchCall[] = [];
  let deleteResponse: () => Response;

  beforeEach(() => {
    calls.length = 0;
    deleteResponse = () => jsonResponse({ ok: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        if (url === '/api/gdpr/consent') return jsonResponse({ consentCommunications: false });
        if (url === '/api/gdpr/delete') return deleteResponse();
        return jsonResponse({}, 404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function openConfirm() {
    fireEvent.click(screen.getByRole('button', { name: 'deleteButton' }));
    return screen.getByRole('button', { name: 'deleteConfirmYes' });
  }

  it('sends the password the deletion route re-authenticates with, as JSON', async () => {
    render(<PrivacySettingsPage />);
    const confirm = openConfirm();

    fireEvent.change(screen.getByLabelText('deletePasswordLabel'), { target: { value: 'hunter2' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(calls.some((c) => c.url === '/api/gdpr/delete')).toBe(true));
    const call = calls.find((c) => c.url === '/api/gdpr/delete')!;
    expect(call.init?.method).toBe('POST');
    expect(new Headers(call.init?.headers).get('content-type')).toMatch(/application\/json/);
    expect(JSON.parse(String(call.init?.body))).toEqual({ password: 'hunter2' });
    expect(await screen.findByText('deleteSuccess')).toBeInTheDocument();
  });

  it('does not call the deletion route until a password is entered', async () => {
    render(<PrivacySettingsPage />);
    const confirm = openConfirm();

    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(calls.some((c) => c.url === '/api/gdpr/consent')).toBe(true));

    expect(calls.some((c) => c.url === '/api/gdpr/delete')).toBe(false);
  });

  it("shows the route's own message when it refuses the request", async () => {
    deleteResponse = () =>
      jsonResponse({ error: 'Incorrect password. Account deletion cancelled.' }, 403);
    render(<PrivacySettingsPage />);
    const confirm = openConfirm();

    fireEvent.change(screen.getByLabelText('deletePasswordLabel'), { target: { value: 'wrong' } });
    fireEvent.click(confirm);

    expect(await screen.findByText('Incorrect password. Account deletion cancelled.')).toBeInTheDocument();
    expect(screen.queryByText('deleteSuccess')).not.toBeInTheDocument();
  });
});
