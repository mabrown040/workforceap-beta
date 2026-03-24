import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

const BUCKET = 'organization-branding';
const MAX_SIZE = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = await getDefaultOrganizationId();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
    return NextResponse.json({ error: 'Use PNG, JPG, WebP, SVG, or GIF' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const path = `${organizationId}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (error) {
    console.error('[org logo] upload error:', error);
    return NextResponse.json(
      {
        error:
          'Upload failed. Create a public Supabase Storage bucket named organization-branding (same pattern as employer-logos).',
      },
      { status: 500 }
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const logo = pub.publicUrl;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { logo },
  });

  return NextResponse.json({ ok: true, logo });
}
