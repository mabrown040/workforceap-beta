import test from 'node:test';
import assert from 'node:assert/strict';
import { runAdminJobMatchesGet, type AdminJobMatchRow } from './runAdminJobMatchesGet';
import type { JobMatchInput } from './aiJobMatchCompute';
import type { StudentMatch } from '@/lib/ai/matchStudents';

const baseJob: JobMatchInput & { id: string } = {
  id: 'job-1',
  requirements: [],
  suggestedPrograms: [],
  preferredCertifications: [],
};

function sampleRow(studentId: string): AdminJobMatchRow {
  return {
    studentId,
    matchScore: 88,
    matchReasons: ['skills'],
    status: 'suggested',
    student: {
      id: studentId,
      fullName: 'Sam Student',
      email: 'sam@example.com',
      enrolledProgram: 'cs',
      assessmentScorePct: 90,
      profile: null,
      userCertifications: [],
    },
  };
}

test('runAdminJobMatchesGet returns 404 when job missing', async () => {
  const r = await runAdminJobMatchesGet('missing', {
    findJobForMatch: async () => null,
    findCachedRows: async () => [],
    computeMatches: async () => [],
    persistMatches: async () => {},
    markMatchesComputedAt: async () => {},
    reloadRows: async () => [],
    markEmptyCooldown: () => {},
    clearEmptyCooldown: () => {},
    logDiagnostic: async () => {},
  });
  assert.equal('notFound' in r && r.notFound, true);
});

test('runAdminJobMatchesGet returns cached rows without compute', async () => {
  let computed = false;
  const row = sampleRow('stu-1');
  const r = await runAdminJobMatchesGet('job-1', {
    findJobForMatch: async () => baseJob,
    findCachedRows: async () => [row],
    computeMatches: async () => {
      computed = true;
      return [];
    },
    persistMatches: async () => {},
    markMatchesComputedAt: async () => {},
    reloadRows: async () => [],
    markEmptyCooldown: () => {},
    clearEmptyCooldown: () => {},
    logDiagnostic: async () => {},
  });
  assert.equal(computed, false);
  assert.equal((r as { status: 200 }).status, 200);
  assert.ok(Array.isArray((r as { body: unknown }).body) && (r as { body: AdminJobMatchRow[] }).body.length === 1);
});

test('runAdminJobMatchesGet empty compute returns empty array', async () => {
  let marked = false;
  const r = await runAdminJobMatchesGet('job-1', {
    findJobForMatch: async () => baseJob,
    findCachedRows: async () => [],
    computeMatches: async () => [],
    persistMatches: async () => {
      assert.fail('should not persist');
    },
    markMatchesComputedAt: async () => {
      assert.fail('should not stamp');
    },
    reloadRows: async () => [],
    markEmptyCooldown: () => {
      marked = true;
    },
    clearEmptyCooldown: () => {},
    logDiagnostic: async () => {},
  });
  assert.equal(marked, true);
  assert.deepEqual((r as { body: unknown }).body, []);
});

test('runAdminJobMatchesGet persists then reloads serialized rows', async () => {
  const persisted: StudentMatch[] = [];
  const row = sampleRow('stu-2');
  const r = await runAdminJobMatchesGet('job-1', {
    findJobForMatch: async () => baseJob,
    findCachedRows: async () => [],
    computeMatches: async () => [{ studentId: 'stu-2', matchScore: 70, matchReasons: ['x'] }],
    persistMatches: async (_jid, m) => {
      persisted.push(...m);
    },
    markMatchesComputedAt: async () => {},
    reloadRows: async () => [row],
    markEmptyCooldown: () => {},
    clearEmptyCooldown: () => {},
    logDiagnostic: async () => {},
  });
  assert.equal(persisted.length, 1);
  assert.equal((r as { status: 200 }).status, 200);
  const body = (r as { body: { studentId: string }[] }).body;
  assert.equal(body[0]?.studentId, 'stu-2');
});

test('runAdminJobMatchesGet continues when persist throws (error path)', async () => {
  const row = sampleRow('stu-3');
  const r = await runAdminJobMatchesGet('job-1', {
    findJobForMatch: async () => baseJob,
    findCachedRows: async () => [],
    computeMatches: async () => [{ studentId: 'stu-3', matchScore: 50, matchReasons: [] }],
    persistMatches: async () => {
      throw new Error('createMany failed');
    },
    markMatchesComputedAt: async () => {
      assert.fail('stamp should not run after persist failure');
    },
    reloadRows: async () => [row],
    markEmptyCooldown: () => {},
    clearEmptyCooldown: () => {},
    logDiagnostic: async () => {},
  });
  assert.equal((r as { status: 200 }).status, 200);
  assert.equal((r as { body: unknown[] }).body.length, 1);
});
