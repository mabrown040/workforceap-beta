import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateFileType } from '@/lib/resume/file-validation';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';

const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
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

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Provide a file' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!validateFileType(buffer, file.type || '', file.name)) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${memberId}/resume-original.${ext}`;
  const supabase = getSupabaseAdmin();

  const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });

  if (storageError) {
    console.error('[upload-resume] storage error', storageError);
    return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
  }

  await prisma.profile.upsert({
    where: { userId: memberId },
    create: { userId: memberId, resumeOriginalPath: path },
    update: { resumeOriginalPath: path },
  });

  let text = '';
  try {
    text = await extractTextFromResumeBuffer(buffer, ext);
  } catch (err) {
    console.error('[upload-resume] text extraction failed', err);
  }

  return NextResponse.json({ ok: true, text: text.slice(0, 8000) });
}
