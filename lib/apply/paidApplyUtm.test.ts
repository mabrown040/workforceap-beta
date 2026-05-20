import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPaidUtmSource,
  resolvePaidApplyUtmSource,
  PAID_APPLY_UTM_SOURCES,
} from './paidApplyUtm';

describe('paidApplyUtm', () => {
  it('recognizes paid traffic sources case-insensitively', () => {
    for (const source of PAID_APPLY_UTM_SOURCES) {
      assert.equal(isPaidUtmSource(source), true);
      assert.equal(isPaidUtmSource(source.toUpperCase()), true);
    }
    assert.equal(isPaidUtmSource('organic'), false);
    assert.equal(isPaidUtmSource(null), false);
  });

  it('prefers query param over cookie when resolving paid apply source', () => {
    assert.equal(
      resolvePaidApplyUtmSource({ utm_source: 'google_ads' }, 'facebook_ads'),
      'google_ads'
    );
  });

  it('falls back to cookie when query param is absent', () => {
    assert.equal(resolvePaidApplyUtmSource({}, 'tiktok_ads'), 'tiktok_ads');
    assert.equal(resolvePaidApplyUtmSource({ utm_source: 'newsletter' }, 'google'), null);
    assert.equal(resolvePaidApplyUtmSource({}, 'newsletter'), null);
  });
});
