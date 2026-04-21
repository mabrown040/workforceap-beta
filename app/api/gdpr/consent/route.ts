import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

/**
 * GET /api/gdpr/consent
 * Returns the user's current consent preferences.
 * 
 * PATCH /api/gdpr/consent
 * Updates consent preferences.
 * Body: { consentCommunications?: boolean }
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { consentTerms: true, consentCommunications: true },
  });

  return NextResponse.json({
    consentTerms: profile?.consentTerms ?? false,
    consentCommunications: profile?.consentCommunications ?? false,
  });
}

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const consentCommunications = typeof body.consentCommunications === 'boolean' ? body.consentCommunications : undefined;

  if (consentCommunications === undefined) {
    return NextResponse.json({ error: 'consentCommunications required' }, { status: 400 });
  }

  await prisma.profile.update({
    where: { userId: user.id },
    data: { consentCommunications },
  });

  // Log consent change
  await prisma.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${user.id},
      'consent_updated',
      'gdpr',
      ${JSON.stringify({ consentCommunications, updatedAt: new Date().toISOString() })},
      NOW()
    )
  `;

  return NextResponse.json({ ok: true });
}
