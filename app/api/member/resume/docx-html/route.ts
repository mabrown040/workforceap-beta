import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeDocxPreviewHtml } from '@/lib/html/sanitizeDocxPreviewHtml';

const BUCKET = 'member-resumes';

/**
 * Converts stored DOC/DOCX to HTML for same-origin inline preview (iframe srcDoc + sandbox).
 * POST /api/member/resume/docx-html?variant=original|enhanced
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const variant = req.nextUrl.searchParams.get('variant') === 'enhanced' ? 'enhanced' : 'original';

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { resumeOriginalPath: true, resumeEnhancedPath: true },
  });

  const path =
    variant === 'enhanced' ? profile?.resumeEnhancedPath : profile?.resumeOriginalPath;
  if (!path) {
    return NextResponse.json({ error: 'No file for this variant' }, { status: 404 });
  }

  const lower = path.toLowerCase();
  if (!lower.endsWith('.docx') && !lower.endsWith('.doc')) {
    return NextResponse.json({ error: 'Not a Word document' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return NextResponse.json({ error: 'Could not load file' }, { status: 502 });
  }

  const buf = Buffer.from(await data.arrayBuffer());
  try {
    const mammoth = await import('mammoth');
    const { value: rawHtml } = await mammoth.convertToHtml({ buffer: buf });
    const html = sanitizeDocxPreviewHtml(rawHtml);
    return NextResponse.json({
      html: `<div class="mammoth-doc">${html}</div>`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not convert this document for preview. Try PDF or download the file.' },
      { status: 422 }
    );
  }
}
