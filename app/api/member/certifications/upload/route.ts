import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/member/certifications/upload
 *
 * Accepts a multipart/form-data upload with:
 *   - file: the certificate file (PDF/image)
 *   - certName: the certificate name to associate with
 *
 * Stores via Supabase Storage if configured, or returns a soft success
 * so the cert is still recorded in the DB even without file storage.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const certName = formData.get('certName') as string | null;

  if (!file || !certName) {
    return NextResponse.json({ error: 'file and certName are required' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only PDF and image files are accepted' }, { status: 400 });
  }

  // Verify the cert exists for this user
  const cert = await prisma.userCertification.findUnique({
    where: { userId_certName: { userId: user.id, certName } },
  });
  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found — add it first' }, { status: 404 });
  }

  // If Supabase storage is configured, upload there
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const bytes = await file.arrayBuffer();
      const storagePath = `cert-files/${user.id}/${cert.id}.${ext}`;

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/member-files/${storagePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: bytes,
        }
      );

      if (uploadRes.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/member-files/${storagePath}`;
        // Store the file URL on the certification record if schema supports it
        // (graceful — skip if column doesn't exist yet)
        try {
          await (prisma.userCertification as unknown as { update: (args: unknown) => Promise<unknown> }).update({
            where: { id: cert.id },
            data: { fileUrl: publicUrl } as Record<string, unknown>,
          });
        } catch {
          // Column might not exist yet — cert is still recorded
        }
        return NextResponse.json({ success: true, fileUrl: publicUrl });
      }
    } catch (e) {
      console.error('[cert-upload] storage upload failed', e);
      // Fall through — cert is still recorded, just without file
    }
  }

  // Return soft success — cert is in DB, file just couldn't be stored
  return NextResponse.json({ success: true, note: 'Certificate recorded. File storage not available — contact support to attach the PDF.' });
}
