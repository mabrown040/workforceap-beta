// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock('@/lib/diagnostics', () => ({ recordWorkflowDiagnostic: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/tenant/organizationBranding', () => ({ getOrganizationBranding: vi.fn() }));
import { sendMilestoneCascadeEmail } from '@/lib/email';
import { sendBrandedEmail } from '@/lib/email/send';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 'synthetic-provider-only');
  vi.stubEnv('CRON_SECRET', 'synthetic-unsubscribe-only');
  mocks.send.mockResolvedValue({ data: { id: 'synthetic-receipt' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('milestone provider idempotency boundary', () => {
  const message = { to: 'member@workforceap.org', subject: 'Synthetic milestone', bodyText: 'Synthetic body', idempotencyKey: 'milestone/synthetic/0/stable' };
  it('threads the exact stable key to Resend and returns its acceptance receipt', async () => {
    const result = await sendMilestoneCascadeEmail(message);
    expect(result).toEqual({ ok: true, messageId: 'synthetic-receipt' });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@workforceap.org', subject: message.subject }), { idempotencyKey: message.idempotencyKey });
  });
  it('does not report accepted when Resend returns no receipt', async () => {
    mocks.send.mockResolvedValue({ data: null, error: null });
    expect(await sendMilestoneCascadeEmail(message)).toMatchObject({ ok: false, error: expect.stringContaining('acceptance receipt') });
  });
  it('surfaces a resolved provider rejection as a failed outcome', async () => {
    mocks.send.mockResolvedValue({ data: null, error: { name: 'invalid_idempotent_request', message: 'Synthetic changed payload' } });
    expect(await sendMilestoneCascadeEmail(message)).toMatchObject({ ok: false, error: 'Synthetic changed payload' });
  });
  it('preserves the existing one-argument SDK call for unkeyed mail', async () => {
    const resend = { emails: { send: mocks.send } } as unknown as import('resend').Resend;
    await sendBrandedEmail(resend, { from: 'test@workforceap.org', to: 'member@workforceap.org', subject: message.subject, html: '<p>Synthetic</p>' });
    expect(mocks.send.mock.calls[0]).toHaveLength(1);
  });
});
