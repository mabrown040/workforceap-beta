import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Create bucket "member-resumes" in Supabase Dashboard → Storage if it doesn't exist
const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
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
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `${userId}/resume-original.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: file.type || 'application/pdf',
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

  if (member.profile && (originalPath || enhancedPath)) {
    await prisma.profile.update({
      where: { userId },
      data: {
        ...(originalPath && { resumeOriginalPath: originalPath }),
        ...(enhancedPath && { resumeEnhancedPath: enhancedPath }),
      },
    });
  }

  return NextResponse.json({ ok: true, originalPath, enhancedPath });
}
