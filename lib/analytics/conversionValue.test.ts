import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONVERSION_VALUE_USD,
  getConversionValuePayload,
} from './conversionValue';

describe('conversionValue', () => {
  it('returns a stable Google Ads value payload for apply signup completion', () => {
    assert.deepEqual(getConversionValuePayload('apply_signup_completed'), {
      conversion_event: 'apply_signup_completed',
      conversion_value_usd: CONVERSION_VALUE_USD.apply_signup_completed,
      currency: 'USD',
    });
  });
});
