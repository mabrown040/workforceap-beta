import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.$transaction((tx) => tx.profile.findUnique({
    where: { userId: user.id },
    select: { consentTerms: true, consentCommunications: true },
  }));

  return NextResponse.json({
    consentTerms: profile?.consentTerms ?? false,
    consentCommunications: profile?.consentCommunications ?? false,
  });

  } catch (error) {
    console.error('/gdpr/consent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _PATCH(request: Request) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const consentCommunications = typeof body.consentCommunications === 'boolean' ? body.consentCommunications : undefined;

  if (consentCommunications === undefined) {
    return NextResponse.json({ error: 'consentCommunications required' }, { status: 400 });
  }

  await prisma.$transaction((tx) => tx.profile.update({
    where: { userId: user.id },
    data: { consentCommunications },
  }));

  // Log consent change
  await prisma.$transaction((tx) => tx.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${user.id},
      'consent_updated',
      'gdpr',
      ${JSON.stringify({ consentCommunications, updatedAt: new Date().toISOString() })},
      NOW()
    )
  `);

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/gdpr/consent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

