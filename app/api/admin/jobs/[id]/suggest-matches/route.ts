import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendAIMatchSuggestionEmail } from '@/lib/email';

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
    include: {
      employer: { select: { contactEmail: true, companyName: true } },
      aiMatches: {
        where: { status: 'suggested' },
        include: {
          student: { select: { id: true, fullName: true, enrolledProgram: true } },
        },
        orderBy: { matchScore: 'desc' },
        take: 5,
      },
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.aiMatches.length === 0) {
    return NextResponse.json({ error: 'No matches to suggest. Run AI matching first.' }, { status: 400 });
  }

  await sendAIMatchSuggestionEmail({
    to: job.employer.contactEmail,
    jobTitle: job.title,
    companyName: job.employer.companyName,
    matches: job.aiMatches.map((m) => ({
      name: m.student.fullName,
      program: m.student.enrolledProgram ?? '—',
      score: m.matchScore,
    })),
  });

  await prisma.aIJobMatch.updateMany({
    where: { jobId: id, studentId: { in: job.aiMatches.map((m) => m.studentId) } },
    data: { status: 'employer_notified' },
  });

  return NextResponse.json({ ok: true, count: job.aiMatches.length });
}
