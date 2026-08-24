import type { Prisma } from '@prisma/client';
import { MEMBER_ONLY_WHERE, MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

/** Training dashboard roster — members enrolled in a program in this tenant. */
export function trainingDashboardMemberWhere(
  organizationId: string,
): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    organizationId,
    ...MEMBER_ONLY_WHERE,
    enrolledProgram: { not: null },
  };
}

/** Admin home / overview triage roster. */
export function triageDigestMemberWhere(
  organizationId: string,
): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    organizationId,
    ...MEMBER_OR_DOGFOOD_WHERE,
  };
}

export function triageDigestNewApplicantWhere(
  organizationId: string,
  createdSince: Date,
): Prisma.UserWhereInput {
  return {
    ...triageDigestMemberWhere(organizationId),
    createdAt: { gte: createdSince },
    counselorAssignments: { none: { active: true } },
  };
}

export function triageDigestStaleTrainingWhere(
  organizationId: string,
): Prisma.UserWhereInput {
  return {
    ...triageDigestMemberWhere(organizationId),
    staleTrainingDetectedAt: { not: null },
  };
}

/** MemberEvent has no org column — scope through the user FK. */
export function triageDigestEventWhere(
  organizationId: string,
  createdSince: Date,
): Prisma.MemberEventWhereInput {
  return {
    createdAt: { gte: createdSince },
    user: { organizationId },
  };
}

export function triageDigestAssignmentWhere(
  organizationId: string,
): Prisma.CounselorAssignmentWhereInput {
  return {
    active: true,
    member: { organizationId },
  };
}

export function analyticsOverviewUserWhere(
  organizationId: string,
): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    organizationId,
    ...MEMBER_OR_DOGFOOD_WHERE,
  };
}
