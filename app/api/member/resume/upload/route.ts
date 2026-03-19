import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  if (!['pdf', 'doc', 'docx'].includes(ext)) {
    return NextResponse.json({ error: 'Only PDF, DOC, DOCX allowed' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const path = `${user.id}/resume-original.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  });

  if (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, resumeOriginalPath: path, role: 'member' },
    update: { resumeOriginalPath: path },
  });

  return NextResponse.json({ ok: true, path });
}
