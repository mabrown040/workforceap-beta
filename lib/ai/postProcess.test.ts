import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLongFormPlainText, cleanSpokenLine, sanitizeAIOutput } from './postProcess';

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

test('sanitizeAIOutput applies typo, quote, smart quote, and markdown cleanup together', () => {
  const input = '“## I am **exceling** at support”';
  const cleaned = sanitizeAIOutput(input);
  assert.equal(cleaned, 'I am excelling at support');
});
