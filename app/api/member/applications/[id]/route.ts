import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(200).optional(),
  status: z.enum(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER', 'REJECTED']).optional(),
  appliedAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
});

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await ensureUserInDb(user);

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: unknown;
    try {
      body = await _request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.company !== undefined) data.company = parsed.data.company;
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.appliedAt !== undefined) data.appliedAt = parsed.data.appliedAt?.trim() ? new Date(parsed.data.appliedAt) : null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;
    if (parsed.data.url !== undefined) data.url = parsed.data.url || null;

    const app = await prisma.jobApplication.update({
      where: { id },
      data,
    });

    return NextResponse.json({ application: app });
  } catch (err) {
    console.error('[PATCH /api/member/applications/:id]', err);
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await ensureUserInDb(user);
    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.jobApplication.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/member/applications/:id]', err);
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
