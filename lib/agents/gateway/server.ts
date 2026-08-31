import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { resolveAuthGucContext } from '@/lib/auth/server';
import { runWithGucContext } from '@/lib/db/gucContext';
import { getActiveProgramForDashboard } from '@/lib/member/getActiveProgramForDashboard';
import { loadMemberDashboardHome } from '@/lib/member/loadMemberDashboardHome';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';
import { programSlugsEquivalent } from '@/lib/content/programSlug';
import {
  loadAgentKnowledgeManifest,
  resolveTrustedProgramKnowledge,
} from '@/lib/agents/knowledge';
import { createMemberAgentGateway } from './core';
import type {
  AuthenticatedAgentPrincipal,
  CourseraGatewaySnapshot,
  MemberAgentGateway,
  MemberAgentGatewayReader,
  MemberGatewaySnapshot,
} from './types';

const COURSERA_COURSE_LIMIT = 12;

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadGovernedProgramKnowledge(programSlug: string) {
  try {
    const manifest = await loadAgentKnowledgeManifest();
    const knowledge = resolveTrustedProgramKnowledge(manifest, programSlug);
    if (!knowledge) {
      return {
        governanceState: 'unavailable' as const,
        approvalState: 'unknown' as const,
        approvedTitle: null,
        approvedCourseCount: null,
        approvedVersion: null,
        courseraAvailability: 'unknown' as const,
        launchable: false,
        operationalAsOf: null,
        reason: 'No current governed program record could be verified. Do not infer approval or Coursera availability.',
        citations: [] as string[],
      };
    }
    return {
      governanceState: 'verified' as const,
      approvalState: knowledge.approval.state,
      approvedTitle: knowledge.approval.title,
      approvedCourseCount: knowledge.approval.courses.length,
      approvedVersion: knowledge.approval.version,
      courseraAvailability: knowledge.coursera.availabilityState,
      launchable: knowledge.coursera.launchable,
      operationalAsOf: knowledge.coursera.snapshotAsOf,
      reason: knowledge.coursera.reason,
      citations: knowledge.citations.map((citation) => citation.label),
    };
  } catch {
    return {
      governanceState: 'unavailable' as const,
      approvalState: 'unknown' as const,
      approvedTitle: null,
      approvedCourseCount: null,
      approvedVersion: null,
      courseraAvailability: 'unknown' as const,
      launchable: false,
      operationalAsOf: null,
      reason: 'Governed curriculum evidence is unavailable or stale. Do not infer approval or Coursera availability.',
      citations: [] as string[],
    };
  }
}

async function inPrincipalContext<T>(
  principal: AuthenticatedAgentPrincipal,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithGucContext(
    {
      userId: principal.userId,
      orgId: principal.organizationId,
      role: principal.role,
    },
    fn,
  );
}

export const SERVER_MEMBER_AGENT_GATEWAY_READER: MemberAgentGatewayReader = {
  async memberExistsInScope(principal) {
    return inPrincipalContext(principal, async () => {
      const row = await prisma.$transaction((tx) =>
        tx.user.findFirst({
          where: {
            id: principal.userId,
            organizationId: principal.organizationId,
            deletedAt: null,
          },
          select: { id: true },
        }),
      );
      return Boolean(row);
    });
  },

  async loadMemberSnapshot(principal): Promise<MemberGatewaySnapshot | null> {
    return inPrincipalContext(principal, async () => {
      const active = await getActiveProgramForDashboard({ userId: principal.userId });
      const [home, training, programKnowledge] = await Promise.all([
        loadMemberDashboardHome({ userId: principal.userId }),
        active.activeProgramSlug
          ? loadMemberProgramTrainingView({
              userId: principal.userId,
              programSlug: active.activeProgramSlug,
              // Avoid provider calls on an agent tool read. The validated local
              // progress source remains the same one used by the member portal.
              readOnlyAudit: true,
            })
          : null,
        active.activeProgramSlug
          ? loadGovernedProgramKnowledge(active.activeProgramSlug)
          : null,
      ]);
      const activeProgramSlug = active.activeProgramSlug;
      const selectedEnrollment = activeProgramSlug
        ? active.allEnrollments.find((enrollment) =>
            programSlugsEquivalent(enrollment.programSlug, activeProgramSlug),
          ) ?? null
        : null;

      return {
        programName: active.programTitle ?? home.programTitle ?? null,
        programSlug: activeProgramSlug,
        curriculumVersion: selectedEnrollment?.curriculumVersion ?? null,
        // The kit dashboard deliberately surfaces only a persisted, real
        // action here; omit rather than invent a generic training instruction.
        nextActions: home.doThisNext
          ? [{
              id: home.doThisNext.id,
              title: home.doThisNext.title,
              body: home.doThisNext.body,
              href: home.doThisNext.href,
              cta: home.doThisNext.cta,
            }]
          : [],
        training: training
          ? {
              completedCount: training.completedCount,
              totalCourses: training.totalCourses,
              progressPercent: training.progressPercentDisplay,
              allComplete: training.allCoursesComplete,
              hasStarted: training.hasStartedTraining,
              nextCourseName: training.nextIncompleteCourseName,
              lastActivityAt: training.lastTrainingActivityAt,
            }
          : null,
        programKnowledge,
      };
    });
  },

  async loadCourseraSnapshot(principal): Promise<CourseraGatewaySnapshot | null> {
    return inPrincipalContext(principal, () =>
      prisma.$transaction(async (tx) => {
        const where = {
          userId: principal.userId,
          organizationId: principal.organizationId,
          isRemovedFromProgram: false,
        } as const;
        const [summary, completedCourses, rows] = await Promise.all([
          tx.courseraCourseProgress.aggregate({
            where,
            _count: { _all: true },
            _avg: { overallProgress: true },
            _max: { lastActivityTime: true, lastSyncedAt: true },
          }),
          tx.courseraCourseProgress.count({ where: { ...where, isCompleted: true } }),
          tx.courseraCourseProgress.findMany({
            take: COURSERA_COURSE_LIMIT,
            where,
            orderBy: [
              { isCompleted: 'asc' },
              { lastActivityTime: 'desc' },
              { lastSyncedAt: 'desc' },
            ],
            select: {
              courseName: true,
              programName: true,
              overallProgress: true,
              isCompleted: true,
              lastActivityTime: true,
              certificateUrl: true,
            },
          }),
        ]);

        return {
          totalCourses: summary._count._all,
          completedCourses,
          averageProgressPercent: numberValue(summary._avg.overallProgress),
          lastActivityAt: summary._max.lastActivityTime ?? null,
          lastSyncedAt: summary._max.lastSyncedAt ?? null,
          courses: rows.map((row) => ({
            name: row.courseName,
            programName: row.programName,
            progressPercent: numberValue(row.overallProgress),
            completed: row.isCompleted,
            lastActivityAt: row.lastActivityTime,
            certificateAvailable: Boolean(row.certificateUrl),
          })),
        };
      }),
    );
  },
};

/**
 * Construct a gateway from an already verified, server-owned principal such
 * as a short-lived Agent Gateway session. The scope check is repeated here so
 * a removed member or changed organization fails closed after token issuance.
 */
export async function createMemberAgentGatewayForPrincipal(
  principal: AuthenticatedAgentPrincipal,
): Promise<MemberAgentGateway | null> {
  const exists = await SERVER_MEMBER_AGENT_GATEWAY_READER.memberExistsInScope(principal);
  if (!exists) return null;
  return createMemberAgentGateway({
    principal,
    reader: SERVER_MEMBER_AGENT_GATEWAY_READER,
  });
}

/**
 * Resolve a verified request principal and construct its request-scoped
 * gateway. Null means auth is absent, the organization bootstrap failed, or
 * the account is not an active member record. No caller-supplied identifiers
 * are accepted.
 */
export async function createAuthenticatedMemberAgentGateway(): Promise<MemberAgentGateway | null> {
  const ctx = await resolveAuthGucContext();
  if (
    !ctx.userId ||
    !ctx.orgId ||
    ctx.role === 'anonymous' ||
    ctx.role === 'system'
  ) {
    return null;
  }

  const principal: AuthenticatedAgentPrincipal = Object.freeze({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    role: ctx.role,
  });
  return createMemberAgentGatewayForPrincipal(principal);
}
