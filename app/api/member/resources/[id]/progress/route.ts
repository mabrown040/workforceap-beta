import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.enum(['view', 'complete', 'download', 'save']),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: resourceId } = await params;

  let body: unknown = {};
  try {
    body = await _request.json().catch(() => ({}));
  } catch {
    // empty body ok
  }
  const parsed = actionSchema.safeParse(body);
  const action = parsed.success ? parsed.data.action : 'view';

  try {
    await ensureUserInDb(user);
    const now = new Date();

    const progress = await prisma.resourceProgress.upsert({
      where: {
        userId_resourceId: { userId: user.id, resourceId },
      },
      create: {
        userId: user.id,
        resourceId,
        viewedAt: action === 'view' ? now : null,
        viewCount: action === 'view' ? 1 : 0,
        completionStatus: action === 'complete' ? 'completed' : action === 'view' ? 'in_progress' : 'not_started',
        completedAt: action === 'complete' ? now : null,
        downloadedAt: action === 'download' ? now : null,
        savedAt: action === 'save' ? now : null,
      },
      update: {
        updatedAt: now,
        ...(action === 'view' && { viewedAt: now, viewCount: { increment: 1 } }),
        ...(action === 'complete' && { completedAt: now, completionStatus: 'completed' }),
        ...(action === 'download' && { downloadedAt: now }),
        ...(action === 'save' && { savedAt: now }),
      },
    });

    if (action === 'view') await trackEvent({ userId: user.id, eventName: 'resource_viewed', entityType: 'resource', entityId: resourceId });
    if (action === 'complete') await trackEvent({ userId: user.id, eventName: 'resource_completed', entityType: 'resource', entityId: resourceId });
    if (action === 'download') await trackEvent({ userId: user.id, eventName: 'resource_downloaded', entityType: 'resource', entityId: resourceId });
    if (action === 'save') await trackEvent({ userId: user.id, eventName: 'resource_saved', entityType: 'resource', entityId: resourceId });

    return NextResponse.json({ progress });
  } catch (err) {
    console.error('[POST /api/member/resources/:id/progress]', err);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: resourceId } = await params;

  const progress = await prisma.resourceProgress.findUnique({
    where: { userId_resourceId: { userId: user.id, resourceId } },
  });
  return NextResponse.json({ progress: progress ?? null });
}
