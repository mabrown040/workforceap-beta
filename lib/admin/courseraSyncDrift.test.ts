import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSyncDriftQuery,
  loadSyncDriftPairs,
  mapSyncDriftRows,
  SYNC_DRIFT_LIMIT,
  SYNC_DRIFT_THRESHOLD_HOURS,
} from './courseraSyncDrift';

test('buildSyncDriftQuery: never applies ABS() to an interval (Postgres 42883)', () => {
  const sql = buildSyncDriftQuery().sql;
  assert.ok(!/ABS\s*\(/i.test(sql), `query still contains ABS(): ${sql}`);
  assert.match(sql, /GREATEST\(ccp\.last_activity_time, cp\.last_activity_at\) - LEAST\(ccp\.last_activity_time, cp\.last_activity_at\)/);
  assert.match(sql, /EXTRACT\(EPOCH FROM \(GREATEST/);
});

test('buildSyncDriftQuery: threshold and limit are bound parameters with sane defaults', () => {
  const q = buildSyncDriftQuery();
  assert.deepEqual(q.values, [SYNC_DRIFT_THRESHOLD_HOURS, SYNC_DRIFT_LIMIT]);
  // `.text` is the $n-numbered form Prisma sends to Postgres (`.sql` uses `?`).
  assert.match(q.text, /\(\$1::int \* INTERVAL '1 hour'\)/);
  assert.match(q.text, /LIMIT \$2::int/);
  assert.deepEqual(buildSyncDriftQuery(48.9, 0).values, [48, 1]);
  assert.deepEqual(buildSyncDriftQuery(-5, 7).values, [0, 7]);
});

test('mapSyncDriftRows: rounds seconds to hours and labels a missing email', () => {
  const [row] = mapSyncDriftRows([
    {
      userId: 'u1',
      email: null,
      courseName: 'Intro',
      localProgramSlug: 'assigned-program',
      courseraCourseId: 'c1',
      b4bLastActivity: new Date('2026-01-03T00:00:00Z'),
      ourLastActivity: new Date('2026-01-01T00:00:00Z'),
      deltaSeconds: BigInt(172800),
    },
  ]);
  assert.equal(row.key, 'u1::c1');
  assert.equal(row.email, '(unknown)');
  assert.equal(row.deltaHours, 48);
  assert.equal(mapSyncDriftRows([{ ...row, userId: 'u', courseraCourseId: 'c', deltaSeconds: null }])[0].deltaHours, 0);
});

test('loadSyncDriftPairs: an empty result is ok, a throwing query is an error (not an all-clear)', async () => {
  const empty = await loadSyncDriftPairs(async () => []);
  assert.deepEqual(empty, { status: 'ok', rows: [] });

  const originalError = console.error;
  console.error = () => {};
  try {
    const failed = await loadSyncDriftPairs(async () => {
      throw new Error('function abs(interval) does not exist');
    });
    assert.equal(failed.status, 'error');
    assert.ok(failed.status === 'error' && failed.message.includes('abs(interval)'));
  } finally {
    console.error = originalError;
  }
});
