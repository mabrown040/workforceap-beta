/**
 * Unit tests for the Coursera catalog backfill matching + source-rewrite
 * logic.
 *
 * The implementation lives in `scripts/lib/coursera-catalog-backfill.cjs`
 * (CommonJS, so it can be `require`'d from the entry script under
 * `scripts/`). Tests sit here under `lib/coursera/` because that's where
 * the test runner discovers them (`test:unit` globs `lib/**\/*.test.ts`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireCjs = createRequire(import.meta.url);
const backfillModule = requireCjs(
  path.resolve(__dirname, '..', '..', 'scripts', 'lib', 'coursera-catalog-backfill.cjs'),
) as {
  stripContentPrefix(id: string): string;
  toSlug(value: string): string;
  indexB4BContents(contents: Array<Record<string, unknown>>): {
    byName: Map<string, string>;
    bySlug: Map<string, string>;
  };
  matchCourse(
    course: { name?: string; slug?: string },
    index: ReturnType<typeof backfillModule.indexB4BContents>,
  ): { contentId: string; strategy: string } | null;
  resolveProgramCourses(
    program: { courses?: Array<{ slug?: string; name?: string; courseId?: string }> },
    index: ReturnType<typeof backfillModule.indexB4BContents>,
  ): Array<{
    slug: string;
    name: string;
    currentCourseId: string;
    resolved: { contentId: string; strategy: string } | null;
  }>;
  isPlaceholderCourseId(value: unknown): boolean;
  applyResolutionsToSource(
    source: string,
    resolutions: Array<{
      programSlug: string;
      courseSlug: string;
      courseName?: string;
      contentId: string;
    }>,
  ): {
    source: string;
    replaced: number;
    skipped: Array<{ programSlug?: string; courseSlug?: string; reason: string }>;
  };
};

const {
  stripContentPrefix,
  indexB4BContents,
  matchCourse,
  resolveProgramCourses,
  isPlaceholderCourseId,
  applyResolutionsToSource,
} = backfillModule;

test('stripContentPrefix removes Course~ / Specialization~ prefixes', () => {
  assert.equal(stripContentPrefix('Course~rUHfSakHEeeQ3gpuC4Fs_g-HixlS'), 'rUHfSakHEeeQ3gpuC4Fs_g-HixlS');
  assert.equal(stripContentPrefix('Specialization~abc123'), 'abc123');
  assert.equal(stripContentPrefix('plainid'), 'plainid');
  assert.equal(stripContentPrefix(''), '');
});

test('indexB4BContents builds byName / bySlug maps', () => {
  const idx = indexB4BContents([
    { id: 'Course~AAA111', name: 'Foundations of UX Design', slug: 'foundations-ux-design' },
    { id: 'Course~BBB222', name: 'AWS Cloud Intro' },
    { id: 'badly-shaped' },
    null as unknown as Record<string, unknown>,
  ]);
  assert.equal(idx.byName.get('foundations of ux design'), 'AAA111');
  assert.equal(idx.bySlug.get('foundations-ux-design'), 'AAA111');
  // For entries with no explicit slug, indexB4BContents derives one from the name.
  assert.equal(idx.bySlug.get('aws-cloud-intro'), 'BBB222');
});

test('matchCourse prefers exact name, falls back to slug, then derived slug', () => {
  const idx = indexB4BContents([
    { id: 'Course~NAMEONLY', name: 'Foundations of User Experience (UX) Design' },
    { id: 'Course~SLUGONLY', slug: 'wireframes-low-fidelity-prototypes', name: 'Different Display Name' },
    { id: 'Course~DERIVED', name: 'Build Wireframes And Low-Fidelity Prototypes' },
  ]);

  const exact = matchCourse(
    { name: 'Foundations of User Experience (UX) Design', slug: 'foundations-user-experience-design' },
    idx,
  );
  assert.deepEqual(exact, { contentId: 'NAMEONLY', strategy: 'exact-name' });

  const bySlug = matchCourse(
    { name: 'Some Other Name', slug: 'wireframes-low-fidelity-prototypes' },
    idx,
  );
  assert.deepEqual(bySlug, { contentId: 'SLUGONLY', strategy: 'slug' });

  // Catalog name has different punctuation than B4B: derived slug should match.
  const derived = matchCourse(
    { name: 'Build Wireframes and Low-Fidelity Prototypes!', slug: 'mismatch' },
    idx,
  );
  assert.equal(derived?.contentId, 'DERIVED');

  const noMatch = matchCourse({ name: 'Nope', slug: 'also-nope' }, idx);
  assert.equal(noMatch, null);
});

test('resolveProgramCourses returns per-course matches preserving placeholders', () => {
  const idx = indexB4BContents([
    { id: 'Course~UX1', name: 'Foundations of User Experience (UX) Design' },
    { id: 'Course~UX2', name: 'Start the UX Design Process: Empathize, Define, and Ideate' },
    // No entry for 'Conduct UX Research and Test Early Concepts' — should remain unmatched.
  ]);

  const program = {
    courses: [
      { courseId: 'TODO_courseId_1', slug: 'foundations-user-experience-design', name: 'Foundations of User Experience (UX) Design', partner: 'Google' },
      { courseId: 'TODO_courseId_2', slug: 'start-ux-design-process', name: 'Start the UX Design Process: Empathize, Define, and Ideate', partner: 'Google' },
      { courseId: 'TODO_courseId_3', slug: 'conduct-ux-research', name: 'Conduct UX Research and Test Early Concepts', partner: 'Google' },
    ],
  };

  const results = resolveProgramCourses(program, idx);
  assert.equal(results.length, 3);
  assert.equal(results[0].resolved?.contentId, 'UX1');
  assert.equal(results[0].resolved?.strategy, 'exact-name');
  assert.equal(results[1].resolved?.contentId, 'UX2');
  assert.equal(results[2].resolved, null);
  assert.equal(results[2].currentCourseId, 'TODO_courseId_3');
});

test('isPlaceholderCourseId detects only the TODO_courseId_<N> shape', () => {
  assert.equal(isPlaceholderCourseId('TODO_courseId_1'), true);
  assert.equal(isPlaceholderCourseId('TODO_courseId_42'), true);
  assert.equal(isPlaceholderCourseId('lgy789C8Ee6SjxKHxThXWw'), false);
  assert.equal(isPlaceholderCourseId(''), false);
  assert.equal(isPlaceholderCourseId(null as unknown as string), false);
});

test('applyResolutionsToSource rewrites only matching placeholder lines', () => {
  // Mini synthetic catalog file. Two LPs, one with placeholders, one fully real.
  const source = [
    'const X = {',
    '  "ux-design-professional-certificate-google": {',
    '    courses: [',
    '      { courseId: "TODO_courseId_1", slug: "foundations-user-experience-design", name: "Foundations of User Experience (UX) Design", partner: "Google" },',
    '      { courseId: "TODO_courseId_2", slug: "start-ux-design-process", name: "Start the UX Design Process: Empathize, Define, and Ideate", partner: "Google" },',
    '    ],',
    '  },',
    '  "comptia-a-plus": {',
    '    courses: [',
    '      { courseId: "7sBiclFIEeetjQ5ppGVTyA", slug: "technical-support-fundamentals", name: "Technical Support Fundamentals", partner: "Google" },',
    '    ],',
    '  },',
    '};',
    '',
  ].join('\n');

  const resolutions = [
    {
      programSlug: 'ux-design-professional-certificate-google',
      courseSlug: 'foundations-user-experience-design',
      courseName: 'Foundations of User Experience (UX) Design',
      contentId: 'NEWID111',
    },
    // Note: deliberately leaving start-ux-design-process unresolved.
  ];

  const out = applyResolutionsToSource(source, resolutions);
  assert.equal(out.replaced, 1);
  assert.match(out.source, /courseId: "NEWID111", slug: "foundations-user-experience-design"/);
  // The other placeholder must remain untouched.
  assert.match(out.source, /TODO_courseId_2/);
  // The pre-existing real course must be untouched.
  assert.match(out.source, /courseId: "7sBiclFIEeetjQ5ppGVTyA"/);
});

test('applyResolutionsToSource is idempotent — running twice yields the same source', () => {
  const source = [
    '  "x": {',
    '    courses: [',
    '      { courseId: "TODO_courseId_1", slug: "alpha", name: "Alpha", partner: "P" },',
    '    ],',
    '  },',
  ].join('\n');
  const resolutions = [
    { programSlug: 'x', courseSlug: 'alpha', courseName: 'Alpha', contentId: 'REAL_ID' },
  ];
  const first = applyResolutionsToSource(source, resolutions);
  const second = applyResolutionsToSource(first.source, resolutions);
  assert.equal(first.source, second.source);
  assert.equal(second.replaced, 0); // Nothing left to replace on the second run.
});

test('applyResolutionsToSource skips entries with missing contentId or slug', () => {
  const source = '      { courseId: "TODO_courseId_1", slug: "alpha", name: "Alpha", partner: "P" },';
  const out = applyResolutionsToSource(source, [
    { programSlug: 'x', courseSlug: 'alpha', courseName: 'Alpha', contentId: '' },
    { programSlug: 'x', courseSlug: '', courseName: 'B', contentId: 'IDB' },
  ]);
  assert.equal(out.replaced, 0);
  assert.equal(out.skipped.length, 2);
  assert.ok(out.skipped.some((s) => s.reason === 'no contentId'));
  assert.ok(out.skipped.some((s) => s.reason === 'no courseSlug'));
});

test('applyResolutionsToSource flags placeholder lines that do not exist in the source', () => {
  const source = '// no course lines here';
  const out = applyResolutionsToSource(source, [
    { programSlug: 'x', courseSlug: 'ghost', courseName: 'Ghost', contentId: 'GID' },
  ]);
  assert.equal(out.replaced, 0);
  assert.equal(out.skipped.length, 1);
  assert.equal(out.skipped[0].reason, 'placeholder line not found');
});
