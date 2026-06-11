import test from 'node:test';
import assert from 'node:assert/strict';

import { COURSERA_SYNC_MEMBER_PAGE_SIZE, fetchEligibleCourseraMembers } from './syncMembers';
import { prisma } from '@/lib/db/prisma';

test('fetchEligibleCourseraMembers pages beyond the first 100 users', async (t) => {
  const userDelegate = (prisma as any).user;
  const originalFindMany = userDelegate.findMany;

  t.after(() => {
    userDelegate.findMany = originalFindMany;
  });

  const firstPage = Array.from({ length: COURSERA_SYNC_MEMBER_PAGE_SIZE }, (_, i) => ({
    id: `user-${i + 1}`,
    email: `user-${i + 1}@example.com`,
    enrolledProgram: 'cybersecurity',
  }));
  const secondPage = [{ id: 'user-101', email: 'user-101@example.com', enrolledProgram: 'cybersecurity' }];
  const calls: any[] = [];

  userDelegate.findMany = async (args: any) => {
    calls.push(args);
    return args.skip === 0 ? firstPage : secondPage;
  };

  const members = await fetchEligibleCourseraMembers();

  assert.equal(members.length, 101);
  assert.equal(members.at(-1)?.id, 'user-101');
  assert.deepEqual(calls.map((call) => call.skip), [0, COURSERA_SYNC_MEMBER_PAGE_SIZE]);
  assert.ok(calls.every((call) => call.take === COURSERA_SYNC_MEMBER_PAGE_SIZE));
});
