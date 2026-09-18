import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  startElevenLabsPortalSession: vi.fn(),
  startMemberAgentGatewaySession: vi.fn(),
  getGucContext: vi.fn(),
}));

vi.mock('@/lib/ai/elevenlabsAgents', () => ({
  startElevenLabsPortalSession: mocks.startElevenLabsPortalSession,
}));

vi.mock('@/lib/agents/gateway/startMemberSession', () => ({
  startMemberAgentGatewaySession: mocks.startMemberAgentGatewaySession,
}));

vi.mock('@/lib/db/gucContext', () => ({
  getGucContext: mocks.getGucContext,
}));

import { ElevenLabsApiError } from '@/lib/ai/elevenlabs';
import { startMemberVoiceSessionWithLilleyFallback } from '@/lib/ai/memberVoiceFallback';

const memberGuc = { userId: 'member-1', orgId: 'org-1', role: 'member' as const };

describe('startMemberVoiceSessionWithLilleyFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.getGucContext.mockReturnValue(memberGuc);
    mocks.startMemberAgentGatewaySession.mockResolvedValue({
      signedUrl: 'wss://provider.test/lilley',
      conversationId: 'conv-lilley',
      dynamicVariables: { secret__agent_gateway_token: 'Bearer wap_ag_token' },
    });
  });

  it('returns the dedicated agent session when the provider answers', async () => {
    mocks.startElevenLabsPortalSession.mockResolvedValue({
      signedUrl: 'wss://provider.test/wioa',
      expiresAt: '2026-09-05T20:00:00Z',
      dynamicVariables: { locale: 'en', wioa_age_bracket: '25_54' },
    });

    const session = await startMemberVoiceSessionWithLilleyFallback({
      key: 'wioa_prequal',
      userId: 'member-1',
      dynamicVariables: { wioa_age_bracket: '25_54' },
      routeLabel: 'test',
    });

    expect(session).toEqual({
      signedUrl: 'wss://provider.test/wioa',
      expiresAt: '2026-09-05T20:00:00Z',
      dynamicVariables: { locale: 'en', wioa_age_bracket: '25_54' },
      agent: 'primary',
    });
    expect(mocks.startMemberAgentGatewaySession).not.toHaveBeenCalled();
  });

  it('starts Lilley through the member gateway when the dedicated agent is unknown (404)', async () => {
    mocks.startElevenLabsPortalSession.mockRejectedValue(new ElevenLabsApiError(404));

    const session = await startMemberVoiceSessionWithLilleyFallback({
      key: 'wioa_prequal',
      userId: 'member-1',
      routeLabel: 'test',
    });

    expect(mocks.startMemberAgentGatewaySession).toHaveBeenCalledWith({
      userId: 'member-1',
      organizationId: 'org-1',
      role: 'member',
      agentKey: 'career_business',
    });
    expect(session.agent).toBe('lilley_fallback');
    expect(session.signedUrl).toBe('wss://provider.test/lilley');
    expect(session.conversationId).toBe('conv-lilley');
    // Lilley gets account truth from tools, never from prompt variables.
    expect(session.dynamicVariables).toEqual({ secret__agent_gateway_token: 'Bearer wap_ag_token' });
  });

  it('rethrows provider failures other than 404 untouched', async () => {
    mocks.startElevenLabsPortalSession.mockRejectedValue(new ElevenLabsApiError(503));

    await expect(
      startMemberVoiceSessionWithLilleyFallback({ key: 'readiness', userId: 'member-1', routeLabel: 'test' }),
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.startMemberAgentGatewaySession).not.toHaveBeenCalled();
  });

  it('does not mint Lilley without a matching member request context', async () => {
    mocks.startElevenLabsPortalSession.mockRejectedValue(new ElevenLabsApiError(404));
    mocks.getGucContext.mockReturnValue({ userId: 'someone-else', orgId: 'org-1', role: 'member' });

    await expect(
      startMemberVoiceSessionWithLilleyFallback({ key: 'readiness', userId: 'member-1', routeLabel: 'test' }),
    ).rejects.toMatchObject({ status: 404 });

    mocks.getGucContext.mockReturnValue({ userId: null, orgId: null, role: 'anonymous' });
    await expect(
      startMemberVoiceSessionWithLilleyFallback({ key: 'readiness', userId: 'member-1', routeLabel: 'test' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.startMemberAgentGatewaySession).not.toHaveBeenCalled();
  });
});
