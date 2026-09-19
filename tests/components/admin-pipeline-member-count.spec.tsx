import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PipelineLegacyView from '@/app/admin/pipeline/PipelineLegacyView';
import { pickAdminClientMessages } from '@/lib/i18n/pickRootClientMessages';
import messages from '@/messages/en.json';

// The banner imports a server action; it is not under test here.
vi.mock('@/app/admin/pipeline/StaleApplicationsBanner', () => ({ default: () => null }));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      if (input === '/api/admin/pipeline/at-risk-stats') {
        return jsonResponse({
          criticalCount: 2,
          alertsSentToday: 1,
          counselorsWithPending: [
            { name: 'Counselor One', email: 'counselor.one@example.com', memberCount: 3 },
            { name: 'Counselor Two', email: 'counselor.two@example.com', memberCount: 1 },
          ],
        });
      }
      if (input === '/api/admin/pipeline') return jsonResponse({ counts: { holding: 4 } });
      return jsonResponse({ staleApps: [] });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('admin pipeline legacy view: counselors with pending alerts', () => {
  it('renders a translated member count instead of the raw admin.memberCount key', async () => {
    const onError = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={pickAdminClientMessages(messages)} onError={onError}>
        <PipelineLegacyView />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Counselor One')).toBeTruthy());

    expect(screen.getByText('3 members')).toBeTruthy();
    expect(screen.getByText('1 member')).toBeTruthy();
    expect(screen.queryByText(/admin\.memberCount/)).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
