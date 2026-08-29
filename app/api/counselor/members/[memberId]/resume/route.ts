import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { isResumeObjectPathOwnedByUser } from '@/lib/resume/atomicResumeObjectSwap';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const BUCKET = 'member-resumes';

function pathRevision(path: string): string {
  return createHash('sha256').update(path).digest('hex').slice(0, 16);
}

function storageErrorMessage(error: { message?: string } | null, action: 'sign' | 'download'): string {
  const message = error?.message ?? '';
  if (/not found|does not exist|Bucket/i.test(message)) {
    return `Storage is not configured. Create the ${BUCKET} bucket in Supabase Storage.`;
  }
  return action === 'sign' ? 'Could not create resume download link' : 'Could not load resume file';
}

function extOf(p: string | null | undefined) {
  if (!p) return null;
  const base = p.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1).toLowerCase() : null;
}

type Props = { params: Promise<{ memberId: string }> };export const GET = withApiGuc(async (_req: NextRequest, { params }: Props) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const { memberId } = await params;
  
    const allowed = await assertStaffCanAccessMemberRecord(user.id, memberId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    try {
      const profile = await prisma.$transaction((tx) => tx.profile.findUnique({
        where: { userId: memberId },
        select: { resumeOriginalPath: true, resumeEnhancedPath: true },
      }));
  
      const originalPath = profile?.resumeOriginalPath ?? null;
      const enhancedPath = profile?.resumeEnhancedPath ?? null;
      if ((originalPath && !isResumeObjectPathOwnedByUser(memberId, originalPath))
        || (enhancedPath && !isResumeObjectPathOwnedByUser(memberId, enhancedPath))) {
        return NextResponse.json({ error: 'Resume record is invalid' }, { status: 409 });
      }
  
      const supabase = getSupabaseAdmin();
      let originalUrl: string | null = null;
      let enhancedUrl: string | null = null;
  
      if (originalPath) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(originalPath, 3600);
        if (error || !data?.signedUrl) {
          console.error('[counselor/members/.../resume] createSignedUrl original failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'sign') }, { status: 502 });
        }
        originalUrl = data.signedUrl;
      }
      if (enhancedPath) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(enhancedPath, 3600);
        if (error || !data?.signedUrl) {
          console.error('[counselor/members/.../resume] createSignedUrl enhanced failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'sign') }, { status: 502 });
        }
        enhancedUrl = data.signedUrl;
      }
  
      let enhancedText: string | null = null;
      if (enhancedPath) {
        const { data: fileData, error } = await supabase.storage.from(BUCKET).download(enhancedPath);
        if (error || !fileData) {
          console.error('[counselor/members/.../resume] download enhanced failed:', error);
          return NextResponse.json({ error: storageErrorMessage(error, 'download') }, { status: 502 });
        }
        enhancedText = await fileData.text();
      }
  
      const base = `/api/counselor/members/${encodeURIComponent(memberId)}/resume`;
  
      return NextResponse.json({
        hasOriginal: !!originalPath,
        hasEnhanced: !!enhancedPath,
        originalUrl,
        enhancedUrl,
        enhancedText,
        originalExt: extOf(originalPath),
        enhancedExt: extOf(enhancedPath),
        previewOriginalPath: originalPath
          ? `${base}/preview?variant=original&v=${pathRevision(originalPath)}`
          : null,
        previewEnhancedPath: enhancedPath
          ? `${base}/preview?variant=enhanced&v=${pathRevision(enhancedPath)}`
          : null,
      });
    } catch (err) {
      console.error('[counselor/members/.../resume]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/counselor/members/[memberId]/resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
