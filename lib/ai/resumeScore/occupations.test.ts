import assert from 'node:assert/strict';
import test from 'node:test';

import { _parseOccupationsForTests as parseOccupations } from './occupations';

test('parseOccupations accepts well-formed JSON', () => {
  const raw = `{"occupations":[{"onetCode":"41-3091.00","title":"Sales Representatives, Services","confidence":0.85}]}`;
  const r = parseOccupations(raw);
  assert.equal(r.length, 1);
  assert.equal(r[0].onetCode, '41-3091.00');
  assert.equal(r[0].confidence, 0.85);
});

test('parseOccupations strips code fences', () => {
  const raw = '```json\n{"occupations":[{"onetCode":"15-1252.00","title":"Software Developers","confidence":0.9}]}\n```';
  const r = parseOccupations(raw);
  assert.equal(r.length, 1);
  assert.equal(r[0].title, 'Software Developers');
});

test('parseOccupations rejects malformed SOC codes', () => {
  const raw = `{"occupations":[{"onetCode":"not-a-code","title":"x","confidence":0.9},{"onetCode":"41-3091.00","title":"Real","confidence":0.5}]}`;
  const r = parseOccupations(raw);
  assert.equal(r.length, 1);
  assert.equal(r[0].onetCode, '41-3091.00');
});

test('parseOccupations clamps confidence to [0,1]', () => {
  const raw = `{"occupations":[{"onetCode":"41-3091.00","title":"x","confidence":2.5},{"onetCode":"13-1161.00","title":"y","confidence":-1}]}`;
  const r = parseOccupations(raw);
  assert.equal(r[0].confidence, 1);
  assert.equal(r[1].confidence, 0);
});

test('parseOccupations returns empty on bad JSON', () => {
  assert.deepEqual(parseOccupations('garbage'), []);
  assert.deepEqual(parseOccupations(''), []);
  assert.deepEqual(parseOccupations('{"foo":"bar"}'), []);
});

test('parseOccupations caps at 3', () => {
  const codes = ['41-3091.00', '41-4012.00', '13-1161.00', '15-1252.00', '11-2022.00'];
  const occs = codes.map((c) => ({ onetCode: c, title: 't', confidence: 0.5 }));
  const raw = JSON.stringify({ occupations: occs });
  const r = parseOccupations(raw);
  assert.equal(r.length, 3);
});
