import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { completeCareerOsResumeActions } from '@/lib/workflows/completeCareerOsActions';
import { RESUME_TEXT_SAVE_ERROR, sanitizeResumePlainText } from '@/lib/resume/extractionQuality';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

const BUCKET = 'member-resumes';
const MAX_CHARS = 120_000;export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as { plainText?: unknown };
    const raw = typeof body.plainText === 'string' ? body.plainText : '';
    const safeText = sanitizeResumePlainText(raw);
    if (raw.trim() && !safeText) {
      return NextResponse.json({ error: RESUME_TEXT_SAVE_ERROR }, { status: 400 });
    }
    const plainText = safeText.length > MAX_CHARS ? safeText.slice(0, MAX_CHARS) : safeText;

    const supabase = getSupabaseAdmin();
    const path = `${user.id}/resume-enhanced.txt`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, plainText, {
      upsert: true,
      contentType: 'text/plain; charset=utf-8',
    });

    if (error) {
      console.error('[member/resume/plain-text] upload error:', error);
      return NextResponse.json({ error: 'Failed to save resume text' }, { status: 500 });
    }

    await prisma.$transaction((tx) => tx.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, resumeEnhancedPath: path, role: 'member' },
      update: { resumeEnhancedPath: path },
    }));

    if (plainText.trim().length >= 40) {
      await completeCareerOsResumeActions(user.id).catch((error) => {
        console.error('[member/resume/plain-text] completeCareerOsResumeActions failed:', error);
      });
    }

    auditLog({ actorUserId: user.id, action: 'member.resume.savePlainText', targetType: 'Resume', targetId: user.id }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Resume', id: user.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    console.error('[member/resume/plain-text] error:', e);
    return NextResponse.json({ error: 'Failed to save resume text' }, { status: 500 });
  }
});
