import { getSupabaseAdmin } from '@/lib/supabase-admin';

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export async function deleteSupabaseAuthUser(
  userId: string,
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin(),
) {
  return supabaseAdmin.auth.admin.deleteUser(userId);
}
