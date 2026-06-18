import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateFileType } from '@/lib/resume/file-validation';
import { awardPoints } from '@/lib/member/points';
import { Buffer } from 'node:buffer';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/** Create bucket `member-resumes` in Supabase Dashboard → Storage if it does not exist (private bucket is fine). */
const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024;export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Provide a file' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateFileType(buffer, file.type || '', file.name)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const RESUME_MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' };
    const path = `${user.id}/resume-original.${ext}`;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      upsert: true,
      contentType: RESUME_MIME[ext] ?? 'application/octet-stream',
    });

    if (error) {
      console.error('Resume upload error:', error);
      const m = error.message ?? '';
      if (/not found|does not exist|Bucket/i.test(m)) {
        return NextResponse.json({ error: 'Storage is not configured. Create the member-resumes bucket in Supabase (Storage).' }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
    }

    await prisma.$transaction((tx) => tx.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, resumeOriginalPath: path, role: 'member' },
      update: { resumeOriginalPath: path },
    }));

    // Award points for first resume upload (idempotent — fixed entityId means
    // re-uploading the same or a new resume only awards once).
    awardPoints(user.id, 'resume_uploaded', 'first-upload').catch(() => {});

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    console.error('Resume upload route error:', e);
    const msg =
      e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server configuration error (Supabase)'
        : 'Failed to process upload';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
