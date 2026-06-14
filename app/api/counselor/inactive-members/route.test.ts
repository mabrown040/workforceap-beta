import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInactiveMembersQuery } from './_inactiveMembersQuery';

test('inactive members query applies cutoff to no-event members by joined date', () => {
  const cutoffDate = new Date('2026-05-23T00:00:00.000Z');
  const query = buildInactiveMembersQuery('org-1', null, cutoffDate);
  const sql = query.sql.replace(/\s+/g, ' ').trim();

  assert.match(
    sql,
    /HAVING \( \(MAX\(me\.created_at\) IS NULL AND u\.created_at < \?\) OR MAX\(me\.created_at\) < \? \)/,
  );
  assert.deepEqual(query.values, ['org-1', cutoffDate, cutoffDate]);
});
