import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  disableAuthUserForSoftDelete,
  reenableAuthUserAfterRestore,
} from '@/lib/admin/authUserLifecycle';

const updateUserById = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const admin = { auth: { admin: { updateUserById, createUser, deleteUser } } } as never;

const user = { id: 'user-1', email: 'person@example.org', fullName: 'A Person', phone: null };

describe('auth user lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteUser.mockResolvedValue({ error: null });
  });

  it('soft delete bans the login and treats an already-missing login as done', async () => {
    updateUserById.mockResolvedValueOnce({ error: null });
    expect(await disableAuthUserForSoftDelete(admin, 'user-1')).toEqual({ ok: true, alreadyMissing: false });

    updateUserById.mockResolvedValueOnce({ error: { message: 'User not found', status: 404 } });
    expect(await disableAuthUserForSoftDelete(admin, 'user-1')).toEqual({ ok: true, alreadyMissing: true });
  });

  it('restore lifts the ban and re-syncs the email when the address is free', async () => {
    updateUserById.mockResolvedValueOnce({ error: null });

    const result = await reenableAuthUserAfterRestore(admin, user);

    expect(result).toEqual({ ok: true, action: 'unbanned' });
    expect(updateUserById).toHaveBeenCalledWith('user-1', {
      ban_duration: 'none',
      email: 'person@example.org',
      email_confirm: true,
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('restore still lifts the ban when the row email belongs to another login', async () => {
    // Scenario from the 9/5/26 report: the admin's sign-in address differed
    // from the users row that backed it, and the row's address was also held
    // by a second auth user. Re-syncing the email would fail; unbanning must not.
    updateUserById
      .mockResolvedValueOnce({
        error: { message: 'A user with this email address has already been registered', status: 422 },
      })
      .mockResolvedValueOnce({ error: null });

    const result = await reenableAuthUserAfterRestore(admin, user);

    expect(result).toEqual({ ok: true, action: 'unbanned' });
    expect(updateUserById).toHaveBeenLastCalledWith('user-1', { ban_duration: 'none' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('restore re-creates a hard-deleted login under the same id', async () => {
    updateUserById.mockResolvedValueOnce({ error: { message: 'User not found', status: 404 } });
    createUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const result = await reenableAuthUserAfterRestore(admin, user);

    expect(result).toEqual({ ok: true, action: 'recreated' });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', email: 'person@example.org', email_confirm: true }),
    );
  });

  it('restore reports other provider errors instead of guessing', async () => {
    updateUserById.mockResolvedValueOnce({ error: { message: 'Database error', status: 500 } });

    const result = await reenableAuthUserAfterRestore(admin, user);

    expect(result).toEqual({ ok: false, message: 'Database error' });
    expect(createUser).not.toHaveBeenCalled();
  });
});
