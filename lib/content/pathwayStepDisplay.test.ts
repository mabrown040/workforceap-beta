import assert from 'node:assert/strict';
import { PATHWAYS } from '@/lib/content/learningPathways';
import { buildPathwayMilestones } from '@/lib/content/pathwayStepDisplay';

const itPath = PATHWAYS[0];

assert.equal(itPath.id, 'it-support');

const empty = buildPathwayMilestones(itPath, []);
assert.equal(empty[0].status, 'current');
assert.equal(empty[0].detail, 'Up next');
assert.equal(empty[1].status, 'locked');

const firstDone = buildPathwayMilestones(itPath, [
  { pathwayId: 'it-support', stepIndex: 0, status: 'completed' },
]);
assert.equal(firstDone[0].status, 'complete');
assert.equal(firstDone[1].status, 'current');

const allDone = buildPathwayMilestones(itPath, [
  { pathwayId: 'it-support', stepIndex: 0, status: 'completed' },
  { pathwayId: 'it-support', stepIndex: 1, status: 'completed' },
  { pathwayId: 'it-support', stepIndex: 2, status: 'completed' },
  { pathwayId: 'it-support', stepIndex: 3, status: 'completed' },
]);
assert.ok(allDone.every((m) => m.status === 'complete'));

console.log('pathwayStepDisplay tests passed');
