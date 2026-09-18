// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findProfile: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  extractTextFromResumeBuffer: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: { profile: { findUnique: mocks.findProfile } } }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock('@/lib/resume/extractTextFromResumeBuffer', () => ({
  extractTextFromResumeBuffer: mocks.extractTextFromResumeBuffer,
}));

import {
  __resetAdminUnavailableWarningForTests,
  getMemberResumePlainText,
} from '@/lib/member/getMemberResumePlainText';

const CONFIG_ERROR = 'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL required for admin operations';
const USER = 'member-1';
const profileWithResume = {
  userId: USER,
  resumeOriginalPath: `${USER}/original.pdf`,
  resumeEnhancedPath: `${USER}/enhanced.pdf`,
};

describe('getMemberResumePlainText without a Supabase service-role client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAdminUnavailableWarningForTests();
    mocks.findProfile.mockResolvedValue(profileWithResume);
  });

  it('returns empty text instead of throwing when the admin client cannot be built', async () => {
    mocks.getSupabaseAdmin.mockImplementation(() => {
      throw new Error(CONFIG_ERROR);
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getMemberResumePlainText(USER, 8000, { preferOriginal: true })).resolves.toBe('');
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.join(' ')).toContain('SUPABASE_SERVICE_ROLE_KEY');

    // The misconfiguration is logged once per process, not once per page view.
    await expect(getMemberResumePlainText(USER)).resolves.toBe('');
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('never touches storage during a read-only audit or when the member has no resume', async () => {
    mocks.getSupabaseAdmin.mockImplementation(() => {
      throw new Error(CONFIG_ERROR);
    });
    await expect(getMemberResumePlainText(USER, 8000, { readOnlyAudit: true })).resolves.toBe('');
    expect(mocks.findProfile).not.toHaveBeenCalled();
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();

    mocks.findProfile.mockResolvedValue({ userId: USER, resumeOriginalPath: null, resumeEnhancedPath: null });
    await expect(getMemberResumePlainText(USER)).resolves.toBe('');
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('treats a storage failure on one path as best-effort and tries the next', async () => {
    const download = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce({
        data: { arrayBuffer: async () => new TextEncoder().encode('resume').buffer },
        error: null,
      });
    mocks.getSupabaseAdmin.mockReturnValue({ storage: { from: () => ({ download }) } });
    mocks.extractTextFromResumeBuffer.mockResolvedValue(
      'Michael Brown. Program director with fifteen years of workforce development experience across Texas.',
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const text = await getMemberResumePlainText(USER, 8000, { preferOriginal: true });
    expect(text).toContain('workforce development');
    expect(download).toHaveBeenCalledTimes(2);
    expect(download.mock.calls[0]?.[0]).toBe(`${USER}/original.pdf`);
    expect(download.mock.calls[1]?.[0]).toBe(`${USER}/enhanced.pdf`);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
