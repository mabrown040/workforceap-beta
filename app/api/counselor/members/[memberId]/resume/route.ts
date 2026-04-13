import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';

const BUCKET = 'member-resumes';

function extOf(p: string | null | undefined) {
  if (!p) return null;
  const base = p.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1).toLowerCase() : null;
}

type Props = { params: Promise<{ memberId: string }> };

/** GET — resume metadata + signed URLs for assigned counselor / admin (same shape as `/api/member/resume`). */
export async function GET(_req: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;

  const allowed = await assertStaffCanAccessMemberRecord(user.id, memberId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: memberId },
      select: { resumeOriginalPath: true, resumeEnhancedPath: true },
    });

    const originalPath = profile?.resumeOriginalPath ?? null;
    const enhancedPath = profile?.resumeEnhancedPath ?? null;

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

    const base = `/api/counselor/members/${encodeURIComponent(memberId)}/resume`;

    return NextResponse.json({
      hasOriginal: !!originalPath,
      hasEnhanced: !!enhancedPath,
      originalUrl,
      enhancedUrl,
      enhancedText,
      originalExt: extOf(originalPath),
      enhancedExt: extOf(enhancedPath),
      previewOriginalPath: originalPath ? `${base}/preview?variant=original` : null,
      previewEnhancedPath: enhancedPath ? `${base}/preview?variant=enhanced` : null,
    });
  } catch (err) {
    console.error('[counselor/members/.../resume]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
