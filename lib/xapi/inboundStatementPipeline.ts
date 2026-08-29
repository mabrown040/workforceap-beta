import 'server-only';

import { isAdmin } from '@/lib/auth/roles';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { resolveStaffTrainingPreviewProgramSlug } from '@/lib/member/staffTrainingProgramFallback';
import { utcDateKey } from '@/lib/member/dailyStudyPoints';
import { awardPoints } from '@/lib/member/points';
import { prisma } from '@/lib/db/prisma';
import { recordXapiEvent, resolveXapiUser } from '@/lib/xapi/mappings';
import { resolveInboundProgramSlug } from '@/lib/xapi/resolveInboundProgram';
import { isXapiCompletionVerb, type ParsedXapiStatement } from '@/lib/xapi/statements';
import { markXapiStatementProcessed } from '@/lib/xapi/storage';
import { loadValidatedProgramCourses } from '@/lib/coursera/programCourseList';
import { detectTrainingMilestone } from '@/lib/milestoneCascade/detectCompletionMilestone';

export type InboundStatementRunResult = {
  completions: Array<Record<string, unknown>>;
};

/**
 * Shared Coursera xAPI ingest path (webhook replay or live POST).
 * Does not persist into `xapi_statements` — caller handles storage.
 */
export async function handleInboundParsedStatement(
  parsed: ParsedXapiStatement,
  options: { organizationId?: string | null; statementHash?: string | null } = {},
): Promise<InboundStatementRunResult> {
  const completions: Array<Record<string, unknown>> = [];

  const identity = {
    email: parsed.email,
    actorIdentifier: parsed.actorIdentifier,
    actorHomePage: parsed.actorHomePage,
  };

  const resolvedUser = await resolveXapiUser(identity, { organizationId: options.organizationId });

  if (!resolvedUser) {
    await recordXapiEvent({
      statementId: parsed.statementId,
      identity,
      organizationId: options.organizationId,
      courseSlug: parsed.courseSlug,
      courseName: parsed.courseName,
      verbId: parsed.verbId,
      completionStatus: 'unmatched',
      error: 'No matching member identity found',
      rawPayload: parsed.rawStatement,
    });

    if (isXapiCompletionVerb(parsed)) {
      completions.push({
        email: parsed.email,
        actorIdentifier: parsed.actorIdentifier,
        statementId: parsed.statementId,
        ok: false,
        error: 'Member not found',
      });
    }

    await markXapiStatementProcessed(parsed.statementId, options.statementHash);
    return { completions };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: resolvedUser.userId },
    select: {
      organizationId: true,
      enrolledProgram: true,
      courseEnrollments: {
        where: options.organizationId ? { organizationId: options.organizationId } : undefined,
        select: { programSlug: true, isPrimary: true },
      },
    },
  });
  let enrolledProgram = resolveInboundProgramSlug({
    enrollments: dbUser?.courseEnrollments ?? [],
    legacyEnrolledProgram: dbUser?.enrolledProgram ?? null,
  });

  if (!enrolledProgram && (await isAdmin(resolvedUser.userId))) {
    enrolledProgram = await resolveStaffTrainingPreviewProgramSlug(resolvedUser.userId);
  }

  // Enrollment gates rewards, not persistence. Detached linked learners still
  // keep exact mapped progress below, but must not receive a daily-study point
  // or any course-completion celebration until they have a current program.
  if (enrolledProgram) {
    await awardPoints(resolvedUser.userId, 'daily_study', utcDateKey()).catch((error) => {
      console.warn('[inboundStatementPipeline] daily_study points award failed:', error);
    });
  }

  if (!isXapiCompletionVerb(parsed)) {
    const progress = await upsertCourseProgressFromXapiStatement({
      userId: resolvedUser.userId,
      enrolledProgramSlug: enrolledProgram,
      parsed,
    });
    if (progress?.trainingStartedTransition && dbUser?.organizationId) {
      const validated = await loadValidatedProgramCourses({
        organizationId: dbUser.organizationId,
        programSlug: progress.programSlug,
        checkB4BContents: false,
      });
      await detectTrainingMilestone({
        userId: resolvedUser.userId,
        milestoneType: 'training_started',
        milestoneRef: progress.programSlug,
        programSlug: progress.programSlug,
        courseSlug: progress.courseSlug,
        courseName: progress.courseName,
        completedCount: 0,
        totalCourses: validated.courses.length,
        source: 'coursera-webhook',
        sourceEventId: parsed.statementId,
      }).catch((error) => {
        console.warn('[inboundStatementPipeline] training_started detection failed:', error);
      });
    }
    await recordXapiEvent({
      statementId: parsed.statementId,
      identity,
      courseSlug: parsed.courseSlug,
      courseName: parsed.courseName,
      verbId: parsed.verbId,
      matchedUserId: resolvedUser.userId,
      organizationId: options.organizationId,
      mappingMethod: resolvedUser.mappingMethod,
      completionStatus: 'ignored',
      rawPayload: parsed.rawStatement,
    });
    await markXapiStatementProcessed(parsed.statementId, options.statementHash);
    return { completions };
  }

  try {
    // Completion orchestration must observe the pre-completion row. Persisting
    // the xAPI statement first would set COMPLETED, trigger the orchestrator's
    // idempotent early return, and silently skip the first completion's
    // email/points/milestone transitions. The orchestrator writes the durable
    // completion first; the xAPI upsert then adds statement/score detail.
    const result = await completeMemberCourse({
      userId: resolvedUser.userId,
      resolvedProgramSlug: enrolledProgram,
      courseSlug: parsed.courseSlug,
      courseName: parsed.courseName,
      courseraCourseId: parsed.courseraCourseId ?? null,
      source: 'coursera-webhook',
      notify: enrolledProgram ? undefined : false,
    });

    await upsertCourseProgressFromXapiStatement({
      userId: resolvedUser.userId,
      enrolledProgramSlug: enrolledProgram,
      parsed,
    });

    await recordXapiEvent({
      statementId: parsed.statementId,
      identity,
      courseSlug: parsed.courseSlug,
      courseName: parsed.courseName,
      verbId: parsed.verbId,
      matchedUserId: resolvedUser.userId,
      organizationId: options.organizationId,
      mappingMethod: resolvedUser.mappingMethod,
      completionStatus: 'completed',
      rawPayload: parsed.rawStatement,
    });

    completions.push({
      email: parsed.email,
      actorIdentifier: parsed.actorIdentifier,
      statementId: parsed.statementId,
      matchedUserId: resolvedUser.userId,
      mappingMethod: resolvedUser.mappingMethod,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process statement';

    await recordXapiEvent({
      statementId: parsed.statementId,
      identity,
      courseSlug: parsed.courseSlug,
      courseName: parsed.courseName,
      verbId: parsed.verbId,
      matchedUserId: resolvedUser.userId,
      organizationId: options.organizationId,
      mappingMethod: resolvedUser.mappingMethod,
      completionStatus: 'error',
      error: message,
      rawPayload: parsed.rawStatement,
    });

    completions.push({
      email: parsed.email,
      actorIdentifier: parsed.actorIdentifier,
      statementId: parsed.statementId,
      matchedUserId: resolvedUser.userId,
      mappingMethod: resolvedUser.mappingMethod,
      ok: false,
      error: message,
    });
  }

  await markXapiStatementProcessed(parsed.statementId, options.statementHash);
  return { completions };
}
