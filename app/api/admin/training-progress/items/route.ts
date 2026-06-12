/**
 * Per-item Coursera progress drill-down for /admin/training-progress.
 *
 * Returns one row per `(course_item_id)` for a given (learner, course) pair,
 * rolling up the raw xAPI statements (verb timeline, latest score, completion
 * flag, last seen). The data was already in `xapi_statements` — the
 * 20260509200000 migration projected `course_item_id` and `item_type` into
 * indexed columns so this query stays fast as the LRS grows.
 *
 * Query params:
 *   - email          (required) actor_email exactly (lower-cased on read)
 *   - courseraCourseId (required) Coursera's canonical course id
 */
import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const dynamic = 'force-dynamic';

export type TrainingProgressItemRow = {
  courseItemId: string;
  itemType: string | null;
  itemTypeLabel: string;
  latestVerb: string | null;
  latestScoreScaled: number | null;
  completed: boolean;
  lastSeenAt: string;
  statementCount: number;
};

/** Humanise Coursera's `ITEM_TYPE_*` discriminator into UI-friendly labels.
 *  Falls back to a lowercased, underscore-stripped form for anything we
 *  haven't curated, so a future extension doesn't break the column. */
const ITEM_TYPE_LABELS: Record<string, string> = {
  ITEM_TYPE_LECTURE: 'lecture',
  ITEM_TYPE_READING: 'reading',
  ITEM_TYPE_SUPPLEMENT: 'reading',
  ITEM_TYPE_QUIZ: 'quiz',
  ITEM_TYPE_PRACTICE_QUIZ: 'practice quiz',
  ITEM_TYPE_GRADED_QUIZ: 'graded quiz',
  ITEM_TYPE_EXAM: 'exam',
  ITEM_TYPE_PROGRAMMING_ASSIGNMENT: 'programming assignment',
  ITEM_TYPE_PEER_REVIEW: 'peer review',
  ITEM_TYPE_STAFF_GRADED_ASSIGNMENT: 'staff-graded assignment',
  ITEM_TYPE_LAB: 'lab',
  ITEM_TYPE_DISCUSSION_PROMPT: 'discussion',
  ITEM_TYPE_UNGRADED_LAB: 'lab',
  ITEM_TYPE_GRADED_LAB: 'graded lab',
};

function humaniseItemType(itemType: string | null): string {
  if (!itemType) return 'item';
  if (ITEM_TYPE_LABELS[itemType]) return ITEM_TYPE_LABELS[itemType];
  return itemType.replace(/^ITEM_TYPE_/, '').replace(/_/g, ' ').toLowerCase();
}

/** Verb URIs come back as long namespaced URLs (e.g.
 *  `http://adlnet.gov/expapi/verbs/completed`). Strip everything before the
 *  last `/` for a UI-friendly token. */
function shortVerb(verbId: string | null): string | null {
  if (!verbId) return null;
  const trimmed = verbId.trim();
  if (!trimmed) return null;
  const tail = trimmed.split(/[/#]/).filter(Boolean).pop();
  return (tail ?? trimmed).toLowerCase();
}export const GET = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const emailParam = url.searchParams.get('email')?.trim().toLowerCase();
  const courseraCourseId = url.searchParams.get('courseraCourseId')?.trim();

  if (!emailParam) {
    return NextResponse.json({ error: 'email query param is required' }, { status: 400 });
  }
  if (!courseraCourseId) {
    return NextResponse.json(
      { error: 'courseraCourseId query param is required' },
      { status: 400 },
    );
  }

  // Tenant scope: confirm the email belongs to a member of the caller's
  // organization before exposing their xAPI item-level progress. Without
  // this, a tenant admin who knew a learner's email (or guessed it) could
  // pull cross-tenant Coursera item-level progress.
  if (!(await isSuperAdmin(user.id))) {
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(user.id);
    } catch {
      return NextResponse.json({ items: [], totals: { items: 0 } });
    }
    const targetUser = await prisma.$transaction((tx) => tx.user.findFirst({
      where: {
        email: { equals: emailParam, mode: 'insensitive' },
        organizationId: orgId,
      },
      select: { id: true },
    }));
    if (!targetUser) {
      // Don't leak whether the email exists in another tenant.
      return NextResponse.json({ items: [], totals: { items: 0 } });
    }
  }

  // Pull every item-level statement for this (learner, course) and roll up
  // in JS. We could push the GROUP BY into SQL, but the cardinality is small
  // (a single course is ~10–100 items, each with ≤a-few-dozen statements),
  // and the in-memory rollup makes the "latest verb / latest score" logic
  // trivial without window-function gymnastics.
  const statements = await prisma.$transaction((tx) => tx.xapiStatement.findMany({
    where: {
      actorEmail: emailParam,
      courseId: courseraCourseId,
      courseItemId: { not: null },
    },
    select: {
      courseItemId: true,
      itemType: true,
      verb: true,
      resultScoreScaled: true,
      resultCompletion: true,
      resultSuccess: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  }));

  type Acc = {
    itemType: string | null;
    latestVerb: string | null;
    latestScoreScaled: number | null;
    completed: boolean;
    lastSeenAt: Date;
    statementCount: number;
  };

  const byItem = new Map<string, Acc>();
  for (const s of statements) {
    if (!s.courseItemId) continue;
    const existing = byItem.get(s.courseItemId);
    if (!existing) {
      byItem.set(s.courseItemId, {
        itemType: s.itemType,
        latestVerb: s.verb,
        latestScoreScaled: s.resultScoreScaled,
        completed: s.resultCompletion === true || s.resultSuccess === true,
        lastSeenAt: s.createdAt,
        statementCount: 1,
      });
      continue;
    }
    existing.statementCount += 1;
    if (s.itemType && !existing.itemType) existing.itemType = s.itemType;
    if (s.resultCompletion === true || s.resultSuccess === true) existing.completed = true;
    // Statements were ordered by createdAt asc, so the *last* iteration for an
    // item wins for the "latest" fields.
    existing.latestVerb = s.verb;
    if (s.resultScoreScaled != null) existing.latestScoreScaled = s.resultScoreScaled;
    if (s.createdAt > existing.lastSeenAt) existing.lastSeenAt = s.createdAt;
  }

  const items: TrainingProgressItemRow[] = Array.from(byItem.entries())
    .map(([courseItemId, acc]) => ({
      courseItemId,
      itemType: acc.itemType,
      itemTypeLabel: humaniseItemType(acc.itemType),
      latestVerb: shortVerb(acc.latestVerb),
      latestScoreScaled: acc.latestScoreScaled,
      completed: acc.completed,
      lastSeenAt: acc.lastSeenAt.toISOString(),
      statementCount: acc.statementCount,
    }))
    .sort((a, b) => (a.lastSeenAt > b.lastSeenAt ? -1 : a.lastSeenAt < b.lastSeenAt ? 1 : 0));

  return NextResponse.json({
    ok: true,
    email: emailParam,
    courseraCourseId,
    items,
  });

  } catch (error) {
    console.error('/admin/training-progress/items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

