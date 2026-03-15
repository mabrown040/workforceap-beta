import { prisma } from '@/lib/db/prisma';

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

/**
 * Ensures the Supabase auth user exists in the Prisma users table.
 * Call before saving AI results, job applications, etc. so foreign keys succeed.
 */
export async function ensureUserInDb(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email ?? `${supabaseUser.id}@placeholder.local`;
  const fullName = (supabaseUser.user_metadata?.full_name as string) ?? 'Member';

  await prisma.user.upsert({
    where: { id: supabaseUser.id },
    create: {
      id: supabaseUser.id,
      email,
      fullName,
    },
    update: {},
  });
}
