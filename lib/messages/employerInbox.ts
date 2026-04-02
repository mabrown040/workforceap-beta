import { prisma } from '@/lib/db/prisma';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';

export type EmployerInboxTeamRow = {
  kind: 'team';
  threadId: string;
  title: string;
  preview: string;
  sortAt: string;
  unreadCount: number;
};

export type EmployerInboxCandidateRow = {
  kind: 'candidate';
  applicationId: string;
  studentName: string;
  jobTitle: string;
  preview: string;
  sortAt: string;
  unreadCount: number;
};

export async function buildEmployerInbox(
  employerId: string,
  portalUserId: string
): Promise<{ team: EmployerInboxTeamRow; candidates: EmployerInboxCandidateRow[] }> {
  const teamThread = await getOrCreateEmployerMessageThread(employerId);

  const [lastTeamMsg] = await prisma.message.findMany({
    where: { threadId: teamThread.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  const unreadTeam = await prisma.message.count({
    where: {
      threadId: teamThread.id,
      authorId: { not: portalUserId },
      ...(teamThread.portalUserLastReadAt
        ? { createdAt: { gt: teamThread.portalUserLastReadAt } }
        : {}),
    },
  });

  const teamSort = lastTeamMsg?.createdAt ?? teamThread.createdAt;

  const team: EmployerInboxTeamRow = {
    kind: 'team',
    threadId: teamThread.id,
    title: 'WorkforceAP Team',
    preview: lastTeamMsg?.body?.slice(0, 100) ?? 'No messages yet — ask about jobs, applicants, or pipeline.',
    sortAt: teamSort.toISOString(),
    unreadCount: unreadTeam,
  };

  const applications = await prisma.jobPostingApplication.findMany({
    where: { job: { employerId } },
    include: {
      student: { select: { id: true, fullName: true } },
      job: { select: { title: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ appliedAt: 'desc' }],
    take: 50,
  });

  const candidatesNested = await Promise.all(
    applications.map(async (app) => {
      const last = app.messages[0];
      const unreadApplicant = await prisma.applicationMessage.count({
        where: {
          applicationId: app.id,
          authorId: app.studentId,
          readAt: null,
        },
      });

      const sortAt = last?.createdAt ?? app.appliedAt;
      const preview = last?.body?.slice(0, 100) ?? 'No messages yet';

      return {
        kind: 'candidate' as const,
        applicationId: app.id,
        studentName: app.student.fullName ?? 'Member',
        jobTitle: app.job.title,
        preview,
        sortAt: sortAt.toISOString(),
        unreadCount: unreadApplicant,
      };
    })
  );

  const candidates = candidatesNested.sort((a, b) =>
    a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0
  );

  return { team, candidates };
}
