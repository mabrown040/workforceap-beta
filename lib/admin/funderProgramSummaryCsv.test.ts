import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFunderProgramSummaryCsv } from './funderProgramSummaryCsv';

test('funder program summary CSV is header-first with requested columns', () => {
  const csv = buildFunderProgramSummaryCsv([
    {
      programSlug: 'health-admin',
      programTitle: 'Healthcare Admin',
      totalEnrolled: 10,
      activeLast30d: 5,
      completed: 2,
      placed: 1,
      atRisk: 3,
      completionPct: 20,
      placementPct: 10,
    },
  ]);

  const lines = csv.trim().split('\r\n');
  assert.equal(
    lines[0],
    'Program,Total Enrolled,Active (last 30d),Completed,Placed,At-Risk,Completion %,Placement %',
  );
  assert.ok(lines[1].startsWith('Healthcare Admin,'));
  assert.ok(lines[1].includes('10,5,2,1,3,20%,10%'));
});
