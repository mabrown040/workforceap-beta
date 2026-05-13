import 'server-only';

import { z } from 'zod';
import type { MilestoneCascade } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { claudeChat } from '@/lib/ai/anthropicChat';

import { buildDraftPrompt } from './buildDraftPrompt';
import { parseDraftResponse } from './parseDraftResponse';

/**
 * Process a single `pending_draft` cascade:
 *   1. Load user (to derive first name).
 *   2. Validate the context_snapshot shape.
 *   3. Build the prompt → LLM → parse.
 *   4. Atomically transition the row to `awaiting_approval` (or leave it
 *      for retry on the next tick).
 *
 * Never throws — all failures are returned as `{ ok: false }` so the batch
 * runner can keep going. Counts both irrecoverable failures (status moves
 * to `expired`) and transient failures (status stays `pending_draft`).
 */

const COURSE_COMPLETION_SNAPSHOT_SCHEMA = z.object({
  courseSlug: z.string().min(1),
  courseName: z.string().min(1),
  programSlug: z.string().nullable(),
  completedCount: z.number().int().min(0),
  source: z.enum(['member', 'coursera-webhook', 'coursera-enterprise-sync']),
  detectedAt: z.string(),
});
type CourseCompletionSnapshot = z.infer<typeof COURSE_COMPLETION_SNAPSHOT_SCHEMA>;

export type DraftCascadeResult =
  | { ok: true; cascadeId: string; promptVersion: string }
  | {
      ok: false;
      cascadeId: string;
      reason: string;
      /** When true, leave the row in `pending_draft` for the next tick.
       *  When false, the failure is structural — caller should mark the row
       *  as `expired` so we don't loop on it forever. */
      retryable: boolean;
    };

function firstNameFromFullName(fullName: string | null | undefined): string {
  if (!fullName) return 'there';
  const head = fullName.trim().split(/\s+/)[0];
  return head || 'there';
}

export async function draftCascade(
  cascade: Pick<
    MilestoneCascade,
    'id' | 'userId' | 'milestoneType' | 'contextSnapshot'
  >,
): Promise<DraftCascadeResult> {
  // 1. Validate snapshot before we spend an LLM token.
  let snapshot: CourseCompletionSnapshot;
  try {
    snapshot = COURSE_COMPLETION_SNAPSHOT_SCHEMA.parse(cascade.contextSnapshot);
  } catch (err) {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: `bad context_snapshot: ${err instanceof Error ? err.message : String(err)}`,
      retryable: false,
    };
  }

  // 2. Load user for first name.
  const user = await prisma.user
    .findUnique({
      where: { id: cascade.userId },
      select: { fullName: true },
    })
    .catch(() => null);

  if (!user) {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: 'user not found (deleted between detection and drafting)',
      retryable: false,
    };
  }

  // 3. Build prompt.
  if (cascade.milestoneType !== 'course_completed') {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: `unsupported milestone_type: ${cascade.milestoneType}`,
      retryable: false,
    };
  }

  const { systemPrompt, userPrompt, promptVersion } = buildDraftPrompt({
    milestoneType: 'course_completed',
    learnerFirstName: firstNameFromFullName(user.fullName),
    courseName: snapshot.courseName,
    courseSlug: snapshot.courseSlug,
    completedCount: snapshot.completedCount,
    programSlug: snapshot.programSlug,
    // styleExamples: omitted for pilot — falls back to baseline. Real
    // counselor-authored examples land in a follow-up PR.
  });

  // 4. Call LLM.
  let raw: string | null;
  try {
    raw = await claudeChat(systemPrompt, userPrompt, {
      maxTokens: 1500,
      temperature: 0.4,
    });
  } catch (err) {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: `LLM call threw: ${err instanceof Error ? err.message : String(err)}`,
      retryable: true,
    };
  }

  if (!raw) {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: 'LLM returned null (all providers failed or unconfigured)',
      retryable: true,
    };
  }

  // 5. Parse + validate.
  const parsed = parseDraftResponse(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: parsed.reason,
      // Parse failures are usually a one-off LLM quirk — retryable on next tick.
      retryable: true,
    };
  }

  // 6. Atomic transition: only update if still pending_draft (concurrency
  //    guard — if another tick beat us to it, we silently no-op).
  const updateResult = await prisma.milestoneCascade.updateMany({
    where: { id: cascade.id, status: 'pending_draft' },
    data: {
      status: 'awaiting_approval',
      counselorBrief: parsed.value.counselorBrief,
      drafts: parsed.value.actions as unknown as object, // zod-validated above
      draftModel: 'claude-haiku-4-5',
      draftPromptVersion: promptVersion,
      draftedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    // Lost the race — another tick (or admin action) moved the row. Treat as
    // success: the work that needed doing got done by someone.
    return {
      ok: false,
      cascadeId: cascade.id,
      reason: 'row was no longer pending_draft (concurrent processing)',
      retryable: false,
    };
  }

  return { ok: true, cascadeId: cascade.id, promptVersion };
}
