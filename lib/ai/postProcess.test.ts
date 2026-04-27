import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLongFormPlainText, cleanSpokenLine } from './postProcess';

test('cleanSpokenLine fixes high-frequency typo "exceling"', () => {
  const input = 'I am exceling at customer support and troubleshooting.';
  const cleaned = cleanSpokenLine(input);
  assert.equal(cleaned, 'I am excelling at customer support and troubleshooting.');
});

test('cleanLongFormPlainText strips markdown markers but keeps content', () => {
  const input = [
    '## REPOSITIONED RESUME',
    '**Summary:**',
    '*Led support queue triage and onboarding*',
    '',
    '## HOW WE POSITIONED YOU',
    '- Highlighted transferable communication strengths',
  ].join('\n');

  const cleaned = cleanLongFormPlainText(input);
  assert.equal(
    cleaned,
    [
      'REPOSITIONED RESUME',
      'Summary:',
      'Led support queue triage and onboarding',
      '',
      'HOW WE POSITIONED YOU',
      '- Highlighted transferable communication strengths',
    ].join('\n')
  );
});
