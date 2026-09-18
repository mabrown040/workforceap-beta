import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { PROFILE_PHOTO_BUCKET } from '@/lib/portal/memberProfilePhoto';

const SIGNED_URL_TTL_SECONDS = 3600;

export async function getMemberProfilePhotoSignedUrl(
  userId: string,
): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { profilePhotoPath: true },
  });
  const path = profile?.profilePhotoPath?.trim();
  if (!path) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.error('[memberProfilePhotoUrl] createSignedUrl failed:', error);
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    console.error('[memberProfilePhotoUrl] signed URL error:', error);
    return null;
  }
}
