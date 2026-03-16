import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';

const eventSchema = z.object({
  eventName: z.string().min(1).max(100),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
  sourcePage: z.string().max(500).optional(),
  sessionId: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  await trackEvent({
    userId: user.id,
    eventName: parsed.data.eventName as Parameters<typeof trackEvent>[0]['eventName'],
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    metadata: parsed.data.metadata ?? undefined,
    sourcePage: parsed.data.sourcePage,
    sessionId: parsed.data.sessionId,
  });

  return NextResponse.json({ ok: true });
}
