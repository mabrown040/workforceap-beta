import test from 'node:test';
import assert from 'node:assert/strict';

import { claimPendingInvitationForAccept } from './_invitationClaim';

test('claimPendingInvitationForAccept claims only pending unexpired invitations', async () => {
  const calls: any[] = [];
  const tx = {
    invitation: {
      updateMany: async (args: any) => {
        calls.push(args);
        return { count: 1 };
      },
    },
  };

  await claimPendingInvitationForAccept(tx as any, 'invite-1', 'user-1');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.id, 'invite-1');
  assert.equal(calls[0].where.status, 'pending');
  assert.ok(calls[0].where.expiresAt.gt instanceof Date);
  assert.equal(calls[0].data.status, 'accepted');
  assert.equal(calls[0].data.acceptedById, 'user-1');
  assert.ok(calls[0].data.acceptedAt instanceof Date);
});

test('claimPendingInvitationForAccept rejects already-claimed invitations', async () => {
  const tx = {
    invitation: {
      updateMany: async () => ({ count: 0 }),
    },
  };

  await assert.rejects(
    () => claimPendingInvitationForAccept(tx as any, 'invite-1', 'user-1'),
    /INVITATION_NOT_CLAIMED/,
  );
});
