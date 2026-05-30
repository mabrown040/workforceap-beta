import { getSupabaseAdmin } from '@/lib/supabase-admin';

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export async function deleteSupabaseAuthUser(
  userId: string,
  supabaseAdmin?: SupabaseAdminClient,
) {
  try {
    const admin = supabaseAdmin ?? getSupabaseAdmin();
    return await admin.auth.admin.deleteUser(userId);
  } catch (error) {
    return { error };
  }
}
