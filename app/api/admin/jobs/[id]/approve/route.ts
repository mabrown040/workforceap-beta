import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendJobApprovedEmail } from '@/lib/email';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { employer: { include: { user: { select: { email: true, fullName: true } } } } },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'pending') {
    return NextResponse.json({ error: 'Job is not pending approval' }, { status: 400 });
  }

  await prisma.job.update({
    where: { id },
    data: {
      status: 'live',
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  await sendJobApprovedEmail({
    to: job.employer.contactEmail,
    jobTitle: job.title,
    companyName: job.employer.companyName,
  });

  return NextResponse.json({ ok: true });
}
