import test from 'node:test';
import assert from 'node:assert/strict';

import { matchB4BProgramToCatalog } from './seedCanonicalMappingsFromB4B';
import type { Program } from '@/lib/content/programs';

function mkProgram(slug: string, title: string, courseraB4BProgramId?: string): Program {
  return {
    slug,
    title,
    category: 'test',
    categoryLabel: 'Test',
    categoryColor: '#000',
    borderColor: '#000',
    icon: '🧪',
    duration: '—',
    salary: '—',
    skills: [],
    courses: [],
    partner: 'Test',
    courseraB4BProgramId,
  };
}

test('manual courseraB4BProgramId wins over name match', () => {
  const catalog = [
    mkProgram('a', 'Different Title Entirely', 'B4B-1'),
    mkProgram('b', 'IT Support Professional Certificate (IBM)'),
  ];
  const result = matchB4BProgramToCatalog(
    { id: 'B4B-1', name: 'IT Support Professional Certificate (IBM)' },
    catalog,
  );
  assert.ok(result);
  assert.equal(result!.program.slug, 'a');
  assert.equal(result!.kind, 'manualId');
});

test('falls back to normalized name when no manual id is set', () => {
  const catalog = [mkProgram('it-support-ibm', 'IT Support Professional Certificate (IBM)')];
  const result = matchB4BProgramToCatalog(
    { id: 'B4B-FREE', name: 'it-support-professional-certificate (IBM)' },
    catalog,
  );
  assert.ok(result);
  assert.equal(result!.program.slug, 'it-support-ibm');
  assert.equal(result!.kind, 'name');
});

test('returns null when neither manual id nor name match', () => {
  const catalog = [mkProgram('a', 'Program A')];
  const result = matchB4BProgramToCatalog({ id: 'B4B-X', name: 'Unrelated Program' }, catalog);
  assert.equal(result, null);
});

test('empty B4B name returns null even with similar program', () => {
  const catalog = [mkProgram('a', 'Program A')];
  const result = matchB4BProgramToCatalog({ id: 'B4B-X', name: '' }, catalog);
  assert.equal(result, null);
});
