import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const BUCKET = 'member-resumes';

function storageErrorMessage(error: { message?: string } | null, action: 'sign' | 'download'): string {
  const message = error?.message ?? '';
  if (/not found|does not exist|Bucket/i.test(message)) {
    return `Storage is not configured. Create the ${BUCKET} bucket in Supabase Storage.`;
  }
  return action === 'sign' ? 'Could not create resume download link' : 'Could not load resume file';
}export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const includePlain =
      req.nextUrl.searchParams.get('includePlainText') === '1' ||
      req.nextUrl.searchParams.get('includePlainText') === 'true';
  
    const memberId = req.nextUrl.searchParams.get('memberId');
    const targetUserId = memberId || user.id;
  
    // Authorize: own resume, admin, or assigned counselor
    if (targetUserId !== user.id) {
      const [admin, counselor] = await Promise.all([
        isAdmin(user.id),
        isCounselor(user.id),
      ]);
      if (!admin && !counselor) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Counselors: verify assignment
      if (counselor && !admin) {
        const assignment = await prisma.$transaction((tx) => tx.counselorAssignment.findFirst({
          where: { memberId: targetUserId, active: true },
          include: { counselor: { select: { userId: true } } },
        }));
        if (!assignment || assignment.counselor.userId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }
  
    try {
      const profile = await prisma.$transaction((tx) => tx.profile.findUnique({
        where: { userId: targetUserId },
      }));
  
      const originalPath = profile?.resumeOriginalPath;
      const enhancedPath = profile?.resumeEnhancedPath;
  
      const supabase = getSupabaseAdmin();
      let originalUrl: string | null = null;
      let enhancedUrl: string | null = null;
  
      if (originalPath) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(originalPath, 3600);
        if (error || !data?.signedUrl) {
          console.error('[member/resume] createSignedUrl original failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'sign') }, { status: 502 });
        }
        originalUrl = data.signedUrl;
      }
      if (enhancedPath) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(enhancedPath, 3600);
        if (error || !data?.signedUrl) {
          console.error('[member/resume] createSignedUrl enhanced failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'sign') }, { status: 502 });
        }
        enhancedUrl = data.signedUrl;
      }
  
      let enhancedText: string | null = null;
      if (enhancedPath) {
        const { data: fileData, error } = await supabase.storage.from(BUCKET).download(enhancedPath);
        if (error || !fileData) {
          console.error('[member/resume] download enhanced failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'download') }, { status: 502 });
        }
        enhancedText = await fileData.text();
      }
  
      const extOf = (p: string | null | undefined) => {
        if (!p) return null;
        const base = p.split('/').pop() ?? '';
        const i = base.lastIndexOf('.');
        return i >= 0 ? base.slice(i + 1).toLowerCase() : null;
      };
  
      let resumePlainText: string | null = null;
      if (includePlain) {
        resumePlainText = (await getMemberResumePlainText(targetUserId, 12000)) || null;
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
  } catch (error) {
    console.error('/member/resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
