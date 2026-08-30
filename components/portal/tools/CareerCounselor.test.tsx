import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CareerCounselor from './CareerCounselor';

type SessionCallbacks = {
  onConnect?: () => void;
  onMessage?: (event: unknown) => void;
};

const voice = vi.hoisted(() => ({
  callbacks: null as SessionCallbacks | null,
  endSession: vi.fn(),
  startSession: vi.fn(),
}));

vi.mock('@elevenlabs/client', () => ({
  Conversation: { startSession: voice.startSession },
}));

vi.mock('./ToolFollowThrough', () => ({
  default: () => null,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function startVoiceSession() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));
  await screen.findByRole('button', { name: /End Session/i });
}

describe('CareerCounselor transcript persistence feedback', () => {
  beforeEach(() => {
    voice.callbacks = null;
    voice.endSession.mockReset();
    voice.startSession.mockReset();
    voice.startSession.mockImplementation(async (callbacks: SessionCallbacks) => {
      voice.callbacks = callbacks;
      callbacks.onConnect?.();
      return { endSession: voice.endSession };
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows no action plan when transcript persistence fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ signedUrl: 'wss://example.test/session' }))
      .mockResolvedValueOnce(jsonResponse({
        saved: false,
        error: 'Your transcript could not be saved, so no action plan was created. Please try again.',
      }, 500));

    render(<CareerCounselor firstName="Ada" />);
    await startVoiceSession();

    act(() => {
      voice.callbacks?.onMessage?.({ role: 'user', message: 'I need help with my next training step.' });
      voice.callbacks?.onMessage?.({ role: 'agent', message: 'Let us choose one action for today.' });
    });
    fireEvent.click(screen.getByRole('button', { name: /End Session/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/transcript could not be saved/i);
    expect(screen.queryByRole('heading', { name: /action plan/i })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith('/api/counselor/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        transcript: [
          { role: 'user', text: 'I need help with my next training step.' },
          { role: 'agent', text: 'Let us choose one action for today.' },
        ],
      }),
    }));
  });

  it('does not claim a saved plan when the session captured no transcript', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ signedUrl: 'wss://example.test/session' }));

    render(<CareerCounselor />);
    await startVoiceSession();
    fireEvent.click(screen.getByRole('button', { name: /End Session/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no conversation transcript was captured/i);
    expect(screen.queryByRole('heading', { name: /action plan/i })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('shows the action plan only after the API confirms it was saved', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ signedUrl: 'wss://example.test/session' }))
      .mockResolvedValueOnce(jsonResponse({
        saved: true,
        steps: ['Open My Program and finish the next lesson.'],
      }));

    render(<CareerCounselor />);
    await startVoiceSession();
    act(() => {
      voice.callbacks?.onMessage?.({ role: 'user', message: 'I want to continue training.' });
    });
    fireEvent.click(screen.getByRole('button', { name: /End Session/i }));

    expect(await screen.findByRole('heading', { name: /action plan/i })).toBeVisible();
    expect(screen.getByText('Open My Program and finish the next lesson.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
