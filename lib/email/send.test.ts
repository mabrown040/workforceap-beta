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

  it('strips CR/LF from headers so a newline in NEXT_PUBLIC_SITE_URL cannot fail the send', async () => {
    process.env.CRON_SECRET = 'test-unsubscribe-secret';
    // Exactly how the production outage was configured: a pasted trailing newline.
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.workforceap.org\n';

    let captured: Record<string, string> | undefined;
    const resend = {
      emails: {
        send: async (payload: { headers?: Record<string, string> }) => {
          captured = payload.headers;
          // Mirror undici: reject any header value carrying CR/LF/NUL.
          for (const [name, value] of Object.entries(payload.headers ?? {})) {
            if (/[\r\n\0]/.test(name) || /[\r\n\0]/.test(value)) {
              throw new Error(
                'Header keys and values cannot contain carriage return, line feed, or null characters.',
              );
            }
          }
          return { data: { id: 'sent' }, error: null };
        },
      },
    } as unknown as import('resend').Resend;

    try {
      await sendBrandedEmail(resend, {
        from: 'WorkforceAP <hello@workforceap.org>',
        to: 'applicant@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });
    } finally {
      if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }

    const unsubscribe = captured?.['List-Unsubscribe'] ?? '';
    assert.ok(unsubscribe.includes('https://www.workforceap.org/api/unsubscribe'));
    assert.ok(!/[\r\n\0]/.test(unsubscribe));
  });

  it('drops a caller-supplied header that carries a newline instead of failing the whole send', async () => {
    process.env.CRON_SECRET = 'test-unsubscribe-secret';
    let captured: Record<string, string> | undefined;
    const resend = {
      emails: {
        send: async (payload: { headers?: Record<string, string> }) => {
          captured = payload.headers;
          return { data: { id: 'sent' }, error: null };
        },
      },
    } as unknown as import('resend').Resend;

    await sendBrandedEmail(resend, {
      from: 'WorkforceAP <hello@workforceap.org>',
      to: 'applicant@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      headers: { 'X-Campaign': 'weekly-recap\nX-Injected: evil' },
    });

    assert.equal(captured?.['X-Campaign'], 'weekly-recapX-Injected: evil');
    assert.ok(!/[\r\n\0]/.test(captured?.['X-Campaign'] ?? ''));
  });
});
