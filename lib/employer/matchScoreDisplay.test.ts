import assert from 'node:assert/strict';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';

assert.equal(matchScoreAsPercent(35), 35, 'DB int 0–100 stays as percent');
assert.equal(matchScoreAsPercent(88), 88);
assert.equal(matchScoreAsPercent(1), 100, 'score=1 treated as 0–1 float → 100%');
assert.equal(matchScoreAsPercent(0.88), 88, '0–1 float scales to percent');
assert.equal(matchScoreAsPercent(0.01), 1, 'fractional scale');
assert.equal(matchScoreAsPercent(1.0), 100, 'float 1.0 on 0–1 scale → 100%');
assert.equal(matchScoreAsPercent(-1), 0);

console.log('matchScoreDisplay tests passed');
