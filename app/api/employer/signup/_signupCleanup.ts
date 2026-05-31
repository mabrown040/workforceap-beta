import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function cleanupCreatedEmployerSignupAuthUser(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<void> {
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('Employer signup auth cleanup failed:', error);
    }
  } catch (cleanupError) {
    console.error('Employer signup auth cleanup failed:', cleanupError);
  }
}
