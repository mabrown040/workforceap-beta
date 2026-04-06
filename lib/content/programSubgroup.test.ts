import assert from 'node:assert/strict';
import { PROGRAMS } from '@/lib/content/programs';
import { orderedSubgroupIdsWithPrograms, subgroupForProgram } from '@/lib/content/programSubgroup';

const slugs = PROGRAMS.map((p) => p.slug);
const assigned = new Set(slugs.map((s) => subgroupForProgram(PROGRAMS.find((p) => p.slug === s)!)));

assert.ok(assigned.size >= 5, 'subgroups should spread programs across multiple groups');
assert.equal(slugs.length, new Set(slugs).size);

const order = orderedSubgroupIdsWithPrograms(PROGRAMS);
assert.ok(order.includes('digital-literacy'));
assert.ok(order.includes('it-support'));

console.log('programSubgroup tests passed');
