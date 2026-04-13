import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { partnerReferralInviteHtml } from './partner-referral-invite';

describe('partnerReferralInviteHtml', () => {
  it('includes inviter and partner names', () => {
    const html = partnerReferralInviteHtml({
      inviterName: 'Jordan Lee',
      partnerName: 'Austin Workforce Council',
    });

    assert.ok(html.includes('Jordan Lee'));
    assert.ok(html.includes('Austin Workforce Council'));
  });

  it('includes the personal note when provided', () => {
    const html = partnerReferralInviteHtml({
      inviterName: 'Jordan Lee',
      partnerName: 'Austin Workforce Council',
      personalMessage: 'We think this training path could fit your goals.',
    });

    assert.ok(html.includes('Personal note'));
    assert.ok(html.includes('fit your goals'));
  });

  it('escapes unsafe HTML in user-provided fields', () => {
    const html = partnerReferralInviteHtml({
      inviterName: '<b>Jordan</b>',
      partnerName: 'Austin <script>alert(1)</script>',
      personalMessage: '<img src=x onerror=alert(1)>',
    });

    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;b&gt;Jordan&lt;/b&gt;'));
  });
});
