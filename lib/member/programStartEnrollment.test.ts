import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIGITAL_LITERACY_PROGRAM_SLUG } from '@/shared/digitalLiteracyPathway';
import type { DashboardEnrollment } from './resolveActiveDashboardProgram';
import {
  programStartAccessFromDashboardView,
  resolveProgramStartAccess,
} from './programStartEnrollment';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function enrollment(
  slug: string,
  opts: { isPrimary?: boolean; id?: string } = {},
): DashboardEnrollment {
  return {
    id: opts.id ?? `enr-${slug}`,
    programSlug: slug,
    isPrimary: opts.isPrimary ?? false,
    enrolledAt: new Date('2026-04-01T00:00:00Z'),
  };
}

test('CourseEnrollment row + enrolledProgram NULL does not bounce start', () => {
  const access = resolveProgramStartAccess({
    enrollments: [enrollment(DIGITAL_LITERACY_PROGRAM_SLUG, { isPrimary: true })],
    legacyEnrolledProgram: null,
  });
  assert.equal(access.bounceToProgram, false);
  assert.equal(access.enrolledSlug, DIGITAL_LITERACY_PROGRAM_SLUG);
});

test('unassigned members still bounce to My Program', () => {
  const access = resolveProgramStartAccess({
    enrollments: [],
    legacyEnrolledProgram: null,
  });
  assert.equal(access.bounceToProgram, true);
  assert.equal(access.enrolledSlug, null);
});

test('non-primary history rows with null User.enrolledProgram still bounce', () => {
  const access = resolveProgramStartAccess({
    enrollments: [enrollment(DIGITAL_LITERACY_PROGRAM_SLUG)],
    legacyEnrolledProgram: null,
  });
  assert.equal(access.bounceToProgram, true);
  assert.equal(access.enrolledSlug, null);
});

test('legacy User.enrolledProgram still admits members with no CourseEnrollment row', () => {
  const access = resolveProgramStartAccess({
    enrollments: [],
    legacyEnrolledProgram: DIGITAL_LITERACY_PROGRAM_SLUG,
  });
  assert.equal(access.bounceToProgram, false);
  assert.equal(access.enrolledSlug, DIGITAL_LITERACY_PROGRAM_SLUG);
});

test('dashboard view with an active slug does not bounce start', () => {
  const access = programStartAccessFromDashboardView({
    activeProgramSlug: DIGITAL_LITERACY_PROGRAM_SLUG,
  });
  assert.equal(access.bounceToProgram, false);
  assert.equal(access.enrolledSlug, DIGITAL_LITERACY_PROGRAM_SLUG);
});

test('start page uses the live dashboard enrollment source, not User.enrolledProgram', () => {
  const src = readFileSync(
    join(ROOT, 'app/(portal)/dashboard/program/start/page.tsx'),
    'utf8',
  );
  assert.match(src, /getActiveProgramForDashboard/);
  assert.match(src, /programStartAccessFromDashboardView/);
  assert.match(src, /const enrolledSlug = access\.enrolledSlug/);
  assert.doesNotMatch(src, /const enrolledSlug = dbUser\?\.enrolledProgram/);
  assert.doesNotMatch(src, /enrolledProgram:\s*true/);
  assert.doesNotMatch(src, /prisma\.user\.update/);
  assert.match(src, /if \(!enrolledSlug\) \{\n    redirect\('\/dashboard\/program'\);/);
});
