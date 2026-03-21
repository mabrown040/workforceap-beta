import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendJobRejectedEmail } from '@/lib/email';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { employer: { select: { contactEmail: true, companyName: true } } },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'pending') {
    return NextResponse.json({ error: 'Job is not pending' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  await prisma.job.update({
    where: { id },
    data: { status: 'closed' },
  });

  await sendJobRejectedEmail({
    to: job.employer.contactEmail,
    jobTitle: job.title,
    companyName: job.employer.companyName,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ ok: true });
}
