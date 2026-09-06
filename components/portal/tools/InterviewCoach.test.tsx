import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InterviewCoach from './InterviewCoach';

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
      interview_eligible: true, completed_interviews: 2,
    };
    vi.mocked(fetch).mockImplementation(async input => String(input).startsWith('/api/interview/history')
      ? Response.json({ sessions: [] })
      : Response.json({ mode: 'voice', signedUrl: 'wss://example.test/interview', sessionId: 'session-1', dynamicVariables }));

    render(<InterviewCoach initialRole="Security Analyst" />);
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
    render(<InterviewCoach initialRole="Security Analyst" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    await screen.findByText(/Personalized context unavailable/);
    expect(voice.startSession).toHaveBeenCalledTimes(1);
  });
});
