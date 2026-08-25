/**
 * Source / copy checks: Mike ops ask — layoff / last-employer question must
 * appear in the adult apply eligibility UI (not gated off the form).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoffCompanyApplicable } from './eligibilityExtendedFields';

const root = join(import.meta.dirname, '../..');

test('en apply copy uses Mike wording for layoff / last employer', () => {
  const en = JSON.parse(readFileSync(join(root, 'messages/en.json'), 'utf8')) as {
    apply: Record<string, string>;
  };
  const label = en.apply.eligibilityLayoffCompanyLabel;
  assert.match(label, /company/i);
  assert.match(label, /laid off/i);
  assert.match(label, /last work/i);
  assert.equal(
    label,
    'What company did you get laid off from, or last work for?',
  );
});

test('ApplyEligibilityClient always renders layoff company field (not gated)', () => {
  const src = readFileSync(join(root, 'app/apply/ApplyEligibilityClient.tsx'), 'utf8');
  assert.match(src, /eligibilityLayoffCompanyLabel/);
  assert.match(src, /name="layoffCompany"/);
  assert.match(src, /showLayoffCompany/);
  // Field is rendered when showLayoffCompany is true; helper always returns true.
  assert.equal(
    layoffCompanyApplicable({
      unemployedOrUnderemployed: null,
      receivingUnemployment: null,
      exhaustedUnemployment: null,
    }),
    true,
  );
});

test('member + token eligibility forms use Mike wording', () => {
  const member = readFileSync(
    join(root, 'app/(portal)/dashboard/eligibility/EligibilityForm.tsx'),
    'utf8',
  );
  const token = readFileSync(join(root, 'app/q/[token]/PublicEligibilityForm.tsx'), 'utf8');
  assert.match(member, /What company did you get laid off from, or last work for\?/);
  assert.match(token, /What company did you get laid off from, or last work for\?/);
});
