import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buttonClasses,
  buttonPresets,
  numPillClasses,
  primaryButtonClasses,
} from './buttonClasses';

test('buttonClasses composes base, variant, and radius ladder', () => {
  assert.equal(
    buttonClasses({ variant: 'primary', radius: 'lg', large: true, className: 'extra' }),
    'btn btn-primary btn-radius-lg btn-large extra',
  );
});

test('buttonPresets cover header, hero, form submit, and numbered pills', () => {
  assert.match(buttonPresets.navApplyCta(), /btn btn-primary btn-radius-md nav-cta/);
  assert.match(buttonPresets.heroPrimary(), /btn-primary btn-radius-lg btn-large/);
  assert.match(buttonPresets.formSubmitPrimary(), /btn btn-primary btn-radius-md/);
  assert.match(buttonPresets.stepNumPill(), /btn-primary btn-radius-full marketing-btn-num-pill/);
});

test('numPillClasses uses full radius and 44px modifier', () => {
  assert.equal(
    numPillClasses({ className: 'marketing-hero-step-pill__index' }),
    'btn btn-primary btn-radius-full marketing-btn-num-pill marketing-hero-step-pill__index',
  );
});

test('primaryButtonClasses defaults to md radius', () => {
  assert.equal(primaryButtonClasses(), 'btn btn-primary btn-radius-md');
});
