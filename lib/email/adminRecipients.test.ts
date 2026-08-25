import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getAdminAlertRecipients } from '@/lib/email';

describe('getAdminAlertRecipients', () => {
  const prior = process.env.EMAIL_TO_ADMIN;

  afterEach(() => {
    if (prior === undefined) delete process.env.EMAIL_TO_ADMIN;
    else process.env.EMAIL_TO_ADMIN = prior;
  });

  it('defaults to shared inbox plus Mike WorkforceAP addresses', () => {
    delete process.env.EMAIL_TO_ADMIN;
    const recipients = getAdminAlertRecipients();
    assert.ok(recipients.includes('info@workforceap.org'));
    assert.ok(recipients.includes('michael.brown@workforceap.org'));
    assert.ok(recipients.includes('michael.brown2@workforceap.org'));
  });

  it('honors EMAIL_TO_ADMIN comma-separated override', () => {
    process.env.EMAIL_TO_ADMIN = 'Ops@WorkforceAP.org, mbrowncsn@sbcglobal.net';
    assert.deepEqual(getAdminAlertRecipients(), [
      'ops@workforceap.org',
      'mbrowncsn@sbcglobal.net',
    ]);
  });

  it('dedupes EMAIL_TO_ADMIN entries', () => {
    process.env.EMAIL_TO_ADMIN = 'mike@example.com, mike@example.com';
    assert.deepEqual(getAdminAlertRecipients(), ['mike@example.com']);
  });
});
