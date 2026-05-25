import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCareersLeadPayload } from './careersLead';

test('validateCareersLeadPayload accepts a valid careers submission', () => {
  const result = validateCareersLeadPayload({
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.org',
    interest_area: 'engineering',
    message: 'I build production systems and would love to support the mission.',
    role_title: 'Senior Engineer',
    cf_turnstile_response: 'token-123',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.firstName, 'Ada');
  assert.equal(result.data.roleTitle, 'Senior Engineer');
  assert.equal(result.data.interestArea, 'engineering');
});

test('validateCareersLeadPayload rejects malformed email server-side', () => {
  const result = validateCareersLeadPayload({
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'not-an-email',
    message: 'This message is definitely long enough to pass the length rule.',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fieldErrors.email, 'invalid_email');
});

test('validateCareersLeadPayload rejects short message body', () => {
  const result = validateCareersLeadPayload({
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.org',
    message: 'Too short',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fieldErrors.message, 'too_short');
});
