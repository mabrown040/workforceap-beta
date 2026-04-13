import assert from 'node:assert/strict';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';

assert.equal(matchScoreAsPercent(35), 35, 'DB int 0–100 stays as percent');
assert.equal(matchScoreAsPercent(88), 88);
assert.equal(matchScoreAsPercent(1), 1, 'DB int 1 = 1%');
assert.equal(matchScoreAsPercent(0.88), 88, '0–1 float scales to percent');
assert.equal(matchScoreAsPercent(0.01), 1, 'fractional scale');
assert.equal(matchScoreAsPercent(1.0), 1, 'float 1.0 is integer-like → 1% (prefer DB semantics)');
assert.equal(matchScoreAsPercent(-1), 0);

console.log('matchScoreDisplay tests passed');
