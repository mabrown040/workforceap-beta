import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications/create';
import { captureApiError } from '@/lib/observability/captureApiError';

const APPLICATION_STATUS_MESSAGE: Record<string, { title: string; body: (jobTitle: string) => string }> = {
  interview: {
    title: 'You have an interview request',
    body: (jobTitle) => `The employer wants to move forward on your application for ${jobTitle}. Check the details and respond.`,
  },
  offered: {
    title: "You've got an offer",
    body: (jobTitle) => `Congratulations — you were offered the ${jobTitle} position. Review the details.`,
  },
  hired: {
    title: "You're hired!",
    body: (jobTitle) => `Congratulations on being hired for ${jobTitle}! Your counselor has been notified to help with onboarding.`,
  },
  rejected: {
    title: 'Update on your application',
    body: (jobTitle) => `The employer moved forward with another candidate for ${jobTitle}. Keep going — we've got more matched jobs waiting for you.`,
  },
};

/**
 * Shared side-effects for every route that writes JobPostingApplication.status
 * (app/api/employer/applications/[id]/route.ts and
 * app/api/employer/jobs/[id]/applicants/route.ts are the two writers as of
 * 2026-07 — grep `jobPostingApplication.update` before adding a third).
 *
 * Notifies the member on interview/offered/hired/rejected, and on 'hired'
 * stands up a PlacementRecord so the 30/60/90-day retention-survey pipeline
 * (lib/cron/placement-surveys.ts) and funder outcome reports pick up the
 * placement. Previously an employer marking an application 'hired' had zero
 * downstream effect — placements only existed if a counselor/admin
 * remembered to type one in manually.
 */
export async function notifyAndRecordPlacement(args: {
  applicationId: string;
  studentId: string;
  employerId: string;
  nextStatus: string;
}): Promise<void> {
  const { applicationId, studentId, employerId, nextStatus } = args;
  const copy = APPLICATION_STATUS_MESSAGE[nextStatus];
  if (!copy) return;

  const application = await prisma.jobPostingApplication.findUnique({
    where: { id: applicationId },
    select: { job: { select: { title: true } } },
  });
  const jobTitle = application?.job.title ?? 'the role you applied to';

  void createNotification({
    userId: studentId,
    type: 'application_update',
    title: copy.title,
    body: copy.body(jobTitle),
    data: { link: '/dashboard/jobs', applicationId },
  });

  if (nextStatus !== 'hired') return;

  try {
    // PlacementRecord.userId is @unique — one row per member. If a placement
    // already exists (e.g. a counselor entered one manually, or this route
    // fires twice on a retry), leave it untouched rather than overwrite
    // counselor-verified data with an auto-generated guess.
    const existing = await prisma.placementRecord.findUnique({ where: { userId: studentId } });
    if (existing) return;

    const employer = await prisma.employer.findUnique({
      where: { id: employerId },
      select: { companyName: true },
    });
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { enrolledProgram: true },
    });

    const placement = await prisma.placementRecord.create({
      data: {
        userId: studentId,
        employerName: employer?.companyName ?? 'Unknown employer',
        jobTitle,
        programSlug: student?.enrolledProgram ?? null,
        placedAt: new Date(),
        // Unverified until a counselor confirms start date/wage — this row
        // exists so the retention pipeline and funder reports don't miss the
        // hire, not to assert unconfirmed facts as ground truth.
        startDateVerified: false,
        notes: 'Auto-created when the employer marked this application hired. Verify start date and wage.',
      },
    });

    void createNotification({
      userId: studentId,
      type: 'placement',
      title: 'Placement recorded',
      body: `We've logged your placement at ${placement.employerName}. Your counselor will follow up to confirm details.`,
      data: { link: '/dashboard' },
    });

    const assignment = await prisma.counselorAssignment.findFirst({
      where: { memberId: studentId, active: true },
      select: { counselor: { select: { userId: true } } },
    });
    if (assignment?.counselor.userId) {
      void createNotification({
        userId: assignment.counselor.userId,
        type: 'placement',
        title: 'Member placed — verify details',
        body: `A member you counsel was marked hired at ${placement.employerName} (${jobTitle}). Confirm start date and wage for funder reporting.`,
        data: { link: `/counselor/students/${studentId}` },
      });
    }
  } catch (err) {
    // Notification/placement bookkeeping must never fail the employer's
    // status update — the application PATCH already succeeded.
    captureApiError(err, { route: 'employer/applications-status-effects', extra: { studentId, stage: 'auto-placement' } });
  }
}
