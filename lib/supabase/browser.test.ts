import { describe, it, afterEach } from 'node:test';
import * as assert from 'node:assert';
import { createSupabaseBrowserClient } from './browser';

describe('createSupabaseBrowserClient', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  it('should throw an error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    assert.throws(
      () => createSupabaseBrowserClient(),
      { message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required' }
    );
  });

  it('should throw an error if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-url.com';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    assert.throws(
      () => createSupabaseBrowserClient(),
      { message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required' }
    );
  });

  it('should throw an error if both are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    assert.throws(
      () => createSupabaseBrowserClient(),
      { message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required' }
    );
  });

  it('should successfully call createBrowserClient if both are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-url.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const client = createSupabaseBrowserClient();
    assert.ok(client);
  });
});
