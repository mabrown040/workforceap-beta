// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock('@/lib/diagnostics', () => ({ recordWorkflowDiagnostic: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/tenant/organizationBranding', () => ({ getOrganizationBranding: vi.fn() }));

import { sendPlacementSurveyEmail } from '@/lib/email';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 'synthetic-provider-only');
  vi.stubEnv('CRON_SECRET', 'synthetic-unsubscribe-only');
  mocks.send.mockResolvedValue({ data: { id: 'synthetic-receipt' }, error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe('placement survey provider idempotency boundary', () => {
  const message = {
    to: 'member@workforceap.org',
    fullName: 'Member Example',
    programName: 'CNA',
    surveyUrl: 'https://www.workforceap.org/survey/placement/synthetic',
    wave: 'thirty_day' as const,
    idempotencyKey: 'placement-survey/survey-stable',
  };

  it('threads the exact stable survey-row key to every provider attempt', async () => {
    await expect(sendPlacementSurveyEmail(message)).resolves.toEqual({ ok: true });
    await expect(sendPlacementSurveyEmail(message)).resolves.toEqual({ ok: true });

    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: message.to }),
      { idempotencyKey: message.idempotencyKey },
    );
    expect(mocks.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: message.to }),
      { idempotencyKey: message.idempotencyKey },
    );
  });
});
