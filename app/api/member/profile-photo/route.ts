import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { invalidateMemberState } from '@/lib/member/getMemberState';
import { getMemberProfilePhotoSignedUrl } from '@/lib/portal/memberProfilePhotoUrl';
import {
  PROFILE_PHOTO_BUCKET,
  profilePhotoStorageErrorMessage,
} from '@/lib/portal/memberProfilePhoto';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = await getMemberProfilePhotoSignedUrl(user.id);
    return NextResponse.json({ url, expiresIn: url ? 3600 : null });
  } catch (error) {
    console.error('/member/profile-photo GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { profilePhotoPath: true },
    });
    const path = profile?.profilePhotoPath?.trim();
    if (!path) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseAdmin();
    const { error: removeError } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
    if (removeError) {
      console.error('[member/profile-photo] storage remove failed', removeError);
      return NextResponse.json(
        { error: profilePhotoStorageErrorMessage(removeError) },
        { status: 500 },
      );
    }

    await prisma.$transaction((tx) =>
      tx.profile.update({
        where: { userId: user.id },
        data: { profilePhotoPath: null },
      }),
    );

    await invalidateMemberState(user.id);

    auditLog({
      actorUserId: user.id,
      action: 'member.profilePhoto.delete',
      targetType: 'ProfilePhoto',
      targetId: user.id,
    }).catch(() => {});
    logAuditEvent({
      user: { id: user.id, role: 'member' },
      verb: 'delete',
      object: { type: 'ProfilePhoto', id: user.id },
      result: { success: true },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/member/profile-photo DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
