import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateFileType } from '@/lib/resume/file-validation';
import { completeCareerOsResumeActions } from '@/lib/workflows/completeCareerOsActions';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

// Create bucket "member-resumes" in Supabase Dashboard → Storage if it does not exist
const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024;export const POST = withApiGuc(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  // Tenant scope: an admin can only upload resumes for members of
  // their organization. Without this filter, an admin from Org A
  // could overwrite an Org B member's resume blob.
  const orgId = await getActorOrganizationId(user.id);
  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: userId, organizationId: orgId },
    include: { profile: true },
  }));
  if (!member || member.deletedAt) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('resumeOriginal') as File | null;
  const enhancedText = formData.get('resumeEnhanced') as string | null;

  if (!file && !enhancedText) {
    return NextResponse.json({ error: 'Provide resumeOriginal file and/or resumeEnhanced text' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let originalPath: string | null = null;
  let enhancedPath: string | null = null;

  if (file && file.size > 0) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
    if (!validateFileType(buffer, file.type || '', file.name, { allowTxt: true })) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.' }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const RESUME_MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' };
    const path = `${userId}/resume-original.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      upsert: true,
      contentType: RESUME_MIME[ext] ?? 'application/octet-stream',
    });
    if (error) {
      console.error('Resume upload error:', error);
      return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
    }
    originalPath = path;
  }

  if (enhancedText && enhancedText.trim()) {
    const path = `${userId}/resume-enhanced.txt`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, enhancedText.trim(), {
      upsert: true,
      contentType: 'text/plain',
    });
    if (error) {
      console.error('Enhanced resume upload error:', error);
      return NextResponse.json({ error: 'Failed to upload enhanced resume' }, { status: 500 });
    }
    enhancedPath = path;
  }

  if (originalPath || enhancedPath) {
    await prisma.$transaction((tx) => tx.profile.upsert({
      where: { userId },
      create: {
        userId,
        role: member.profile?.role ?? 'member',
        ...(originalPath && { resumeOriginalPath: originalPath }),
        ...(enhancedPath && { resumeEnhancedPath: enhancedPath }),
      },
      update: {
        ...(originalPath && { resumeOriginalPath: originalPath }),
        ...(enhancedPath && { resumeEnhancedPath: enhancedPath }),
      },
    }));
  }

  if (enhancedPath && enhancedText && enhancedText.trim().length >= 40) {
    await completeCareerOsResumeActions(userId).catch((error) => {
      console.error('[admin/upload-resume] completeCareerOsResumeActions failed:', error);
    });
  }

  auditLog({
    actorUserId: user.id,
    action: 'admin_member_resume_upload',
    targetType: 'User',
    targetId: userId,
    metadata: { originalPath, enhancedPath },
  }).catch((err) => console.error('[upload-resume] audit log failed:', err));
  logAuditEvent({
    user: { id: user.id, role: 'admin' },
    verb: 'uploaded',
    object: { type: 'MemberResume', id: userId },
    result: { success: true, extensions: { originalPath, enhancedPath } },
    request: auditRequestMeta(request),
  }).catch((err) => console.error('[upload-resume] xAPI audit log failed:', err));

  return NextResponse.json({ ok: true, originalPath, enhancedPath });

  } catch (error) {
    console.error('/admin/members/[id]/upload-resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

