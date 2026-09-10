import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { hasAdminAccess } from '@/lib/auth/roleAccess';
import { canonicalizeProgramSlug, programSlugReadCandidates } from '@/lib/content/programSlug';
import { getPracticeLab, IT_SUPPORT_LAB_COURSE_SLUG, IT_SUPPORT_LAB_PROGRAM_SLUG, listPracticeLabsForAssignment, type PracticeLab } from '@/lib/content/itSupportLabs';
import type { LabDraftInput, LabSubmitInput, LabReviewInput, LabWorkspace, LabEvidenceSubmission, LabReviewRouting, LabReviewQueue, LabReviewQueueItem, LabStaffReviewWorkspace, LabReviewStatus } from './labWorkspaceTypes';

type Db = Prisma.TransactionClient;
type Actor = { id: string; organizationId: string; fullName: string; admin: boolean; counselorId: string | null };
type SubmissionRow = Prisma.MemberLabSubmissionGetPayload<{ include: { review: true } }>;
const INCLUDE_REVIEW = { review: true } as const;
const NEWEST_FIRST = [{ submittedAt: 'desc' }, { id: 'desc' }] as const;

export class LabWorkspaceError extends Error {
  constructor(public readonly code: 'FORBIDDEN' | 'LAB_NOT_AVAILABLE' | 'DRAFT_CONFLICT' | 'CONTENT_CHANGED' | 'INVALID_EVIDENCE' | 'ALREADY_SUBMITTED' | 'REVIEW_CONFLICT' | 'INVALID_REVIEW' | 'WORKSPACE_UNAVAILABLE', public readonly status: number) {
    super(code);
    this.name = 'LabWorkspaceError';
  }
}

function requireLabTransactions(): void {
  // Match the shared Prisma flattening modes without changing other workflows.
  // Evidence and its draft revision must commit together or neither may change.
  if (process.env.PRISMA_FLATTEN_TX === '1' || ['preview', 'development'].includes(process.env.VERCEL_ENV ?? '')) {
    throw new LabWorkspaceError('WORKSPACE_UNAVAILABLE', 503);
  }
}

async function actorFor(db: Db, userId: string): Promise<Actor | null> {
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, organizationId: true, fullName: true, profile: { select: { role: true } }, userRoles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) return null;
  const counselor = await db.counselor.findFirst({ where: { userId, active: true }, select: { id: true } });
  return { id: user.id, organizationId: user.organizationId, fullName: user.fullName, admin: hasAdminAccess(user.profile?.role ?? 'member', user.userRoles.map((r) => r.role.name)), counselorId: counselor?.id ?? null };
}

async function assignedLab(db: Db, actor: Actor, labId: string) {
  const lab = getPracticeLab(labId);
  if (!lab) return null;
  const enrollment = await db.courseEnrollment.findFirst({
    where: { userId: actor.id, organizationId: actor.organizationId, programSlug: { in: programSlugReadCandidates(IT_SUPPORT_LAB_PROGRAM_SLUG) }, user: { deletedAt: null } },
    orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
    select: { id: true, programSlug: true, curriculumVersion: true },
  });
  if (!enrollment) return null;
  const programSlug = canonicalizeProgramSlug(enrollment.programSlug);
  const eligible = listPracticeLabsForAssignment({ programSlug, curriculumVersion: enrollment.curriculumVersion, courseSlug: IT_SUPPORT_LAB_COURSE_SLUG });
  if (!eligible.some((candidate) => candidate.id === lab.id && candidate.contentVersion === lab.contentVersion)) return null;
  return { enrollmentId: enrollment.id, programSlug, curriculumVersion: enrollment.curriculumVersion, lab };
}

function answersFor(lab: PracticeLab, answers: Record<string, string>, submitting: boolean): Record<string, string> {
  const ids = new Set(lab.deliverables.map((item) => item.id));
  if (Object.keys(answers).some((id) => !ids.has(id))) throw new LabWorkspaceError('INVALID_EVIDENCE', 400);
  const normalized = Object.fromEntries(lab.deliverables.map((item) => [item.id, answers[item.id] ?? '']));
  if (submitting && Object.values(normalized).some((value) => !value.trim())) throw new LabWorkspaceError('INVALID_EVIDENCE', 400);
  return normalized;
}

function serializeSubmission(row: SubmissionRow): LabEvidenceSubmission {
  const review = row.review;
  return {
    id: row.id, attempt: row.attempt, draftRevision: row.draftRevision, contentVersion: row.contentVersion, rubricVersion: row.rubricVersion,
    labSnapshot: row.labSnapshot as unknown as PracticeLab, answers: row.answers as Record<string, string>, artifactUrl: row.artifactUrl,
    submittedAt: row.submittedAt.toISOString(), status: review ? review.decision as 'revision_requested' | 'reviewed' : 'submitted', reviewVersion: review ? 1 : 0,
    review: review ? {
      id: review.id, version: 1, decision: review.decision as 'revision_requested' | 'reviewed', feedback: review.feedback,
      rubricVersion: review.rubricVersion, rubricResults: review.rubricResults as LabReviewInput['rubricResults'],
      reviewer: { displayName: review.reviewerDisplayName, role: review.reviewerRole as 'admin' | 'counselor' }, reviewedAt: review.reviewedAt.toISOString(),
    } : null,
  };
}

async function routingFor(db: Db, memberId: string, organizationId: string): Promise<LabReviewRouting> {
  const assignments = await db.counselorAssignment.findMany({
    where: { memberId, active: true, counselor: { active: true, user: { organizationId, deletedAt: null } } },
    select: { counselor: { select: { user: { select: { fullName: true } } } } },
    orderBy: { assignedAt: 'desc' },
  });
  const counselorNames = [...new Set(assignments.map((item) => item.counselor.user.fullName))];
  return {
    assignedCounselor: counselorNames.length > 0, counselorNames,
    description: counselorNames.length > 0
      ? 'Submitted evidence is available to your assigned counselor and organization administrators. Your private draft is not shared.'
      : 'No active counselor is assigned. Organization administrators can review submitted evidence and arrange an assignment. Your private draft is not shared.',
  };
}

async function memberWorkspace(db: Db, actor: Actor, labId: string): Promise<LabWorkspace | null> {
  const assigned = await assignedLab(db, actor, labId);
  if (!assigned) return null;
  const { lab, enrollmentId, programSlug, curriculumVersion } = assigned;
  const draft = await db.memberLabDraft.findUnique({ where: { enrollmentId_labId_contentVersion: { enrollmentId, labId, contentVersion: lab.contentVersion } } });
  if (draft && (draft.userId !== actor.id || draft.organizationId !== actor.organizationId)) throw new LabWorkspaceError('FORBIDDEN', 403);
  const submissions = await db.memberLabSubmission.findMany({
    where: { userId: actor.id, organizationId: actor.organizationId, labId, programSlug, curriculumVersion },
    include: INCLUDE_REVIEW, orderBy: [...NEWEST_FIRST],
  });
  return {
    lab, programSlug, curriculumVersion,
    draft: { revision: draft?.revision ?? 0, answers: draft?.answers as Record<string, string> ?? answersFor(lab, {}, false), artifactUrl: draft?.artifactUrl ?? null, updatedAt: draft?.updatedAt.toISOString() ?? null },
    submissions: submissions.map(serializeSubmission), reviewRouting: await routingFor(db, actor.id, actor.organizationId),
  };
}

/** Server callers supply only the authenticated user id, inside an auth GUC context. */
export async function loadLabWorkspace(args: { userId: string; labId: string }): Promise<LabWorkspace | null> {
  return prisma.$transaction(async (db) => {
    const actor = await actorFor(db, args.userId);
    return actor ? memberWorkspace(db, actor, args.labId) : null;
  });
}

async function persistLab(userId: string, labId: string, input: LabDraftInput | LabSubmitInput, submitting: boolean): Promise<LabWorkspace> {
  requireLabTransactions();
  try {
    return await prisma.$transaction(async (db) => {
      const actor = await actorFor(db, userId);
      const assigned = actor ? await assignedLab(db, actor, labId) : null;
      if (!actor || !assigned) throw new LabWorkspaceError('LAB_NOT_AVAILABLE', 403);
      if (input.programSlug !== assigned.programSlug || input.curriculumVersion !== assigned.curriculumVersion) throw new LabWorkspaceError('LAB_NOT_AVAILABLE', 403);
      if (input.contentVersion !== assigned.lab.contentVersion) throw new LabWorkspaceError('CONTENT_CHANGED', 409);
      const answers = answersFor(assigned.lab, input.answers, submitting);
      const identity = { enrollmentId: assigned.enrollmentId, labId, contentVersion: assigned.lab.contentVersion };
      const previous = await db.memberLabDraft.findUnique({ where: { enrollmentId_labId_contentVersion: identity } });
      if (previous && (previous.userId !== actor.id || previous.organizationId !== actor.organizationId)) throw new LabWorkspaceError('FORBIDDEN', 403);
      if ((previous?.revision ?? 0) !== input.expectedDraftRevision) throw new LabWorkspaceError('DRAFT_CONFLICT', 409);
      if (submitting) {
        const latest = await db.memberLabSubmission.findFirst({
          where: { userId, organizationId: actor.organizationId, labId, programSlug: assigned.programSlug, curriculumVersion: assigned.curriculumVersion, contentVersion: assigned.lab.contentVersion },
          include: INCLUDE_REVIEW, orderBy: [...NEWEST_FIRST],
        });
        if (latest && latest.review?.decision !== 'revision_requested') throw new LabWorkspaceError('ALREADY_SUBMITTED', 409);
      }
      let draftId: string;
      const revision = input.expectedDraftRevision + 1;
      const attempt = (previous?.submissionCount ?? 0) + (submitting ? 1 : 0);
      if (previous) {
        const changed = await db.memberLabDraft.updateMany({
          where: { id: previous.id, userId, organizationId: actor.organizationId, revision: input.expectedDraftRevision },
          data: { answers, artifactUrl: input.artifactUrl, revision, submissionCount: attempt },
        });
        if (changed.count !== 1) throw new LabWorkspaceError('DRAFT_CONFLICT', 409);
        draftId = previous.id;
      } else {
        const created = await db.memberLabDraft.create({ data: { ...identity, userId, organizationId: actor.organizationId, programSlug: assigned.programSlug, curriculumVersion: assigned.curriculumVersion, answers, artifactUrl: input.artifactUrl, revision, submissionCount: attempt } });
        draftId = created.id;
      }
      if (submitting) {
        await db.memberLabSubmission.create({ data: {
          draftId, organizationId: actor.organizationId, userId, labId, programSlug: assigned.programSlug, curriculumVersion: assigned.curriculumVersion,
          contentVersion: assigned.lab.contentVersion, rubricVersion: assigned.lab.rubricVersion, draftRevision: revision, attempt,
          answers, artifactUrl: input.artifactUrl, labSnapshot: JSON.parse(JSON.stringify(assigned.lab)) as Prisma.InputJsonValue,
        } });
      }
      const workspace = await memberWorkspace(db, actor, labId);
      if (!workspace) throw new LabWorkspaceError('LAB_NOT_AVAILABLE', 403);
      return workspace;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new LabWorkspaceError('DRAFT_CONFLICT', 409);
    throw error;
  }
}

export const saveLabDraft = (userId: string, labId: string, input: LabDraftInput) => persistLab(userId, labId, input, false);
export const submitLabEvidence = (userId: string, labId: string, input: LabSubmitInput) => persistLab(userId, labId, input, true);

async function staffActor(db: Db, userId: string): Promise<Actor> {
  const actor = await actorFor(db, userId);
  if (!actor || (!actor.admin && !actor.counselorId)) throw new LabWorkspaceError('FORBIDDEN', 403);
  return actor;
}

async function staffMemberIds(db: Db, actor: Actor): Promise<string[] | null> {
  if (actor.admin) return null;
  const assignments = await db.counselorAssignment.findMany({
    where: { counselorId: actor.counselorId!, active: true, counselor: { active: true, user: { organizationId: actor.organizationId, deletedAt: null } }, member: { organizationId: actor.organizationId, deletedAt: null } },
    select: { memberId: true },
  });
  return assignments.map((item) => item.memberId).filter((id) => id !== actor.id);
}

async function staffScope(db: Db, actor: Actor): Promise<Prisma.MemberLabSubmissionWhereInput> {
  const ids = await staffMemberIds(db, actor);
  // Bind both the immutable record and the current member to the actor's org.
  // No super-admin cross-org bypass and no reviewing one's own work.
  const active = await db.user.findMany({ where: { organizationId: actor.organizationId, deletedAt: null, id: ids ? { in: ids, not: actor.id } : { not: actor.id } }, select: { id: true } });
  return { organizationId: actor.organizationId, userId: { in: active.map((member) => member.id) } };
}

async function memberFor(db: Db, actor: Actor, userId: string): Promise<LabReviewQueueItem['member']> {
  const member = await db.user.findFirst({ where: { id: userId, organizationId: actor.organizationId, deletedAt: null }, select: { id: true, fullName: true } });
  if (!member) throw new LabWorkspaceError('FORBIDDEN', 403);
  return { id: member.id, displayName: member.fullName, href: actor.admin ? `/admin/members/${member.id}` : `/counselor/students/${member.id}` };
}

export async function loadLabReviewQueue(args: { userId: string; status?: LabReviewStatus; cursor?: string | null }): Promise<LabReviewQueue> {
  return prisma.$transaction(async (db) => {
    const actor = await staffActor(db, args.userId);
    const scope = await staffScope(db, actor);
    const cursor = args.cursor ? await db.memberLabSubmission.findFirst({ where: { ...scope, id: args.cursor }, select: { id: true, submittedAt: true } }) : null;
    if (args.cursor && !cursor) throw new LabWorkspaceError('FORBIDDEN', 403);
    const status = args.status ?? 'submitted';
    const rows = await db.memberLabSubmission.findMany({
      where: { ...scope, ...(status === 'submitted' ? { review: { is: null } } : { review: { is: { decision: status } } }),
        ...(cursor ? { OR: [{ submittedAt: { lt: cursor.submittedAt } }, { submittedAt: cursor.submittedAt, id: { lt: cursor.id } }] } : {}),
      }, include: INCLUDE_REVIEW, orderBy: [...NEWEST_FIRST], take: 26,
    });
    const items = await Promise.all(rows.slice(0, 25).map(async (row): Promise<LabReviewQueueItem> => ({
      submissionId: row.id, member: await memberFor(db, actor, row.userId), labId: row.labId, labTitle: (row.labSnapshot as unknown as PracticeLab).title,
      contentVersion: row.contentVersion, programSlug: row.programSlug, curriculumVersion: row.curriculumVersion, attempt: row.attempt,
      status: row.review ? row.review.decision as LabReviewStatus : 'submitted', submittedAt: row.submittedAt.toISOString(), reviewRouting: await routingFor(db, row.userId, actor.organizationId),
    })));
    return { items, nextCursor: rows.length > 25 ? rows[24]!.id : null };
  });
}

async function staffDetail(db: Db, actor: Actor, submissionId: string): Promise<LabStaffReviewWorkspace | null> {
  const scope = await staffScope(db, actor);
  const row = await db.memberLabSubmission.findFirst({ where: { ...scope, id: submissionId }, include: INCLUDE_REVIEW });
  if (!row) return null;
  const history = await db.memberLabSubmission.findMany({
    where: { ...scope, userId: row.userId, labId: row.labId, programSlug: row.programSlug, curriculumVersion: row.curriculumVersion }, include: INCLUDE_REVIEW, orderBy: [...NEWEST_FIRST],
  });
  return { member: await memberFor(db, actor, row.userId), submission: serializeSubmission(row), history: history.map(serializeSubmission),
    reviewRouting: await routingFor(db, row.userId, actor.organizationId), canReview: !row.review && history.find((item) => item.contentVersion === row.contentVersion)?.id === row.id };
}

export async function loadLabReview(args: { userId: string; submissionId: string }): Promise<LabStaffReviewWorkspace | null> {
  return prisma.$transaction(async (db) => staffDetail(db, await staffActor(db, args.userId), args.submissionId));
}

export async function reviewLabEvidence(userId: string, submissionId: string, input: LabReviewInput): Promise<LabStaffReviewWorkspace> {
  requireLabTransactions();
  try {
    return await prisma.$transaction(async (db) => {
      const actor = await staffActor(db, userId);
      const detail = await staffDetail(db, actor, submissionId);
      if (!detail) throw new LabWorkspaceError('FORBIDDEN', 403);
      if (!detail.canReview || input.expectedReviewVersion !== detail.submission.reviewVersion) throw new LabWorkspaceError('REVIEW_CONFLICT', 409);
      const criteria = detail.submission.labSnapshot.rubric;
      const ids = new Set(input.rubricResults.map((result) => result.criterionId));
      if (input.rubricResults.length !== criteria.length || ids.size !== criteria.length || criteria.some((criterion) => !ids.has(criterion.id)) ||
        (input.decision === 'reviewed' && input.rubricResults.some((result) => result.score !== 2))) throw new LabWorkspaceError('INVALID_REVIEW', 400);
      await db.memberLabReview.create({ data: {
        submissionId, reviewerId: actor.id, reviewerDisplayName: actor.fullName, reviewerRole: actor.admin ? 'admin' : 'counselor',
        decision: input.decision, feedback: input.feedback, rubricVersion: detail.submission.rubricVersion, rubricResults: input.rubricResults,
      } });
      const updated = await staffDetail(db, actor, submissionId);
      if (!updated) throw new LabWorkspaceError('FORBIDDEN', 403);
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new LabWorkspaceError('REVIEW_CONFLICT', 409);
    throw error;
  }
}
