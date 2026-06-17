import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendCertCelebrationEmail } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { getProgramBySlug, getProgramDisplayTitle } from '@/lib/content/programs';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { awardPoints } from '@/lib/member/points';
import { TESTIMONIALS } from '@/content/testimonials';

/**
 * GET /api/cron/milestone-celebration
 *
 * Sprint R3 (PLAN-2026-Q3.md) — redesigned certification celebration.
 * Subject leads with cert name + earned date (per the open-rate hypothesis,
 * 35% -> 55%). Body points the member at the AI interview practice tool,
 * surfaces the +25 point bump, and pulls a random peer testimonial when one
 * matches the member's program.
 *
 * Sends fire-and-forget per cert; idempotency lives in the
 * `certification_celebration_sent` MemberEvent row scoped to the milestone's
 * programSlug + completion date.
 *
 * Vercel cron: 0 11 * * * (daily 11AM UTC). Secured by CRON_SECRET.
 */
async function handle(_req: NextRequest) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Find members whose assessment was completed since yesterday (proxy for program completion)
  const completed = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      assessmentCompleted: true,
      assessmentCompletedAt: { gte: yesterday },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true, assessmentCompletedAt: true },
    take: 100,
  });

  // Batch fetch the most recent completed course per member to avoid N+1.
  const memberIds = completed.map((m) => m.id);
  const milestones = memberIds.length
    ? await prisma.courseProgress.findMany({
        where: {
          userId: { in: memberIds },
          status: 'COMPLETED',
          completedAt: { gte: yesterday },
        },
        orderBy: { completedAt: 'desc' },
        select: { userId: true, programSlug: true, completedAt: true },
      })
    : [];

  const latestMilestoneByMember = new Map<string, { programSlug: string; completedAt: Date }>();
  for (const m of milestones) {
    if (!latestMilestoneByMember.has(m.userId)) {
      latestMilestoneByMember.set(m.userId, {
        programSlug: m.programSlug,
        completedAt: m.completedAt ?? new Date(),
      });
    }
  }

  // Bulk-check idempotency: skip members we've already celebrated for this
  // exact (program, day) milestone.
  const alreadySent = memberIds.length
    ? await prisma.memberEvent.findMany({
        where: {
          userId: { in: memberIds },
          eventName: 'certification_celebration_sent',
          createdAt: { gte: yesterday },
        },
        select: { userId: true, entityId: true },
      })
    : [];
  const sentKeys = new Set(alreadySent.map((r) => `${r.userId}::${r.entityId ?? ''}`));

  let sent = 0;
  let pointsAwardedCount = 0;

  for (const member of completed) {
    try {
      // Source the program name from the milestone (the most recently
      // completed `course_progress` row) instead of `member.enrolledProgram`.
      // Multi-program learners may have hit this milestone in their
      // secondary program; congratulating them on their primary program
      // is a user-visible bug.
      const milestone = latestMilestoneByMember.get(member.id);

      const programSlug = milestone?.programSlug ?? member.enrolledProgram ?? null;
      const program = programSlug ? getProgramBySlug(programSlug) : undefined;
      const programName = program
        ? getProgramDisplayTitle(program)
        : programSlug ?? 'your program';

      const idempotencyKey = `${member.id}::${programSlug ?? 'unknown'}`;
      if (sentKeys.has(idempotencyKey)) continue;

      // +25 point bump for cert celebration (Sprint R3 — ties milestone to a
      // points-widget update). `awardPoints` is idempotent on the
      // (userId, event, entityId) triple, so retries don't double-credit.
      const pointsResult = await awardPoints(
        member.id,
        'certification_earned',
        programSlug ?? '',
        25,
        { note: `Cert celebration: ${programName}` },
      ).catch(() => ({ awarded: false, points: 0 }));
      if (pointsResult.awarded) pointsAwardedCount++;

      // Only include real, consented testimonials in member-facing email.
      // Static testimonials are kept empty until real, consented quotes are
      // gathered and reviewed. No fabricated social proof is sent.
      const launchSafeTestimonials = TESTIMONIALS.filter((t) => !t.id.startsWith('placeholder-'));
      const programMatch = launchSafeTestimonials.find(
        (t) => t.program && programSlug && t.program.toLowerCase().includes(programSlug.toLowerCase()),
      );
      const testimonial =
        programMatch ?? (launchSafeTestimonials[Math.floor(Math.random() * launchSafeTestimonials.length)] ?? null);

      await sendCertCelebrationEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
        certName: programName,
        earnedAt: milestone?.completedAt ?? member.assessmentCompletedAt ?? new Date(),
        pointsAwarded: 25,
        testimonial: testimonial
          ? { quote: testimonial.quote, name: testimonial.name, role: testimonial.role }
          : null,
      });
      sent++;

      await prisma.memberEvent
        .create({
          data: {
            userId: member.id,
            eventName: 'certification_celebration_sent',
            entityType: 'course_progress',
            entityId: programSlug,
            metadata: { programName, pointsAwarded: 25 },
          },
        })
        .catch(() => { /* non-fatal — idempotency degrades to "may resend once" */ });
    } catch {
      /* non-fatal */
    }
  }

  const runResult = { sent, total: completed.length, pointsAwardedCount };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_milestone_celebration', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_milestone_celebration', handle);
export const POST = withCronLogging('cron_milestone_celebration', handle);
