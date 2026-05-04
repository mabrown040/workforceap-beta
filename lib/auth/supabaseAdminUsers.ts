import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type SupabaseAuthUserLookupOptions = {
  perPage?: number;
  maxPages?: number;
};

export async function findSupabaseAuthUserByEmail(
  admin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  options: SupabaseAuthUserLookupOptions = {}
) {
  const normalized = email.toLowerCase().trim();
  const perPage = options.perPage ?? 200;
  const maxPages = options.maxPages ?? 25;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (users.length < perPage) break;
  }

  return null;
}
