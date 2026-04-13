import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Create bucket `member-resumes` in Supabase Dashboard → Storage if it does not exist (private bucket is fine). */
const BUCKET = 'member-resumes';

const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'txt']);

function safeExt(fileName: string): string | null {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXT.has(ext) ? ext : null;
}

function resumePathForUser(userId: string, ext: string) {
  return `${userId}/resume-original.${ext}`;
}

function isValidCompletePath(userId: string, path: string): boolean {
  if (!path.startsWith(`${userId}/`)) return false;
  return /^[^/]+\/resume-original\.(pdf|doc|docx|txt)$/.test(path);
}

function storageErrorMessage(error: { message?: string } | null): string {
  const m = error?.message ?? '';
  if (/not found|does not exist|Bucket/i.test(m)) {
    return 'Storage is not configured. Create the member-resumes bucket in Supabase (Storage).';
  }
  return 'Failed to prepare upload';
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Expected JSON body with action prepare or complete.' },
        { status: 415 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === 'prepare') {
      const fileName = typeof body.fileName === 'string' ? body.fileName : '';
      const ext = safeExt(fileName);
      if (!ext) {
        return NextResponse.json({ error: 'Only PDF, DOC, DOCX, TXT allowed' }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const path = resumePathForUser(user.id, ext);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        console.error('Resume prepare error:', error);
        return NextResponse.json(
          { error: storageErrorMessage(error) },
          { status: 500 }
        );
      }

      return NextResponse.json({
        bucket: BUCKET,
        path: data.path,
        token: data.token,
      });
    }

    if (body.action === 'complete') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path || !isValidCompletePath(user.id, path)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, resumeOriginalPath: path, role: 'member' },
        update: { resumeOriginalPath: path },
      });

      return NextResponse.json({ ok: true, path });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Resume upload route error:', e);
    const msg =
      e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server configuration error (Supabase)'
        : 'Failed to process upload';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
