import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import mammoth from 'mammoth';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const BUCKET = 'member-resumes';

type Props = { params: Promise<{ memberId: string }> };export const POST = withApiGuc(async (req: NextRequest, { params }: Props) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const allowed = await assertStaffCanAccessMemberRecord(user.id, memberId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const variant = req.nextUrl.searchParams.get('variant') === 'enhanced' ? 'enhanced' : 'original';

  const profile = await prisma.$transaction((tx) => tx.profile.findUnique({
    where: { userId: memberId },
    select: { resumeOriginalPath: true, resumeEnhancedPath: true },
  }));

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
    const { value: html } = await mammoth.convertToHtml({ buffer: buf });
    return NextResponse.json({
      html: `<div class="mammoth-doc">${html}</div>`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not convert this document for preview. Try PDF or download the file.' },
      { status: 422 }
    );
  }

  } catch (error) {
    console.error('/counselor/members/[memberId]/resume/docx-html error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

