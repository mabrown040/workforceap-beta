import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  getSkillCheckpointDefinitionsForProgram,
  type SkillCheckpointDefinition,
} from '@/lib/content/skillCheckpointCatalog';

export const SKILL_CHECKPOINT_EVENT_PASSED = 'skill_checkpoint_passed';
export const SKILL_CHECKPOINT_EVENT_RETRY = 'skill_checkpoint_needs_retry';

export type SkillCheckpointDecision = 'passed' | 'needs_retry';

export type SkillCheckpointEventRecord = {
  eventName: string;
  entityId: string | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

export type SkillCheckpointSummaryItem = SkillCheckpointDefinition & {
  status: 'locked' | 'ready' | 'passed' | 'needs_retry';
  unlocked: boolean;
  passedAt: Date | null;
  lastReviewedAt: Date | null;
  lastDecisionByUserId: string | null;
  latestNotes: string | null;
};

export type SkillCheckpointSummary = {
  programSlug: string;
  programTitle: string | null;
  passedCount: number;
  readyCount: number;
  retryCount: number;
  totalCount: number;
  demonstratedSkillLabels: string[];
  checkpoints: SkillCheckpointSummaryItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function latestEventByCheckpoint(events: SkillCheckpointEventRecord[]) {
  const latest = new Map<string, SkillCheckpointEventRecord>();

  for (const event of events) {
    if (!event.entityId) continue;
    const current = latest.get(event.entityId);
    if (!current || event.createdAt > current.createdAt) {
      latest.set(event.entityId, event);
    }
  }

  return latest;
}

export function summarizeSkillCheckpointState(args: {
  definitions: SkillCheckpointDefinition[];
  completedCourseSlugs: string[];
  events: SkillCheckpointEventRecord[];
}): SkillCheckpointSummaryItem[] {
  const completed = new Set(args.completedCourseSlugs);
  const latestEvents = latestEventByCheckpoint(args.events);

  return args.definitions.map((definition) => {
    const unlocked = definition.requiredCourseSlugs.every((slug) => completed.has(slug));
    const latest = latestEvents.get(definition.key) ?? null;
    const metadata = asRecord(latest?.metadata);
    const status: SkillCheckpointSummaryItem['status'] =
      !unlocked
        ? 'locked'
        : latest?.eventName === SKILL_CHECKPOINT_EVENT_PASSED
          ? 'passed'
          : latest?.eventName === SKILL_CHECKPOINT_EVENT_RETRY
            ? 'needs_retry'
            : 'ready';

    return {
      ...definition,
      status,
      unlocked,
      passedAt: latest?.eventName === SKILL_CHECKPOINT_EVENT_PASSED ? latest.createdAt : null,
      lastReviewedAt: latest?.createdAt ?? null,
      lastDecisionByUserId: asString(metadata?.reviewedByUserId),
      latestNotes: asString(metadata?.notes),
    };
  });
}

export async function loadSkillCheckpointSummary(args: {
  userId: string;
  programSlug: string | null;
  completedCourseSlugs: string[];
}): Promise<SkillCheckpointSummary | null> {
  if (!args.programSlug) return null;

  const definitions = getSkillCheckpointDefinitionsForProgram(args.programSlug);
  if (definitions.length === 0) {
    return {
      programSlug: args.programSlug,
      programTitle: getProgramBySlug(args.programSlug)?.title ?? null,
      passedCount: 0,
      readyCount: 0,
      retryCount: 0,
      totalCount: 0,
      demonstratedSkillLabels: [],
      checkpoints: [],
    };
  }

  const entityIds = definitions.map((definition) => definition.key);
  const events = await prisma.memberEvent.findMany({
    where: {
      userId: args.userId,
      entityType: 'skill_checkpoint',
      entityId: { in: entityIds },
      eventName: { in: [SKILL_CHECKPOINT_EVENT_PASSED, SKILL_CHECKPOINT_EVENT_RETRY] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      eventName: true,
      entityId: true,
      createdAt: true,
      metadata: true,
    },
  });

  const checkpoints = summarizeSkillCheckpointState({
    definitions,
    completedCourseSlugs: args.completedCourseSlugs,
    events: events.map((event) => ({
      eventName: event.eventName,
      entityId: event.entityId,
      createdAt: event.createdAt,
      metadata: asRecord(event.metadata),
    })),
  });

  const demonstratedSkillLabels = Array.from(
    new Set(
      checkpoints
        .filter((checkpoint) => checkpoint.status === 'passed')
        .flatMap((checkpoint) => checkpoint.skillLabels),
    ),
  );

  return {
    programSlug: args.programSlug,
    programTitle: getProgramBySlug(args.programSlug)?.title ?? null,
    passedCount: checkpoints.filter((checkpoint) => checkpoint.status === 'passed').length,
    readyCount: checkpoints.filter((checkpoint) => checkpoint.status === 'ready').length,
    retryCount: checkpoints.filter((checkpoint) => checkpoint.status === 'needs_retry').length,
    totalCount: checkpoints.length,
    demonstratedSkillLabels,
    checkpoints,
  };
}

export async function recordSkillCheckpointDecision(args: {
  actorUserId: string;
  notes?: string | null;
  checkpointKey: string;
  decision: SkillCheckpointDecision;
  memberId: string;
  programSlug: string;
}): Promise<void> {
  const definition = getSkillCheckpointDefinitionsForProgram(args.programSlug).find(
    (item) => item.key === args.checkpointKey,
  );
  if (!definition) {
    throw new Error('Checkpoint not found for this program.');
  }

  const eventName =
    args.decision === 'passed'
      ? SKILL_CHECKPOINT_EVENT_PASSED
      : SKILL_CHECKPOINT_EVENT_RETRY;

  await prisma.memberEvent.create({
    data: {
      userId: args.memberId,
      eventName,
      entityType: 'skill_checkpoint',
      entityId: definition.key,
      sourcePage: '/admin/members',
      metadata: {
        checkpointKey: definition.key,
        checkpointTitle: definition.title,
        programSlug: args.programSlug,
        requiredCourseSlugs: definition.requiredCourseSlugs,
        suggestedReviewCourseSlug: definition.suggestedReviewCourseSlug,
        skillLabels: definition.skillLabels,
        notes: args.notes?.trim() || null,
        reviewedByUserId: args.actorUserId,
      },
    },
  });
}

export function getSkillCheckpointDefinition(programSlug: string, checkpointKey: string) {
  return getSkillCheckpointDefinitionsForProgram(programSlug).find(
    (definition) => definition.key === checkpointKey,
  ) ?? null;
}

export function getCheckpointSkillLabelsFromEvent(event: SkillCheckpointEventRecord) {
  return asStringArray(asRecord(event.metadata)?.skillLabels);
}
