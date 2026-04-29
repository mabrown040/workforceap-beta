import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateFileType } from '@/lib/resume/file-validation';
import { Buffer } from 'node:buffer';
import { logAuthenticationFailed, logFileUploadBlocked, logSuspiciousRequest } from '@/lib/security/securityLogger';

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Create bucket `member-resumes` in Supabase Dashboard → Storage if it does not exist (private bucket is fine). */
const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      logAuthenticationFailed('/api/member/resume/upload', getClientIp(request));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      logSuspiciousRequest('/api/member/resume/upload', getClientIp(request), {
        error: 'invalid_form_data',
        userAgent: request.headers.get('user-agent'),
      });
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Provide a file' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      logFileUploadBlocked('/api/member/resume/upload', getClientIp(request), user.id, {
        reason: 'file_too_large',
        size: file.size,
        maxSize: MAX_SIZE,
      });
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateFileType(buffer, file.type || '', file.name)) {
      logFileUploadBlocked('/api/member/resume/upload', getClientIp(request), user.id, {
        reason: 'invalid_file_type',
        fileType: file.type,
        fileName: file.name,
      });
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.' }, { status: 400 });
    }

    // Detect potential malware or suspicious files
    if (buffer.length < 100) {
      logSuspiciousRequest('/api/member/resume/upload', getClientIp(request), {
        userId: user.id,
        reason: 'suspiciously_small_file',
        size: buffer.length,
        fileName: file.name,
      });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `${user.id}/resume-original.${ext}`;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

    if (error) {
      console.error('Resume upload error:', error);
      const m = error.message ?? '';
      if (/not found|does not exist|Bucket/i.test(m)) {
        return NextResponse.json({ error: 'Storage is not configured. Create the member-resumes bucket in Supabase (Storage).' }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
    }

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, resumeOriginalPath: path, role: 'member' },
      update: { resumeOriginalPath: path },
    });

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    console.error('Resume upload route error:', e);
    const msg =
      e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server configuration error (Supabase)'
        : 'Failed to process upload';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
