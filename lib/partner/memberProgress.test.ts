import test from 'node:test';
import assert from 'node:assert/strict';

import { PROGRAMS } from '@/lib/content/programs';
import { memberProgramCompleted, memberProgramProgressPct } from './memberProgress';

const sampleProgram = PROGRAMS.find((p) => p.courses.length >= 2);
if (!sampleProgram) throw new Error('test fixture: need a program with at least 2 courses');
const slugs = sampleProgram.courses.map((c) => c.slug);

test('memberProgramProgressPct prefers live rollup over stale legacy JSON', () => {
  const pct = memberProgramProgressPct(sampleProgram.slug, [], {
    programSlug: sampleProgram.slug,
    averagePercent: 67,
    coursesCompleted: 1,
  });

  assert.equal(pct, 67);
});

test('memberProgramProgressPct ignores rollups for other programs', () => {
  const pct = memberProgramProgressPct(sampleProgram.slug, [slugs[0]], {
    programSlug: 'other-program',
    averagePercent: 99,
    coursesCompleted: 99,
  });

  assert.equal(pct, Math.round((1 / sampleProgram.courses.length) * 100));
});

test('memberProgramCompleted prefers live rollup completion state', () => {
  assert.equal(
    memberProgramCompleted(sampleProgram.slug, [], {
      programSlug: sampleProgram.slug,
      averagePercent: 100,
      coursesCompleted: sampleProgram.courses.length,
    }),
    true
  );
});

test('memberProgramCompleted never graduates from a percent-only shortcut', () => {
  assert.equal(
    memberProgramCompleted(sampleProgram.slug, [], {
      programSlug: sampleProgram.slug,
      averagePercent: 100,
      coursesCompleted: 1,
    }),
    false
  );
});

test('memberProgramCompleted falls back to legacy completed slugs', () => {
  assert.equal(memberProgramCompleted(sampleProgram.slug, slugs), true);
  assert.equal(memberProgramCompleted(sampleProgram.slug, slugs.slice(0, 1)), false);
});
