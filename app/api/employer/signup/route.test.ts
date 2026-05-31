import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanupCreatedEmployerSignupAuthUser } from './_signupCleanup';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

test('cleanupCreatedEmployerSignupAuthUser deletes the created auth user', async () => {
  const deletedUserIds: string[] = [];
  const admin = {
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          deletedUserIds.push(userId);
          return { error: null };
        },
      },
    },
  } as unknown as ReturnType<typeof getSupabaseAdmin>;

  await cleanupCreatedEmployerSignupAuthUser(admin, 'user-123');

  assert.deepEqual(deletedUserIds, ['user-123']);
});

test('cleanupCreatedEmployerSignupAuthUser swallows cleanup failures', async (t) => {
  const originalError = console.error;
  let logged = false;

  t.after(() => {
    console.error = originalError;
  });

  console.error = () => {
    logged = true;
  };

  const admin = {
    auth: {
      admin: {
        deleteUser: async () => {
          throw new Error('cleanup failed');
        },
      },
    },
  } as unknown as ReturnType<typeof getSupabaseAdmin>;

  await cleanupCreatedEmployerSignupAuthUser(admin, 'user-123');

  assert.equal(logged, true);
});
