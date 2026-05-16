import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDemoRadarForCode,
  searchDemoOccupations,
  SKILL_MAPPER_DEMO_OCCUPATIONS,
  SKILL_MAPPER_DEMO_SKILLS,
  SKILL_MAPPER_DEMO_SKILLS_SALES,
} from './skillMapperDemo';

// ── helpers ───────────────────────────────────────────────────────────────────

function axisValue(
  result: ReturnType<typeof getDemoRadarForCode>,
  axis: string
): number {
  return result.radarAxes.find((r) => r.axis === axis)?.value ?? -1;
}

// ── getDemoRadarForCode: sales branch ─────────────────────────────────────────

test('getDemoRadarForCode: sales code 41-4012.00 uses sales demo skills', () => {
  const result = getDemoRadarForCode('41-4012.00');

  assert.equal(result.occupationCode, '41-4012.00');
  assert.equal(result.demo, true);

  // Sales skills have high Strategy and Ethics scores; Engineering should be low/zero
  const strategy = axisValue(result, 'Strategy');
  const ethics = axisValue(result, 'Service');
  const engineering = axisValue(result, 'Engineering');

  assert.ok(strategy > 0, `Strategy should be > 0 for sales; got ${strategy}`);
  assert.ok(ethics > 0, `Ethics should be > 0 for sales; got ${ethics}`);
  assert.ok(engineering < strategy, 'Engineering should score lower than Strategy for sales role');
});

test('getDemoRadarForCode: sales code includes skills from SKILL_MAPPER_DEMO_SKILLS_SALES', () => {
  const result = getDemoRadarForCode('41-4012.00');

  // Skills list should be from sales set (capped at 20)
  const salesNames = new Set(SKILL_MAPPER_DEMO_SKILLS_SALES.map((s) => s.name));
  for (const skill of result.skills) {
    assert.ok(salesNames.has(skill.name), `Unexpected skill "${skill.name}" in sales demo`);
  }
});

test('getDemoRadarForCode: all SALES_DEMO_CODES use the sales branch', () => {
  const salesCodes = ['41-4012.00', '41-4011.00', '11-2022.00', '11-2021.00'];
  for (const code of salesCodes) {
    const result = getDemoRadarForCode(code);
    const strategy = axisValue(result, 'Strategy');
    assert.ok(strategy > 0, `Strategy should be > 0 for sales code ${code}`);
  }
});

// ── getDemoRadarForCode: default branch ───────────────────────────────────────

test('getDemoRadarForCode: default code uses standard demo skills', () => {
  const result = getDemoRadarForCode('15-1252.00'); // Software Developers

  const engineering = axisValue(result, 'Engineering');
  assert.ok(engineering > 0, `Engineering should be > 0 for software dev; got ${engineering}`);

  // Skills list should be from default set
  const defaultNames = new Set(SKILL_MAPPER_DEMO_SKILLS.map((s) => s.name));
  for (const skill of result.skills) {
    assert.ok(defaultNames.has(skill.name), `Unexpected skill "${skill.name}" in default demo`);
  }
});

test('getDemoRadarForCode: returns correct shape', () => {
  const result = getDemoRadarForCode('15-1252.00');

  assert.equal(typeof result.occupationCode, 'string');
  assert.ok(Array.isArray(result.skills));
  assert.ok(Array.isArray(result.radarAxes));
  assert.equal(result.radarAxes.length, 6, 'radarAxes should have 6 entries');
  assert.equal(result.demo, true);
  assert.ok(typeof result.totalSkills === 'number');
});

test('getDemoRadarForCode: skills list is capped at 20', () => {
  const result = getDemoRadarForCode('15-1252.00');
  assert.ok(result.skills.length <= 20, `skills.length should be <= 20; got ${result.skills.length}`);
});

// ── getDemoRadarForCode: 15-1212.00 special branch ───────────────────────────

test('getDemoRadarForCode: 15-1212.00 applies score variation (no score below 40)', () => {
  const result = getDemoRadarForCode('15-1212.00');

  for (const skill of result.skills) {
    assert.ok(skill.score >= 40, `skill "${skill.name}" has score ${skill.score} < 40`);
  }
});

test('getDemoRadarForCode: 15-1212.00 produces different scores than default branch', () => {
  const defaultResult = getDemoRadarForCode('15-1252.00');
  const securityResult = getDemoRadarForCode('15-1212.00');

  // At least one axis value should differ between the two branches
  const defaultEngineering = axisValue(defaultResult, 'Engineering');
  const securityEngineering = axisValue(securityResult, 'Engineering');
  // Both use the same skill names, but scores differ so axes may differ
  assert.notEqual(
    JSON.stringify(defaultResult.skills.map((s) => s.score)),
    JSON.stringify(securityResult.skills.map((s) => s.score)),
    '15-1212.00 should have different skill scores than default'
  );
  // Just make sure we got results
  assert.ok(securityEngineering >= 0);
  assert.ok(defaultEngineering >= 0);
});

// ── searchDemoOccupations ─────────────────────────────────────────────────────

test('searchDemoOccupations: returns empty array for queries shorter than 2 chars', () => {
  assert.deepEqual(searchDemoOccupations(''), []);
  assert.deepEqual(searchDemoOccupations('s'), []);
  assert.deepEqual(searchDemoOccupations(' '), []);
});

test('searchDemoOccupations: case-insensitive title match', () => {
  const lower = searchDemoOccupations('sales');
  const upper = searchDemoOccupations('SALES');
  const mixed = searchDemoOccupations('Sales');

  assert.ok(lower.length > 0, 'should find results for "sales"');
  assert.deepEqual(lower, upper, 'lowercase and uppercase should return same results');
  assert.deepEqual(lower, mixed, 'mixed-case should return same results');
});

test('searchDemoOccupations: matches "Sales Representatives" occupation', () => {
  const results = searchDemoOccupations('sales');
  const titles = results.map((o) => o.title);
  assert.ok(titles.includes('Sales Representatives'), 'should find "Sales Representatives"');
});

test('searchDemoOccupations: account executive query matches a sales demo occupation', () => {
  const results = searchDemoOccupations('account executive');
  assert.ok(results.length > 0, 'should find a sales demo result for account executive');
  assert.ok(results.some((o) => /sales/i.test(o.title)), 'should map account executive to a sales occupation');
});

test('searchDemoOccupations: unrelated queries do not match sales via short keyword substrings', () => {
  const aerospace = searchDemoOccupations('aerospace engineer');
  assert.ok(!aerospace.some((o) => o.title === 'Sales Representatives'));

  const michael = searchDemoOccupations('Michael');
  assert.ok(!michael.some((o) => o.title === 'Sales Representatives'));
});

test('searchDemoOccupations: project manager query matches project management specialists', () => {
  const results = searchDemoOccupations('project manager');
  assert.ok(results.some((o) => o.title === 'Project Management Specialists'));
});

test('searchDemoOccupations: marketing manager query matches marketing managers', () => {
  const results = searchDemoOccupations('marketing manager');
  assert.ok(results.some((o) => o.title === 'Marketing Managers'));
});

test('searchDemoOccupations: code-based search works', () => {
  const results = searchDemoOccupations('15-1252');
  assert.ok(results.length > 0, 'should match by occupation code');
  assert.ok(results.some((o) => o.code === '15-1252.00'));
});

test('searchDemoOccupations: partial title match works', () => {
  const results = searchDemoOccupations('software');
  assert.ok(results.some((o) => o.title.toLowerCase().includes('software')));
});

test('searchDemoOccupations: returns a subset of SKILL_MAPPER_DEMO_OCCUPATIONS', () => {
  const knownCodes = new Set(SKILL_MAPPER_DEMO_OCCUPATIONS.map((o) => o.code));
  const results = searchDemoOccupations('manager');
  for (const r of results) {
    assert.ok(knownCodes.has(r.code), `Unexpected code ${r.code} in results`);
  }
});

test('searchDemoOccupations: query with only whitespace returns empty', () => {
  assert.deepEqual(searchDemoOccupations('   '), []);
});

test('searchDemoOccupations: 2-char minimum is inclusive', () => {
  // 'so' is 2 chars — should attempt a match
  const results = searchDemoOccupations('so');
  // May return 0 results but must NOT throw
  assert.ok(Array.isArray(results));
});
