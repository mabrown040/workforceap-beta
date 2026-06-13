import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const createSchema = z.object({
  programSlug: z.string().min(1).max(120),
  seatCount: z.coerce.number().int().min(1).max(5000),
  startBy: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'startBy must be a valid date in YYYY-MM-DD format' })
    .max(32)
    .optional()
    .nullable(),
  mouUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  notes: z.string().max(4000).optional().nullable(),
});async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const intents = await prisma.$transaction((tx) => tx.employerHiringIntent.findMany({
      where: { employerId: ctx.employerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }));
    return NextResponse.json({ intents });
  } catch (error) {
    console.error('/employer/hiring-intents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
  
    const { programSlug, seatCount, startBy, mouUrl, notes } = parsed.data;
  
    try {
      const intent = await prisma.$transaction((tx) => tx.employerHiringIntent.create({
        data: {
          employerId: ctx.employerId,
          programSlug,
          seatCount,
          startBy: startBy ? new Date(`${startBy}T12:00:00`) : null,
          mouUrl: mouUrl || null,
          notes: notes ?? null,
        },
      }));
      return NextResponse.json({ intent });
    } catch (err) {
      captureApiError(err, { route: 'employer/hiring-intents' });
      return NextResponse.json({ error: 'Unable to save intent' }, { status: 500 });
    }
  } catch (error) {
    console.error('/employer/hiring-intents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
