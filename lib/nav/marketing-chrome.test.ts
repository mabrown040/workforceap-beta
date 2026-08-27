import test from 'node:test';
import assert from 'node:assert/strict';
import { isMarketingChromeHidden } from './marketing-chrome';

test('hides marketing chrome on portal shells', () => {
  assert.equal(isMarketingChromeHidden('/dashboard'), true);
  assert.equal(isMarketingChromeHidden('/en/dashboard/jobs'), true);
  assert.equal(isMarketingChromeHidden('/admin'), true);
  assert.equal(isMarketingChromeHidden('/employer/jobs'), true);
});

test('hides marketing chrome on /dev proofs so kit pages are not framed by Sign In / Apply Now', () => {
  assert.equal(isMarketingChromeHidden('/dev'), true);
  assert.equal(isMarketingChromeHidden('/dev/member/home'), true);
  assert.equal(isMarketingChromeHidden('/en/dev/dashboard'), true);
  assert.equal(isMarketingChromeHidden('/dev/astryx/table'), true);
});

test('keeps marketing chrome on public marketing routes', () => {
  assert.equal(isMarketingChromeHidden('/'), false);
  assert.equal(isMarketingChromeHidden('/en'), false);
  assert.equal(isMarketingChromeHidden('/en/programs'), false);
  assert.equal(isMarketingChromeHidden('/contact'), false);
});
