import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'member-resumes';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { userId: memberId },
  });

  const originalPath = profile?.resumeOriginalPath;
  const enhancedPath = profile?.resumeEnhancedPath;

  const supabase = getSupabaseAdmin();
  let originalUrl: string | null = null;
  let enhancedUrl: string | null = null;

  if (originalPath) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(originalPath, 3600);
    originalUrl = data?.signedUrl ?? null;
  }
  if (enhancedPath) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(enhancedPath, 3600);
    enhancedUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json({
    hasOriginal: !!originalPath,
    hasEnhanced: !!enhancedPath,
    originalUrl,
    enhancedUrl,
    originalPath,
    enhancedPath,
  });
}
