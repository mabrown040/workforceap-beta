import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'member-resumes';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
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

  // Fetch enhanced text for preview (stored as .txt)
  let enhancedText: string | null = null;
  if (enhancedPath) {
    const { data: fileData } = await supabase.storage.from(BUCKET).download(enhancedPath);
    if (fileData) {
      enhancedText = await fileData.text();
    }
  }

  return NextResponse.json({
    hasOriginal: !!originalPath,
    hasEnhanced: !!enhancedPath,
    originalUrl,
    enhancedUrl,
    enhancedText,
  });
}
