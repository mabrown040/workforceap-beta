import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import InterviewCoach from './InterviewCoach';

const CONNECTION_COPY = messages.common.connectionError;

function renderCoach(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="America/New_York">
      {ui}
    </NextIntlClientProvider>,
  );
}

const voice = vi.hoisted(() => ({ startSession: vi.fn(), endSession: vi.fn() }));
vi.mock('@elevenlabs/client', () => ({ Conversation: { startSession: voice.startSession } }));
vi.mock('./ToolFollowThrough', () => ({ default: () => null }));

describe('InterviewCoach personalized voice session', () => {
  beforeEach(() => {
    voice.startSession.mockReset();
    voice.endSession.mockReset();
    voice.startSession.mockResolvedValue({ endSession: voice.endSession });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('delivers server-returned role, language, and member context with the signed connection', async () => {
    const dynamicVariables = {
      target_role: 'Security Analyst', interview_type: 'technical', member_name: 'Ada',
      response_language: 'es', experience_level: 'entry', coach_memory_summary: 'Practice explaining incident triage.',
      interview_greeting: 'Hola. Soy tu coach de entrevistas de WorkforceAP.',
      interview_eligible: true, completed_interviews: 2,
    };
    vi.mocked(fetch).mockImplementation(async input => String(input).startsWith('/api/interview/history')
      ? Response.json({ sessions: [] })
      : Response.json({ mode: 'voice', signedUrl: 'wss://example.test/interview', sessionId: 'session-1', dynamicVariables }));

    renderCoach(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Technical' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    await waitFor(() => expect(voice.startSession).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith('/api/interview/session', expect.objectContaining({
      body: JSON.stringify({ role: 'Security Analyst', interviewType: 'technical', forceText: false }),
    }));
    expect(voice.startSession.mock.calls[0][0]).toMatchObject({
      signedUrl: 'wss://example.test/interview', dynamicVariables,
    });
    expect(voice.startSession.mock.calls[0][0]).not.toHaveProperty('overrides');
  });

  it('does not silently reconnect without context when the personalized connection fails', async () => {
    vi.mocked(fetch).mockImplementation(async input => String(input).startsWith('/api/interview/history')
      ? Response.json({ sessions: [] })
      : Response.json({ mode: 'voice', signedUrl: 'wss://example.test/interview', sessionId: 'session-1', dynamicVariables: { target_role: 'Security Analyst' } }));
    voice.startSession.mockRejectedValue(new Error('Personalized context unavailable'));
    renderCoach(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    await screen.findByText(/Personalized context unavailable/);
    expect(voice.startSession).toHaveBeenCalledTimes(1);
  });
});

describe('InterviewCoach text-mode request failures', () => {
  const history = Response.json({ sessions: [] });
  const textSession = () => Response.json({ mode: 'text', firstQuestion: 'Tell me about yourself.', sessionId: 'session-1' });

  beforeEach(() => {
    voice.startSession.mockReset();
    // No microphone: the coach falls back to text mode.
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => { throw new Error('NotAllowedError'); }) },
    });
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('shows the connection sentence and re-enables Start when the session request drops', async () => {
    vi.mocked(fetch).mockImplementation(async input => {
      if (String(input).startsWith('/api/interview/history')) return history.clone();
      throw new TypeError('Failed to fetch');
    });
    renderCoach(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(CONNECTION_COPY);
    expect(alert).not.toHaveTextContent('Failed to fetch');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled());
    expect(voice.startSession).not.toHaveBeenCalled();
  });

  it('shows the server rejection when the session request is refused', async () => {
    vi.mocked(fetch).mockImplementation(async input => String(input).startsWith('/api/interview/history')
      ? history.clone()
      : Response.json({ error: 'Interview practice is paused for maintenance.' }, { status: 503 }));
    renderCoach(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Interview practice is paused for maintenance.');
    expect(screen.queryByPlaceholderText('Type your answer')).toBeNull();
  });

  it('keeps the typed answer and shows the connection sentence when the next question drops', async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation(async input => {
      if (String(input).startsWith('/api/interview/history')) return history.clone();
      calls += 1;
      if (calls === 1) return textSession();
      throw new TypeError('Failed to fetch');
    });
    renderCoach(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    const answerBox = await screen.findByPlaceholderText('Type your answer');
    fireEvent.change(answerBox, { target: { value: 'I triage incidents by severity.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(CONNECTION_COPY);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled());
    expect(answerBox).toHaveValue('I triage incidents by severity.');
    expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument();
  });
});
