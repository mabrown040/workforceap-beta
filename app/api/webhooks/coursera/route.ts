import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkWebhookRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

import { getCourseraConfig, getCourseraReadiness } from '@/lib/coursera/config';
import { buildCourseraRestSyntheticStatement } from '@/lib/coursera/restWebhookStatement';
import { verifyCourseraRestWebhookAuth } from '@/lib/coursera/webhookAuth';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { prisma } from '@/lib/db/prisma';
import { recordXapiEvent, resolveXapiUser } from '@/lib/xapi/mappings';
import { resolveInboundProgramSlug } from '@/lib/xapi/resolveInboundProgram';
import { resolveInboundCourseScopes } from '@/lib/xapi/resolveInboundCourseScopes';
import { isXapiCompletionVerb } from '@/lib/xapi/statements';
import { claimCourseraRestWebhookStatement, markXapiStatementProcessed } from '@/lib/xapi/storage';

import { withSystemGuc } from '@/lib/db/withRequestGuc';
import { resolveOrgFromRequest } from '@/lib/tenant/resolveOrgFromRequest';

/**
 * Coursera REST completion / progress webhook.
 *
 * **Retry semantics:** Coursera may retry on non-2xx responses. Return 2xx only after durable
 * work succeeds (or when returning an idempotent duplicate / acknowledged non-match) so the
 * partner does not keep retrying. Transient failures should use 5xx so retries remain meaningful.
 *
 * **Identity:** Same resolution order as xAPI (`resolveXapiUser`): manual actor mapping, manual
 * Coursera email mapping, then direct portal email match. Optional `externalUserId` is accepted
 * when it equals a WorkforceAP `users.id` (enterprise SSO bridge).
 */

const webhookSchema = z
  .object({
    /** Legacy shared secret in body — prefer `x-coursera-webhook-secret` or HMAC signature headers. */
    secret: z.string().optional(),
    externalUserId: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    actorIdentifier: z.string().trim().min(1).optional(),
    actorHomePage: z.string().trim().min(1).optional(),
    /** Coursera's immutable content id. Required for a linked learner who has
     *  no WorkforceAP program assignment because slug/name matching is not a
     *  safe cross-program identity. `contentId` is accepted for native B4B
     *  payloads; `courseraCourseId` is the existing WAP integration name. */
    courseraCourseId: z.string().trim().min(1).optional(),
    contentId: z.string().trim().min(1).optional(),
    courseSlug: z.string().trim().min(1).optional(),
    courseName: z.string().trim().min(1).optional(),
    completed: z.boolean().optional(),
    progressPercent: z.number().min(0).max(100).optional(),
    /** When present, used for idempotency (stable across retries). */
    eventId: z.string().trim().min(1).optional(),
    deliveryId: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.externalUserId)
      || Boolean(value.email)
      || Boolean(value.actorIdentifier),
    { message: 'externalUserId, email, or actorIdentifier is required', path: ['externalUserId'] }
  )
  .refine(
    (value) =>
      Boolean(value.courseraCourseId)
      || Boolean(value.contentId)
      || Boolean(value.courseSlug)
      || Boolean(value.courseName),
    {
      message: 'courseraCourseId, contentId, courseSlug, or courseName is required',
      path: ['courseraCourseId'],
    },
  );

function buildDedupeStatementId(data: z.infer<typeof webhookSchema>, rawBody: string): string {
  const stable = data.eventId?.trim() || data.deliveryId?.trim();
  if (stable) return `wh:rest:${stable}`;
  return `wh:rest:${createHash('sha256').update(rawBody, 'utf8').digest('hex')}`;
}

function redactBodyForAudit(body: Record<string, unknown>): Record<string, unknown> {
  const { secret: _omit, ...rest } = body;
  return rest;
}

// Same withSystemGuc-misuse fix as Stripe + learning-completion webhooks.
// The factory ran the callback at module load; wrap in a real handler.
export async function POST(request: Request) {
  return withSystemGuc(async () => {
  const startTime = Date.now();
  let rawBody = '';
  let payloadSize = 0;
  let eventId: string | undefined;
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinLimit } = await checkWebhookRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const readiness = getCourseraReadiness(null);
    if (!readiness.canReceiveWebhooks) {
      return NextResponse.json({ error: 'Coursera webhook is not configured' }, { status: 503 });
    }
  
    const expectedSecret = getCourseraConfig().webhookSecret;
  
    let attemptedTarget = false;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ error: 'Unable to read body' }, { status: 400 });
    }
  
    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
  
    const auth = verifyCourseraRestWebhookAuth({
      request,
      rawBody,
      expectedSecret,
      bodySecret: parsed.data.secret,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const data = parsed.data;
    const rawAudit = redactBodyForAudit(body as Record<string, unknown>);
    const dedupeKey = buildDedupeStatementId(data, rawBody);
    const organizationId = await resolveOrgFromRequest(request.headers);
  
    let memberId: string | null = null;
    let mappingMethod: string | undefined;
    let resolvedEmail: string | undefined;
  
    if (data.externalUserId) {
      const byId = await prisma.user.findUnique({
        where: { id: data.externalUserId },
        select: { id: true, email: true },
      });
      if (byId) {
        memberId = byId.id;
        mappingMethod = 'external_user_id';
        resolvedEmail = byId.email.trim().toLowerCase();
      }
    }
  
    if (!memberId) {
      const resolved = await resolveXapiUser({
        email: data.email ?? undefined,
        actorIdentifier: data.actorIdentifier,
        actorHomePage: data.actorHomePage,
      }, { organizationId });
      if (resolved) {
        memberId = resolved.userId;
        mappingMethod = resolved.mappingMethod;
        resolvedEmail = resolved.email.trim().toLowerCase();
      }
    }

    const identity = {
      email: data.email ?? resolvedEmail,
      actorIdentifier: data.actorIdentifier,
      actorHomePage: data.actorHomePage,
    };

    // Tenant trust check: `organizationId` above comes from the request headers
    // (custom-domain resolution), which is a weaker signal than the matched
    // member's actual DB row. The `externalUserId` lookup path in particular
    // does no org scoping at all, and identity-mapping rows can be stale, so a
    // header-derived org must never be trusted to imply the matched member
    // belongs to it. Fetch the member's real organizationId and require it to
    // equal the header-derived one before applying any completion/progress
    // write; treat a mismatch identically to "unmatched" so a spoofed or
    // misconfigured tenant header cannot cross-apply course completions.
    let dbUser: {
      organizationId: string;
      enrolledProgram: string | null;
      courseEnrollments: Array<{
        programSlug: string;
        curriculumVersion: string;
        isPrimary: boolean;
      }>;
    } | null = null;
    if (memberId) {
      dbUser = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
          organizationId: true,
          enrolledProgram: true,
          courseEnrollments: {
            where: { organizationId },
            select: { programSlug: true, curriculumVersion: true, isPrimary: true },
          },
        },
      });
      if (!dbUser || dbUser.organizationId !== organizationId) {
        console.warn('[webhooks/coursera] organizationId mismatch for matched member', {
          memberId,
          headerOrganizationId: organizationId,
          memberOrganizationId: dbUser?.organizationId ?? null,
        });
        memberId = null;
        mappingMethod = undefined;
      }
    }

    if (!memberId) {
      await recordXapiEvent({
        statementId: dedupeKey,
        identity,
        organizationId,
        courseSlug: data.courseSlug,
        courseName: data.courseName,
        completionStatus: 'unmatched',
        error: 'No matching member identity found',
        rawPayload: rawAudit,
      });
      // 200: avoid endless partner retries for permanently unknown learners (same rationale as xAPI batch ack).
      return NextResponse.json({
        received: true,
        matched: false,
        dedupeKey,
      });
    }

    const claim = await claimCourseraRestWebhookStatement(dedupeKey);
    if (claim === 'already_processed') {
      return NextResponse.json({
        received: true,
        duplicate: true,
        dedupeKey,
        userId: memberId,
      });
    }

    const enrolledProgram = resolveInboundProgramSlug({
      enrollments: dbUser?.courseEnrollments ?? [],
      legacyEnrolledProgram: dbUser?.enrolledProgram ?? null,
    });
    const curriculumVersion = enrolledProgram
      ? dbUser?.courseEnrollments.find(
          (enrollment) => enrollment.programSlug === enrolledProgram,
        )?.curriculumVersion ?? 'legacy-v1'
      : 'legacy-v1';
  
    const synthetic = buildCourseraRestSyntheticStatement(data, resolvedEmail, rawAudit);
    const inboundScopes = await resolveInboundCourseScopes({
      courseraCourseId: synthetic.courseraCourseId,
      assignments: dbUser?.courseEnrollments ?? [],
      fallbackProgramSlug: enrolledProgram,
      fallbackCurriculumVersion: curriculumVersion,
    });
    const shouldComplete = isXapiCompletionVerb(synthetic);
  
    try {
      if (!shouldComplete) {
        let progressRecorded = 0;
        for (const scope of inboundScopes) {
          attemptedTarget = true;
          const progress = await upsertCourseProgressFromXapiStatement({
            userId: memberId,
            enrolledProgramSlug: scope.programSlug,
            curriculumVersion: scope.curriculumVersion,
            parsed: synthetic,
          });
          if (progress) progressRecorded += 1;
        }
        if (progressRecorded === 0) {
          throw new Error('Course not found');
        }
        await recordXapiEvent({
          statementId: dedupeKey,
          identity,
          courseSlug: data.courseSlug,
          courseName: data.courseName,
          matchedUserId: memberId,
          organizationId,
          mappingMethod,
          completionStatus: 'ignored',
          rawPayload: rawAudit,
        });
        await markXapiStatementProcessed(dedupeKey);
        return NextResponse.json({
          received: true,
          matched: true,
          userId: memberId,
          progressRecorded: true,
          progressTargets: progressRecorded,
          completed: false,
          dedupeKey,
        });
      }
  
      if (inboundScopes.length === 0) throw new Error('Course not found');
      const results: Array<Record<string, unknown>> = [];
      for (const scope of inboundScopes) {
        attemptedTarget = true;
        const result = await completeMemberCourse({
          userId: memberId,
          resolvedProgramSlug: scope.programSlug,
          courseSlug: data.courseSlug,
          courseName: data.courseName,
          courseraCourseId: synthetic.courseraCourseId ?? null,
          source: 'coursera-webhook',
          notify: scope.assignmentMatched ? undefined : false,
        });

        // Completion orchestration must observe the pre-completion row so the
        // first delivery can fire its one-time enrolled-member side effects.
        // Add the detailed REST progress fact only after the atomic completion.
        await upsertCourseProgressFromXapiStatement({
          userId: memberId,
          enrolledProgramSlug: scope.programSlug,
          curriculumVersion: scope.curriculumVersion,
          parsed: synthetic,
        });
        results.push(result as Record<string, unknown>);
      }
  
      await recordXapiEvent({
        statementId: dedupeKey,
        identity,
        courseSlug: data.courseSlug,
        courseName: data.courseName,
        matchedUserId: memberId,
        organizationId,
        mappingMethod,
        completionStatus: 'completed',
        rawPayload: rawAudit,
      });
      await markXapiStatementProcessed(dedupeKey);
  
      return NextResponse.json({
        received: true,
        matched: true,
        userId: memberId,
        completed: true,
        authMethod: auth.method,
        dedupeKey,
        ...(results[0] ?? {}),
        completionTargets: results.length,
        ...(results.length > 1 ? { results } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process Coursera webhook';
      await recordXapiEvent({
        statementId: dedupeKey,
        identity,
        courseSlug: data.courseSlug,
        courseName: data.courseName,
        matchedUserId: memberId,
        organizationId,
        mappingMethod,
        completionStatus: 'error',
        error: message,
        rawPayload: rawAudit,
      });
  
      const permanentClientFailure =
        message.includes('Course not found in member program')
        || message === 'Course not found'
        || message.includes('Invalid program')
        || message.includes('No program enrolled');
  
      if (permanentClientFailure && !attemptedTarget) {
        await markXapiStatementProcessed(dedupeKey);
        return NextResponse.json({ received: true, matched: true, userId: memberId, ok: false, error: message, dedupeKey }, { status: 422 });
      }
  
      // Leave `processed` false so Coursera retries can replay after a transient failure (5xx).
      return NextResponse.json({ error: message, dedupeKey }, { status: 500 });
    }
  } catch (error) {
    console.error('/webhooks/coursera:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
