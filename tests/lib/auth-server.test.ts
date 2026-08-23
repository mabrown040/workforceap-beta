import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

vi.mock('next/navigation', () => ({
  unstable_rethrow: vi.fn((err: unknown) => {
    const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : '';
    if (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_')) {
      throw err;
    }
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key, options) => ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/supabaseCookieOptions', () => ({
  getSupabaseCookieOptions: vi.fn(() => ({})),
  SESSION_ONLY_COOKIE: 'session_only',
}));

// ─── Imports after mocks ───
import { hasSupabaseServerEnv, createSupabaseServerClient, getSession, getUser } from '@/lib/auth/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const AUTH_COOKIE = { name: 'sb-workforceap-auth-token', value: 'base64.jwt' };

function mockDefaultCookieStore(cookieList: { name: string; value: string }[] = []) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(),
    getAll: vi.fn(() => cookieList),
    set: vi.fn(),
  } as any);
}

describe('hasSupabaseServerEnv', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false when env vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(hasSupabaseServerEnv()).toBe(false);
  });

  it('returns true when both env vars are present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    expect(hasSupabaseServerEnv()).toBe(true);
  });

  it('returns false when only URL is present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(hasSupabaseServerEnv()).toBe(false);
  });

  it('returns false when only key is present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    expect(hasSupabaseServerEnv()).toBe(false);
  });
});

describe('createSupabaseServerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockDefaultCookieStore();
  });

  it('throws when env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    await expect(createSupabaseServerClient()).rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  });

  it('creates client with env vars', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    await createSupabaseServerClient();
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.objectContaining({
        cookieOptions: expect.any(Object),
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it('reads session_only cookie', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    const mockGet = vi.fn().mockReturnValue({ value: '1' });
    vi.mocked(cookies).mockResolvedValue({
      get: mockGet,
      getAll: vi.fn(() => []),
      set: vi.fn(),
    } as any);

    await createSupabaseServerClient();
    expect(mockGet).toHaveBeenCalledWith('session_only');
  });
});

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockDefaultCookieStore();
  });

  it('returns null when env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('returns null when no Supabase session cookie is present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    const session = await getSession();
    expect(session).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('returns session from supabase', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    mockDefaultCookieStore([AUTH_COOKIE]);

    const mockSession = { user: { id: 'user-123' } };
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      },
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const session = await getSession();
    expect(session).toEqual(mockSession);
    expect(mockClient.auth.getSession).toHaveBeenCalled();
  });

  it('returns null when supabase session is null', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    mockDefaultCookieStore([AUTH_COOKIE]);

    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('rethrows Next dynamic server usage errors instead of treating them as signed out', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    const dynamicError = Object.assign(new Error('Dynamic server usage'), {
      digest: 'DYNAMIC_SERVER_USAGE',
    });
    vi.mocked(cookies).mockRejectedValue(dynamicError);

    await expect(getSession()).rejects.toBe(dynamicError);
  });
});

describe('getUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockDefaultCookieStore();
  });

  it('returns null when env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const user = await getUser();
    expect(user).toBeNull();
  });

  it('returns null when no Supabase session cookie is present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    const user = await getUser();
    expect(user).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('returns user from supabase', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    mockDefaultCookieStore([AUTH_COOKIE]);

    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const user = await getUser();
    expect(user).toEqual(mockUser);
    expect(mockClient.auth.getUser).toHaveBeenCalled();
  });

  it('returns null when supabase user is null', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    mockDefaultCookieStore([AUTH_COOKIE]);

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const user = await getUser();
    expect(user).toBeNull();
  });

  it('returns null when Supabase returns an auth error', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    mockDefaultCookieStore([AUTH_COOKIE]);

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid JWT' },
        }),
      },
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const user = await getUser();
    expect(user).toBeNull();
  });

  it('rethrows Next dynamic server usage errors instead of treating them as signed out', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    const dynamicError = Object.assign(new Error('Dynamic server usage'), {
      digest: 'DYNAMIC_SERVER_USAGE',
    });
    vi.mocked(cookies).mockRejectedValue(dynamicError);

    await expect(getUser()).rejects.toBe(dynamicError);
  });
});
