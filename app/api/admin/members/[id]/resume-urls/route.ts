import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isResumeObjectPathOwnedByUser } from '@/lib/resume/atomicResumeObjectSwap';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const BUCKET = 'member-resumes';

function storageErrorMessage(error: { message?: string } | null): string {
  const message = error?.message ?? '';
  if (/not found|does not exist|Bucket/i.test(message)) {
    return `Storage is not configured. Create the ${BUCKET} bucket in Supabase Storage.`;
  }
  return 'Could not create resume download link';
}export const GET = withApiGuc(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: memberId } = await params;

    // Tenant scope: verify the member belongs to the actor's org before
    // minting signed resume URLs. Profile isn't tenant-scoped directly
    // but is FK-bound to User; resolving via User.organizationId is the
    // canonical pattern.
    const orgId = await getActorOrganizationId(user.id);
    const member = await prisma.$transaction((tx) => tx.user.findFirst({
      where: { id: memberId, organizationId: orgId },
      select: { id: true },
    }));
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const profile = await prisma.$transaction((tx) => tx.profile.findUnique({
      where: { userId: memberId },
    }));

    const originalPath = profile?.resumeOriginalPath;
    const enhancedPath = profile?.resumeEnhancedPath;
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
        console.error('[admin/members/[id]/resume-urls] createSignedUrl original failed:', error);
        return NextResponse.json({ error: storageErrorMessage(error) }, { status: 502 });
      }
      originalUrl = data.signedUrl;
    }
    if (enhancedPath) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(enhancedPath, 3600);
      if (error || !data?.signedUrl) {
        console.error('[admin/members/[id]/resume-urls] createSignedUrl enhanced failed:', error);
        return NextResponse.json({ error: storageErrorMessage(error) }, { status: 502 });
      }
      enhancedUrl = data.signedUrl;
    }

    return NextResponse.json({
      hasOriginal: !!originalPath,
      hasEnhanced: !!enhancedPath,
      originalUrl,
      enhancedUrl,
      originalPath,
      enhancedPath,
    });
  } catch (error) {
    console.error('[admin/members/[id]/resume-urls GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
