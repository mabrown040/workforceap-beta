import test from 'node:test';
import assert from 'node:assert/strict';

import { getWeeklyRecapCronStatus } from './_weeklyRecapCronStatus';

test('weekly recap cron marks partial send failures as error', () => {
  assert.equal(getWeeklyRecapCronStatus(0), 'ok');
  assert.equal(getWeeklyRecapCronStatus(1), 'error');
});
