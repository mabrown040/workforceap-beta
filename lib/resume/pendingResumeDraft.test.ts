import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePendingResumeDraft,
  purgePendingResumeDrafts,
  serializePendingResumeDraft,
} from './pendingResumeDraft';
import { getResumeDraftOwnerToken, getResumeProfileRevision } from './resumeProfileRevision';

test('empty-profile pending drafts cannot cross authenticated accounts', () => {
  const emptyRevision = getResumeProfileRevision(null, null);
  const memberA = getResumeDraftOwnerToken('member-a');
  const memberB = getResumeDraftOwnerToken('member-b');
  const raw = serializePendingResumeDraft({
    text: 'Member A resume with private work history and education details.',
    resumeRevision: emptyRevision,
    ownerToken: memberA,
  });

  assert.notEqual(memberA, memberB);
  assert.equal(parsePendingResumeDraft(raw, memberB, emptyRevision), null);
  assert.equal(parsePendingResumeDraft(raw, memberA, emptyRevision)?.ownerToken, memberA);
});

test('successful logout cleanup removes every resume draft key and preserves unrelated state', () => {
  const values = new Map([
    ['wap:resume-coach:pending-draft', 'legacy'],
    ['wap:resume-coach:pending-draft:member-a', 'private-a'],
    ['wap:resume-coach:pending-draft:member-b', 'private-b'],
    ['theme', 'dark'],
  ]);
  const storage = {
    get length() { return values.size; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
  };

  purgePendingResumeDrafts(storage);
  assert.deepEqual([...values.entries()], [['theme', 'dark']]);
});
