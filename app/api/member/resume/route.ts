import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

const BUCKET = 'member-resumes';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const includePlain =
    req.nextUrl.searchParams.get('includePlainText') === '1' ||
    req.nextUrl.searchParams.get('includePlainText') === 'true';

  try {
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

    let enhancedText: string | null = null;
    if (enhancedPath) {
      const { data: fileData } = await supabase.storage.from(BUCKET).download(enhancedPath);
      if (fileData) {
        enhancedText = await fileData.text();
      }
    }

    const extOf = (p: string | null | undefined) => {
      if (!p) return null;
      const base = p.split('/').pop() ?? '';
      const i = base.lastIndexOf('.');
      return i >= 0 ? base.slice(i + 1).toLowerCase() : null;
    };

    let resumePlainText: string | null = null;
    if (includePlain) {
      resumePlainText = (await getMemberResumePlainText(user.id, 12000)) || null;
    }

    return NextResponse.json({
      hasOriginal: !!originalPath,
      hasEnhanced: !!enhancedPath,
      originalUrl,
      enhancedUrl,
      enhancedText,
      /** Plain text extracted from stored resume (PDF/DOCX/TXT). Use for tools; omit unless `includePlainText`. */
      resumePlainText,
      originalExt: extOf(originalPath),
      enhancedExt: extOf(enhancedPath),
      /** Same-origin URL for inline iframe preview (PDF/DOC). */
      previewOriginalPath: originalPath ? '/api/member/resume/preview?variant=original' : null,
      previewEnhancedPath: enhancedPath ? '/api/member/resume/preview?variant=enhanced' : null,
    });
  } catch (err) {
    console.error('[member/resume] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
