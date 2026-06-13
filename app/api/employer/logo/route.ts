import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const BUCKET = 'employer-logos';
const MAX_SIZE = 2 * 1024 * 1024;export const POST = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg'].includes(ext)) {
    return NextResponse.json({ error: 'Use PNG or JPG only' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const path = `${ctx.employerId}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (error) {
    console.error('[employer logo] upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Ensure the employer-logos bucket exists in Supabase Storage.' },
      { status: 500 }
    );
  }

  await prisma.$transaction((tx) => tx.employer.update({
    where: { id: ctx.employerId },
    data: { logoUrl: path },
  }));

  return NextResponse.json({ ok: true, logoUrl: resolveSupabasePublicAssetUrl(BUCKET, path) });

  } catch (error) {
    console.error('/employer/logo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

