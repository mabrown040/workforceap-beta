import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getSubjectOrganizationId } from "@/lib/tenant/organization";
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateFileType } from '@/lib/resume/file-validation';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 5).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The member existence check goes through `withTenantScope` so a
 * counselor from Org A cannot upload a resume to an Org B member's
 * profile by guessing the UUID. `Profile` is NOT in
 * `TENANT_SCOPED_MODELS` — it inherits tenancy via the `userId` FK to
 * `User` — so the upsert stays on the raw client; the membership gate
 * above prevents cross-tenant writes.
 */

const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024;export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const [counselorRole, adminRole, superAdminRole] = await Promise.all([
      isCounselor(user.id),
      isAdmin(user.id),
      isSuperAdmin(user.id),
    ]);
    if (!counselorRole && !adminRole && !superAdminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
  
    const memberId = formData.get('memberId');
    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const onBehalf = await resolveActOnBehalf(user.id, memberId);
    if (!onBehalf.ok) {
      return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    }
    const authorizedMemberId = onBehalf.subjectUserId;
  
    const orgId = await getSubjectOrganizationId(authorizedMemberId);
    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id: authorizedMemberId },
        select: { id: true },
      }),
    );
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
  
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Provide a file' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
  
    if (!validateFileType(buffer, file.type || '', file.name)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 });
    }
  
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const RESUME_MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' };
    const path = `${authorizedMemberId}/resume-original.${ext}`;
    const supabase = getSupabaseAdmin();

    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      upsert: true,
      contentType: RESUME_MIME[ext] ?? 'application/octet-stream',
    });
  
    if (storageError) {
      console.error('[upload-resume] storage error', storageError);
      return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
    }
  
    await prisma.$transaction((tx) => tx.profile.upsert({
      where: { userId: authorizedMemberId },
      create: { userId: authorizedMemberId, resumeOriginalPath: path },
      update: { resumeOriginalPath: path },
    }));
  
    let text = '';
    try {
      text = await extractTextFromResumeBuffer(buffer, ext);
    } catch (err) {
      console.error('[upload-resume] text extraction failed', err);
    }
  
    void auditLog({ actorUserId: user.id, action: 'counselor_resume_uploaded', targetType: 'User', targetId: authorizedMemberId, metadata: {} }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'updated', object: { type: 'MemberResume', id: authorizedMemberId }, result: { success: true } }).catch(() => {});
    return NextResponse.json({ ok: true, text: text.slice(0, 8000) });
  } catch (error) {
    console.error('/counselor/sessions/upload-resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
