#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { CourseProgressStatus, Prisma, PrismaClient } from '@prisma/client';

import {
  PROGRAM_SLUG_ALIASES,
  canonicalizeProgramSlug,
  programSlugReadCandidates,
} from '../lib/content/programSlug';
import { loadValidatedProgramCourses } from '../lib/coursera/programCourseList';
import { reconcileProgramProgress } from '../lib/coursera/progressReconciliation';

const prisma = new PrismaClient();
const BATCH_SIZE = 500;
const MAX_SERIALIZABLE_ATTEMPTS = 3;
const aliasSlugs = Object.keys(PROGRAM_SLUG_ALIASES);

type Summary = { scanned: number; renamed: number; collisionsMerged: number };

type CourseProgressRow = {
  id: string;
  userId: string;
  programSlug: string;
  courseSlug: string;
  courseId: string | null;
  status: CourseProgressStatus;
  percentComplete: number;
  progressPct: number;
  scoreScaled: number | null;
  scoreRaw: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt: Date | null;
  statementCount: number;
  lastUpdatedAt: Date;
};

class StaleBackfillRowError extends Error {}

function laterDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function earlierDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

const STATUS_RANK: Record<CourseProgressStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
};

function strongerStatus(a: CourseProgressStatus, b: CourseProgressStatus): CourseProgressStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

/** Pure merge ladder used by the collision transaction and regression tests. */
export function mergeCourseProgressCollision(
  target: CourseProgressRow,
  source: CourseProgressRow,
): Prisma.CourseProgressUpdateManyMutationInput {
  const status = strongerStatus(target.status, source.status);
  const completed = status === CourseProgressStatus.COMPLETED;
  return {
    status,
    percentComplete: completed ? 100 : Math.max(target.percentComplete, source.percentComplete),
    progressPct: completed ? 100 : Math.max(target.progressPct, source.progressPct),
    scoreScaled: maxNullable(target.scoreScaled, source.scoreScaled),
    scoreRaw: maxNullable(target.scoreRaw, source.scoreRaw),
    startedAt: earlierDate(target.startedAt, source.startedAt),
    completedAt: completed ? laterDate(target.completedAt, source.completedAt) : null,
    lastActivityAt: laterDate(target.lastActivityAt, source.lastActivityAt),
    statementCount: target.statementCount + source.statementCount,
    courseId: target.courseId ?? source.courseId,
  };
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof StaleBackfillRowError ||
    (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034')
  );
}

async function withSerializableRetry<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS) throw error;
    }
  }
  throw new Error('Serializable retry loop exhausted');
}

function touchedKey(userId: string, programSlug: string): string {
  return `${userId}\u0000${canonicalizeProgramSlug(programSlug)}`;
}

function parseTouchedKey(key: string): { userId: string; programSlug: string } {
  const separator = key.indexOf('\u0000');
  return { userId: key.slice(0, separator), programSlug: key.slice(separator + 1) };
}

async function applyCourseProgressRow(row: CourseProgressRow): Promise<'renamed' | 'collision' | 'gone'> {
  const canonical = canonicalizeProgramSlug(row.programSlug);
  return withSerializableRetry(async (tx) => {
    const source = await tx.courseProgress.findUnique({ where: { id: row.id } });
    if (!source || source.programSlug === canonical || canonicalizeProgramSlug(source.programSlug) !== canonical) {
      return 'gone';
    }

    const target = await tx.courseProgress.findUnique({
      where: {
        userId_programSlug_courseSlug: {
          userId: source.userId,
          programSlug: canonical,
          courseSlug: source.courseSlug,
        },
      },
    });

    if (target && target.id !== source.id) {
      const updated = await tx.courseProgress.updateMany({
        where: { id: target.id, lastUpdatedAt: target.lastUpdatedAt },
        data: mergeCourseProgressCollision(target, source),
      });
      if (updated.count !== 1) throw new StaleBackfillRowError('Canonical target changed');
      const deleted = await tx.courseProgress.deleteMany({
        where: { id: source.id, programSlug: source.programSlug, lastUpdatedAt: source.lastUpdatedAt },
      });
      if (deleted.count !== 1) throw new StaleBackfillRowError('Alias source changed');
      return 'collision';
    }

    const renamed = await tx.courseProgress.updateMany({
      where: { id: source.id, programSlug: source.programSlug, lastUpdatedAt: source.lastUpdatedAt },
      data: { programSlug: canonical },
    });
    if (renamed.count !== 1) throw new StaleBackfillRowError('Alias source changed');
    return 'renamed';
  });
}

async function canonicalizeCourseProgress(apply: boolean, touched: Set<string>): Promise<Summary> {
  const summary: Summary = { scanned: 0, renamed: 0, collisionsMerged: 0 };
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.courseProgress.findMany({
      take: BATCH_SIZE,
      ...(!apply && cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { programSlug: { in: aliasSlugs } },
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    if (!apply) cursor = rows.at(-1)!.id;

    for (const row of rows) {
      summary.scanned += 1;
      touched.add(touchedKey(row.userId, row.programSlug));
      const canonical = canonicalizeProgramSlug(row.programSlug);
      if (!apply) {
        const target = await prisma.courseProgress.findUnique({
          where: {
            userId_programSlug_courseSlug: {
              userId: row.userId,
              programSlug: canonical,
              courseSlug: row.courseSlug,
            },
          },
        });
        if (target && target.id !== row.id) summary.collisionsMerged += 1;
        else summary.renamed += 1;
        continue;
      }
      const result = await applyCourseProgressRow(row);
      if (result === 'collision') summary.collisionsMerged += 1;
      else if (result === 'renamed') summary.renamed += 1;
    }
  }
  return summary;
}

async function applyRollupAliasRow(row: {
  id: string;
  userId: string;
  programSlug: string;
  lastUpdatedAt: Date;
}): Promise<'renamed' | 'collision' | 'gone'> {
  const canonical = canonicalizeProgramSlug(row.programSlug);
  return withSerializableRetry(async (tx) => {
    const source = await tx.memberProgramProgress.findUnique({ where: { id: row.id } });
    if (!source || source.programSlug === canonical || canonicalizeProgramSlug(source.programSlug) !== canonical) {
      return 'gone';
    }
    const target = await tx.memberProgramProgress.findUnique({
      where: { userId_programSlug: { userId: source.userId, programSlug: canonical } },
    });
    const deleted = await tx.memberProgramProgress.deleteMany({
      where: { id: source.id, programSlug: source.programSlug, lastUpdatedAt: source.lastUpdatedAt },
    });
    if (deleted.count !== 1) throw new StaleBackfillRowError('Alias rollup changed');
    // Never preserve max aggregate values. The canonical row, if present, is
    // overwritten from validated course facts after all alias rows are gone.
    return target && target.id !== source.id ? 'collision' : 'renamed';
  });
}

async function canonicalizeProgramRollups(apply: boolean, touched: Set<string>): Promise<Summary> {
  const summary: Summary = { scanned: 0, renamed: 0, collisionsMerged: 0 };
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.memberProgramProgress.findMany({
      take: BATCH_SIZE,
      ...(!apply && cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { programSlug: { in: aliasSlugs } },
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    if (!apply) cursor = rows.at(-1)!.id;

    for (const row of rows) {
      summary.scanned += 1;
      touched.add(touchedKey(row.userId, row.programSlug));
      const canonical = canonicalizeProgramSlug(row.programSlug);
      if (!apply) {
        const target = await prisma.memberProgramProgress.findUnique({
          where: { userId_programSlug: { userId: row.userId, programSlug: canonical } },
        });
        if (target && target.id !== row.id) summary.collisionsMerged += 1;
        else summary.renamed += 1;
        continue;
      }
      const result = await applyRollupAliasRow(row);
      if (result === 'collision') summary.collisionsMerged += 1;
      else if (result === 'renamed') summary.renamed += 1;
    }
  }
  return summary;
}

async function refreshValidatedRollup(userId: string, programSlug: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user) return;

  const readSlugs = programSlugReadCandidates(programSlug);
  const validated = await loadValidatedProgramCourses({
    organizationId: user.organizationId,
    programSlug,
    checkB4BContents: false,
  });
  const facts = await prisma.courseProgress.findMany({
    where: { userId, programSlug: { in: readSlugs } },
    select: { courseSlug: true, courseId: true, status: true, percentComplete: true },
  });
  const reconciliation = reconcileProgramProgress({
    validatedCourses: validated.courses,
    localRows: facts,
  });
  await prisma.memberProgramProgress.upsert({
    where: { userId_programSlug: { userId, programSlug } },
    create: {
      userId,
      programSlug,
      coursesCompleted: reconciliation.completedCount,
      averagePercent: reconciliation.programPercent,
    },
    update: {
      coursesCompleted: reconciliation.completedCount,
      averagePercent: reconciliation.programPercent,
    },
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run') || !apply;
  if (apply && process.argv.includes('--dry-run')) {
    throw new Error('Choose exactly one mode: --dry-run or --apply');
  }

  const touched = new Set<string>();
  const courseProgress = await canonicalizeCourseProgress(apply, touched);
  const memberProgramProgress = await canonicalizeProgramRollups(apply, touched);
  let rollupsRefreshed = 0;
  if (apply) {
    for (const key of touched) {
      const { userId, programSlug } = parseTouchedKey(key);
      await refreshValidatedRollup(userId, programSlug);
      rollupsRefreshed += 1;
    }
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    courseProgress,
    memberProgramProgress,
    rollupsRefreshed,
  }, null, 2));
}

function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(path.resolve(entry)).href === import.meta.url);
}

if (isDirectInvocation()) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'Canonical slug backfill failed');
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
