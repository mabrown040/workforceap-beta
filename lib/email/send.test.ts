import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sendBrandedEmail } from '@/lib/email/send';

describe('sendBrandedEmail', () => {
  it('throws when Resend returns an error object instead of throwing', async () => {
    process.env.CRON_SECRET = 'test-unsubscribe-secret';
    const resend = {
      emails: {
        send: async () => ({ data: null, error: { name: 'validation_error', message: 'Invalid from address' } }),
      },
    } as unknown as import('resend').Resend;

    await assert.rejects(
      () =>
        sendBrandedEmail(resend, {
          from: 'WorkforceAP <hello@workforceap.org>',
          to: 'applicant@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        }),
      /Invalid from address/,
    );
  });
});
