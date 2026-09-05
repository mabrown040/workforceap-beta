import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  voiceLimit: vi.fn(),
  startSession: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: () => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/rate-limit', () => ({ checkVoiceSessionRateLimit: mocks.voiceLimit }));
vi.mock('@/lib/events/track', () => ({ trackEvent: mocks.trackEvent }));
vi.mock('@/lib/ai/elevenlabsPortalContext', () => ({
  fetchWioaPortalDynamicVariables: vi.fn(async () => ({ wioa_age_bracket: '25_54' })),
}));
vi.mock('@/lib/ai/memberVoiceFallback', () => ({
  startMemberVoiceSessionWithLilleyFallback: mocks.startSession,
  MEMBER_VOICE_UNAVAILABLE_MESSAGE: 'unavailable',
}));

import { ElevenLabsApiError } from '@/lib/ai/elevenlabs';
import { POST } from '@/app/api/member/wioa-qualification/voice-session/route';

describe('POST /api/member/wioa-qualification/voice-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getUser.mockResolvedValue({ id: 'member-1' });
    mocks.voiceLimit.mockResolvedValue({ success: true });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it('tells the browser which agent answered so it can explain a stand-in coach', async () => {
    mocks.startSession.mockResolvedValue({
      signedUrl: 'wss://provider.test/lilley',
      conversationId: 'conv-1',
      dynamicVariables: { secret__agent_gateway_token: 'Bearer t' },
      agent: 'lilley_fallback',
    });

    const res = await POST(new Request('http://localhost/api/member/wioa-qualification/voice-session', { method: 'POST' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ signedUrl: 'wss://provider.test/lilley', agent: 'lilley_fallback' });
    expect(mocks.startSession).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'wioa_prequal', userId: 'member-1', dynamicVariables: { wioa_age_bracket: '25_54' } }),
    );
  });

  it('never leaks the provider error text to members', async () => {
    mocks.startSession.mockRejectedValue(new ElevenLabsApiError(404));

    const res = await POST(new Request('http://localhost/api/member/wioa-qualification/voice-session', { method: 'POST' }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).not.toContain('ElevenLabs');
    expect(body.error).toContain('written screening on this page still works');
  });

  it('requires a signed-in member', async () => {
    mocks.getUser.mockResolvedValue(null);
    const res = await POST(new Request('http://localhost/api/member/wioa-qualification/voice-session', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(mocks.startSession).not.toHaveBeenCalled();
  });
});
