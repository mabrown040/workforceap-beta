import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendCourseAccountabilityEmail } from '@/lib/email';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { logCronRun } from '@/lib/admin/logCronRun';
import { captureApiError } from '@/lib/observability/captureApiError';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';
import { getProgramBySlug, getProgramDisplayTitle } from '@/lib/content/programs';
import { filterNudgeEligibleUserIds, recordNudgeSent } from '@/lib/cron/nudgeThrottle';
import { createNotification } from '@/lib/notifications/create';

/**
 * GET /api/cron/course-accountability  (Sprint R3 — PLAN-2026-Q3.md)
 *
 * Day-5 accountability check-in: scans for `CourseEnrollment` rows created
 * 5+ days ago with zero Coursera progress (B4B `overallProgress` null or 0
 * across all course content). For each:
 *   1. Sends an accountability nudge to the member.
 *   2. Writes a `counselor_followup_needed` MemberEvent audit row so the
 *      counselor's queue surfaces them. (No new table — extends the existing
 *      MemberEvent audit log per the PLAN guidance: "an audit event the
 *      counselor can subscribe to".)
 *
 * Idempotency: both the email send AND the counselor follow-up are scoped to
 * the enrollment id. We skip enrollments that already have a
 * `course_accountability_sent` MemberEvent row. Also shares a 7-day
 * cross-cron cooldown (via `MemberNudgeLog`) with inactive-nudge and
 * inactivity-nudge — see lib/cron/nudgeThrottle.ts.
 *
 * Vercel cron: 0 15 * * * (3pm UTC daily — runs after the AM at-risk-check).
 */
async function handle(_request: Request) {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Window the scan: 5-7 days old enrollments. Older than 7 days are
  // expected to have been picked up by at-risk-check / inactive-nudge.
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo, lte: fiveDaysAgo },
      user: { deletedAt: null },
    },
    select: {
      id: true,
      userId: true,
      programSlug: true,
      user: { select: { email: true, fullName: true } },
    },
    take: 500,
  });

  if (enrollments.length === 0) {
    const empty = { sent: 0, scanned: 0, counselorFollowups: 0 };
    await setCronRecordsProcessed(0);
    await logCronRun('cron_course_accountability', empty);
    return NextResponse.json(empty);
  }

  // Bulk lookup of prior sends for these enrollments.
  const enrollmentIds = enrollments.map((e) => e.id);
  const alreadySent = await prisma.memberEvent.findMany({
    where: {
      eventName: 'course_accountability_sent',
      entityType: 'course_enrollment',
      entityId: { in: enrollmentIds },
    },
    select: { entityId: true },
  });
  const sentEnrollmentIds = new Set(alreadySent.map((r) => r.entityId).filter(Boolean) as string[]);

  // Shared cross-cron cooldown: skip anyone nudged by ANY of these crons in
  // the last 7 days (one shared query, not per-cron logic).
  const eligibleUserIds = await filterNudgeEligibleUserIds(
    [...new Set(enrollments.map((e) => e.userId))],
  );

  let sent = 0;
  let counselorFollowups = 0;

  for (const enrollment of enrollments) {
    if (sentEnrollmentIds.has(enrollment.id)) continue;
    if (!enrollment.user?.email) continue;
    if (!eligibleUserIds.has(enrollment.userId)) continue;

    try {
      // Pull Coursera authoritative progress. Soft-fails to an empty Map if
      // B4B is unreachable — we'd rather skip a day than spam a learner who
      // actually started but Coursera is temporarily down.
      const progress = await fetchLearnerProgressFromB4B(enrollment.user.email);

      let hasProgress = false;
      for (const entry of progress.values()) {
        if (entry.overallProgress > 0) {
          hasProgress = true;
          break;
        }
      }
      if (hasProgress) continue;

      const program = getProgramBySlug(enrollment.programSlug);
      const programName = program ? getProgramDisplayTitle(program) : enrollment.programSlug;

      const result = await sendCourseAccountabilityEmail({
        to: enrollment.user.email,
        fullName: enrollment.user.fullName ?? enrollment.user.email,
        programName,
      });

      if (result.ok) {
        sent++;
        await prisma.memberEvent
          .create({
            data: {
              userId: enrollment.userId,
              eventName: 'course_accountability_sent',
              entityType: 'course_enrollment',
              entityId: enrollment.id,
              metadata: { programSlug: enrollment.programSlug, programName },
            },
          })
          .catch(() => { /* non-fatal */ });

        await recordNudgeSent({ userId: enrollment.userId, tier: 'yellow', kind: 'accountability' });

        await createNotification({
          userId: enrollment.userId,
          type: 'nudge',
          title: `Ready to start ${programName}?`,
          body: "You enrolled a few days ago but haven't started yet — pick up where you left off.",
          data: { link: '/dashboard' },
        });

        // Counselor follow-up queue: audit event the counselor view subscribes to.
        await prisma.memberEvent
          .create({
            data: {
              userId: enrollment.userId,
              eventName: 'counselor_followup_needed',
              entityType: 'course_enrollment',
              entityId: enrollment.id,
              metadata: {
                reason: 'unstarted_5d',
                programSlug: enrollment.programSlug,
                programName,
              },
            },
          })
          .then(() => { counselorFollowups++; })
          .catch(() => { /* non-fatal */ });
      }
    } catch (err) {
      captureApiError(err, {
        route: 'cron/course-accountability',
        extra: { enrollmentId: enrollment.id, userId: enrollment.userId },
      });
    }
  }

  const runResult = {
    sent,
    scanned: enrollments.length,
    counselorFollowups,
  };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_course_accountability', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_course_accountability', handle);
export const POST = withCronLogging('cron_course_accountability', handle);
