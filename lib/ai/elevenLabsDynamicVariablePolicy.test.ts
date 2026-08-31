import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasSecretElevenLabsDynamicVariables,
  mayRetryElevenLabsWithoutDynamicVariables,
} from './elevenLabsDynamicVariablePolicy';

test('detects ElevenLabs secret dynamic variables case-insensitively', () => {
  assert.equal(
    hasSecretElevenLabsDynamicVariables({ secret__agent_gateway_token: 'opaque' }),
    true,
  );
  assert.equal(
    hasSecretElevenLabsDynamicVariables({ SECRET__AGENT_GATEWAY_TOKEN: 'opaque' }),
    true,
  );
  assert.equal(hasSecretElevenLabsDynamicVariables({ member_name: 'Mike' }), false);
});

test('never retries without dynamic variables when a secret is present', () => {
  assert.equal(
    mayRetryElevenLabsWithoutDynamicVariables(true, {
      secret__agent_gateway_token: 'opaque',
      locale: 'en',
    }),
    false,
  );
  assert.equal(
    mayRetryElevenLabsWithoutDynamicVariables(true, { locale: 'en' }),
    true,
  );
  assert.equal(
    mayRetryElevenLabsWithoutDynamicVariables(false, { locale: 'en' }),
    false,
  );
});
