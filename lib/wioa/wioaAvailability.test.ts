import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isWioaPortalAvailable } from './wioaAvailability';

test('the portal WIOA assessment is available by default', () => {
  assert.equal(isWioaPortalAvailable(undefined), true);
  assert.equal(isWioaPortalAvailable(''), true);
  assert.equal(isWioaPortalAvailable('1'), true);
});

test('an explicit zero remains the WIOA portal kill switch', () => {
  assert.equal(isWioaPortalAvailable('0'), false);
});

test('all member discovery surfaces use the shared default-on guard', () => {
  const files = [
    'lib/nav/portalNav.ts',
    'lib/nav/portalNav.i18n.ts',
    'components/portal/LearningHubDestinationCards.tsx',
  ];

  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    assert.match(source, /isWioaPortalAvailable/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_WIOA_ENABLED\s*===\s*['"]1['"]/);
  }

  const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
  assert.match(envExample, /^NEXT_PUBLIC_WIOA_ENABLED=1$/m);
});
