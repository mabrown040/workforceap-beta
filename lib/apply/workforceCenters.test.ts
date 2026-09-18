import test from 'node:test';
import assert from 'node:assert/strict';
import {
  careerOneStopFinderUrl,
  lookupWorkforceCenter,
  workforceCenterPlainLine,
} from './workforceCenters';

test('Austin ZIP names Workforce Solutions Capital Area', () => {
  const match = lookupWorkforceCenter({ zip: '78701', state: 'TX' });
  assert.equal(match?.board, 'Workforce Solutions Capital Area');
  assert.match(match?.finderUrl ?? '', /careeronestop\.org/);
  assert.match(workforceCenterPlainLine(match) ?? '', /Capital Area/);
});

test('Travis County still resolves when ZIP is missing', () => {
  const match = lookupWorkforceCenter({ county: 'Travis County', state: 'TX' });
  assert.equal(match?.board, 'Workforce Solutions Capital Area');
});

test('out-of-state ZIP still gets a DOL one-stop finder', () => {
  const match = lookupWorkforceCenter({ zip: '10001', state: 'NY' });
  assert.ok(match);
  assert.match(match?.board ?? '', /American Job Center/);
  assert.equal(careerOneStopFinderUrl('10001').includes('location=10001'), true);
});
