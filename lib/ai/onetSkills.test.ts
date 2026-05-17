import assert from 'node:assert/strict';
import test from 'node:test';

import type { OnetSkill } from './onetSkills';
import { mapSkillsToRadarAxes } from './onetSkills';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSkill(name: string, score: number): OnetSkill {
  return { id: name.toLowerCase().replace(/\s+/g, '-'), name, score, category: 'skill' };
}

function axisValue(
  result: ReturnType<typeof mapSkillsToRadarAxes>,
  axis: string
): number {
  return result.find((r) => r.axis === axis)?.value ?? -1;
}

function axisHasData(
  result: ReturnType<typeof mapSkillsToRadarAxes>,
  axis: string
): boolean {
  return result.find((r) => r.axis === axis)?.hasData ?? false;
}

// ── empty input ───────────────────────────────────────────────────────────────

test('mapSkillsToRadarAxes: empty skills returns all zeros with hasData=false', () => {
  const result = mapSkillsToRadarAxes([]);

  assert.equal(result.length, 6, 'should return 6 axes');
  for (const row of result) {
    assert.equal(row.value, 0, `axis ${row.axis} should be 0`);
    assert.equal(row.maxValue, 100);
    assert.equal(row.hasData, false, `axis ${row.axis} should have hasData=false`);
  }
});

// ── sales keywords → Strategy / Ethics, NOT Design ───────────────────────────

test('mapSkillsToRadarAxes: sales skills land on Strategy, not Design', () => {
  const salesSkills: OnetSkill[] = [
    makeSkill('Sales and Marketing', 82),
    makeSkill('Selling', 78),
    makeSkill('Negotiation', 76),
    makeSkill('Persuasion', 80),
  ];

  const result = mapSkillsToRadarAxes(salesSkills);

  assert.ok(axisValue(result, 'Strategy') > 0, 'Strategy should have a non-zero value for sales skills');
  assert.equal(axisValue(result, 'Design'), 0, 'Design should remain 0 when only sales skills are present');
});

test('mapSkillsToRadarAxes: negotiation and sales appear in Strategy axis', () => {
  const skills: OnetSkill[] = [
    makeSkill('Negotiation', 76),
    makeSkill('Sales and Marketing', 82),
    makeSkill('Monitoring', 65),
  ];

  const result = mapSkillsToRadarAxes(skills);
  const strategyVal = axisValue(result, 'Strategy');

  // All three keywords match Strategy — value should reflect the average
  assert.ok(strategyVal > 0);
  assert.ok(strategyHasData(result), 'Strategy hasData should be true');
});

function strategyHasData(result: ReturnType<typeof mapSkillsToRadarAxes>): boolean {
  return axisHasData(result, 'Strategy');
}

// ── Ethics axis picks up interpersonal / compliance skills ────────────────────

test('mapSkillsToRadarAxes: service orientation and active listening land on Ethics', () => {
  const skills: OnetSkill[] = [
    makeSkill('Service Orientation', 78),
    makeSkill('Active Listening', 88),
    makeSkill('Social Perceptiveness', 74),
  ];

  const result = mapSkillsToRadarAxes(skills);

  assert.ok(axisValue(result, 'Service') > 0, 'Service should be non-zero for interpersonal skills');
  assert.equal(axisValue(result, 'Engineering'), 0, 'Engineering should be 0 when no tech skills present');
});

// ── Design fallback ───────────────────────────────────────────────────────────

test('mapSkillsToRadarAxes: Design fallback applies when hasData=false and fallbackDesignScore provided', () => {
  const result = mapSkillsToRadarAxes([], { fallbackDesignScore: 55 });

  assert.equal(axisValue(result, 'Design'), 55, 'Design should use fallbackDesignScore');
  assert.equal(axisHasData(result, 'Design'), true, 'Design hasData should be true when fallback applied');

  // Other axes should still be zero
  assert.equal(axisValue(result, 'Analytics'), 0);
  assert.equal(axisValue(result, 'Engineering'), 0);
  assert.equal(axisValue(result, 'Strategy'), 0);
  assert.equal(axisValue(result, 'Service'), 0);
  assert.equal(axisValue(result, 'Research'), 0);
});

test('mapSkillsToRadarAxes: Design fallback does NOT override real Design data', () => {
  const skills: OnetSkill[] = [
    makeSkill('User Interface Design', 72),
  ];

  const result = mapSkillsToRadarAxes(skills, { fallbackDesignScore: 99 });

  // Real match exists; fallback should NOT override
  assert.notEqual(axisValue(result, 'Design'), 99, 'fallbackDesignScore must not override real match');
  assert.ok(axisValue(result, 'Design') > 0, 'Design should still have a positive value from real match');
  assert.equal(axisHasData(result, 'Design'), true);
});

test('mapSkillsToRadarAxes: fallbackDesignScore is ignored when not provided', () => {
  const result = mapSkillsToRadarAxes([]);

  // Without the option, Design should stay at 0
  assert.equal(axisValue(result, 'Design'), 0);
  assert.equal(axisHasData(result, 'Design'), false);
});

// ── Engineering axis keyword coverage ────────────────────────────────────────

test('mapSkillsToRadarAxes: programming and troubleshooting land on Engineering', () => {
  // Use pure Engineering keywords that do NOT appear in other axes
  const skills: OnetSkill[] = [
    makeSkill('Programming', 92),
    makeSkill('Troubleshooting', 80),
    makeSkill('Debugging', 78),
  ];

  const result = mapSkillsToRadarAxes(skills);

  assert.ok(axisValue(result, 'Engineering') > 0, 'Engineering should be > 0 for tech skills');
  // Note: "Systems Analysis" intentionally maps to both Engineering and Strategy axes per the
  // keyword lists; these pure-Engineering skills should NOT trigger Strategy.
  assert.equal(axisValue(result, 'Strategy'), 0, 'Strategy should be 0 for pure Engineering keywords');
});

// ── maxValue is always 100 ────────────────────────────────────────────────────

test('mapSkillsToRadarAxes: all axes have maxValue=100 regardless of input', () => {
  const skills: OnetSkill[] = [makeSkill('Programming', 100)];
  const result = mapSkillsToRadarAxes(skills);

  for (const row of result) {
    assert.equal(row.maxValue, 100);
  }
});
