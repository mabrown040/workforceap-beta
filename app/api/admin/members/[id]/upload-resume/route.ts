import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Create bucket "member-resumes" in Supabase Dashboard → Storage if it doesn't exist
const BUCKET = 'member-resumes';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

// Magic bytes for allowed file types
const MAGIC_BYTES: Array<{ ext: string; bytes: number[] }> = [
  { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: 'doc', bytes: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2 (DOC)
  { ext: 'docx', bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK (ZIP/DOCX)
];

function validateFileType(buffer: Buffer, mimeType: string, fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return false;

  // Check magic bytes
  if (buffer.length < 4) return false;
  const matchesMagic = MAGIC_BYTES.some(
    (m) => m.bytes.every((b, i) => buffer[i] === b)
  );
  return matchesMagic;
}

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
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileType(buffer, file.type || '', file.name)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `${userId}/resume-original.${ext}`;
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
