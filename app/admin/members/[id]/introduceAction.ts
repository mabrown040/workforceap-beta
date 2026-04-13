'use server';

import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';

export async function introduceMemberToEmployer(memberId: string, jobId: string) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) throw new Error('Unauthorized');

  const [job, member] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    }),
    prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, fullName: true, email: true, enrolledProgram: true },
    }),
  ]);

  if (!job?.employerId || !job.employer) throw new Error('Job or employer not found');
  if (!member) throw new Error('Member not found');

  const thread = await getOrCreateEmployerMessageThread(job.employerId);

  if (!thread.counselorUserId || thread.counselorUserId !== user.id) {
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        counselorUserId: user.id,
        staffUserId: user.id,
      },
    });
  }

  await prisma.message.create({
    data: {
      threadId: thread.id,
      authorId: user.id,
      body:
        `Structured introduction from WorkforceAP. Candidate: ${member.fullName} (${member.email}). ` +
        `Role: ${job.title}. Employer: ${job.employer.companyName}. ` +
        `Please reply in this thread to coordinate next steps with the counselor and member.`,
    },
  });

  await prisma.memberEvent.create({
    data: {
      userId: member.id,
      eventName: 'EMPLOYER_INTRO_CREATED',
      entityType: 'MessageThread',
      entityId: thread.id,
      metadata: {
        jobId: job.id,
        employerId: job.employerId,
        employerName: job.employer.companyName,
        introducedBy: user.id,
      },
      sourcePage: `/admin/members/${member.id}`,
    },
  });

  await prisma.aIJobMatch.updateMany({
    where: { jobId: job.id, studentId: member.id },
    data: { status: 'contacted', statusUpdatedAt: new Date() },
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath('/admin/messages');
}
