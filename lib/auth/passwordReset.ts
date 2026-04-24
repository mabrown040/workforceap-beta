import { createClient } from '@supabase/supabase-js';

const DEFAULT_SITE_URL = 'https://www.workforceap.org';

export async function sendPasswordResetEmail(email: string, redirectPath = '/reset-password') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Password reset is temporarily unavailable.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}${redirectPath}`,
  });
}
