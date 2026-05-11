import test from 'node:test';
import assert from 'node:assert/strict';

import { matchCourseToCatalog } from './seedCanonicalMappingsFromB4B';
import type { Program } from '@/lib/content/programs';

function mkProgram(slug: string, title: string, courseNames: string[]): Program {
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
    courses: courseNames.map((name, i) => ({
      slug: `${slug}-course-${i + 1}`,
      name,
      estimatedHours: 10,
    })),
    partner: 'Test',
  };
}

test('matches a Coursera course name to the catalog program that contains it', () => {
  const catalog = [
    mkProgram('it-support-ibm', 'IT Support', ['Introduction to Technical Support', 'Networking']),
    mkProgram('data-analytics', 'Data Analytics', ['Foundations: Data, Data, Everywhere']),
  ];
  const match = matchCourseToCatalog('Introduction to Technical Support', catalog);
  assert.ok(match);
  assert.equal(match!.program.slug, 'it-support-ibm');
  assert.equal(match!.course.name, 'Introduction to Technical Support');
});

test('match is case + whitespace + punctuation insensitive', () => {
  const catalog = [mkProgram('p', 'P', ['Foundations: Data, Data, Everywhere'])];
  const match = matchCourseToCatalog('FOUNDATIONS  DATA   DATA EVERYWHERE', catalog);
  assert.ok(match);
  assert.equal(match!.course.name, 'Foundations: Data, Data, Everywhere');
});

test('returns null when no catalog course matches', () => {
  const catalog = [mkProgram('p', 'P', ['Some Course'])];
  assert.equal(matchCourseToCatalog('Unrelated Course', catalog), null);
});

test('returns null on empty input', () => {
  const catalog = [mkProgram('p', 'P', ['Some Course'])];
  assert.equal(matchCourseToCatalog('', catalog), null);
});

test('matches the first catalog hit when name collides across programs', () => {
  const catalog = [
    mkProgram('a', 'Program A', ['Shared Course']),
    mkProgram('b', 'Program B', ['Shared Course']),
  ];
  const match = matchCourseToCatalog('Shared Course', catalog);
  assert.ok(match);
  assert.equal(match!.program.slug, 'a');
});
