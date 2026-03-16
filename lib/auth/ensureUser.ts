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

  try {
    await prisma.user.upsert({
      where: { id: supabaseUser.id },
      create: {
        id: supabaseUser.id,
        email,
        fullName,
      },
      update: {},
    });
  } catch (err: unknown) {
    // If a user with this email already exists (e.g. duplicate from old record),
    // update the existing record's id to match the auth user, or just skip if id matches
    const isUniqueError =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002';

    if (isUniqueError) {
      // Try to find by email and update the id to match auth
      await prisma.user.upsert({
        where: { email },
        create: { id: supabaseUser.id, email, fullName },
        update: { id: supabaseUser.id },
      });
    } else {
      throw err;
    }
  }
}
