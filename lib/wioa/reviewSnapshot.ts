import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { resolveActorSnapshot } from '@/lib/audit';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

/**
 * Immutable eligibility decision trail — see the `WioaReviewSnapshot` model
 * comment in prisma/schema.prisma for why this exists and why the subject
 * (`userId`/`applicationId`) is a plain column, not a foreign key.
 *
 * Every write goes through `recordWioaReviewSnapshot`. There is no update or
 * delete path for this table by design — never add one; a correction is a
 * new row, same as the source-of-truth WIOA statuses this exists to audit.
 */

export type WioaReviewSnapshotSource = 'wioa_review' | 'application_decision';

type RecordSnapshotArgs = {
  organizationId: string;
  userId: string;
  applicationId?: string | null;
  source: WioaReviewSnapshotSource;
  decision: string;
  notes?: string | null;
  actorUserId: string | null;
};

/**
 * Freeze the member's WIOA-relevant eligibility fields at this moment —
 * self-screening answers plus the profile barrier/income/veteran/disability
 * data a WIOA monitoring review would ask to see alongside the decision.
 */
async function buildEligibilitySnapshot(userId: string): Promise<Record<string, unknown>> {
  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      programInterest: true,
      wioaQualificationJson: true,
      wioaReviewStatus: true,
      profile: {
        select: {
          dob: true,
          veteranStatus: true,
          employmentStatus: true,
          employmentStatusAtEnroll: true,
          educationLevel: true,
          householdIncome: true,
          usCitizen: true,
          authorizedToWork: true,
          hasDisability: true,
          hasEmploymentBarrier: true,
          barrierTypes: true,
          isMinor: true,
        },
      },
    },
  });

  const selfScreening = parseWioaQualificationSnapshot(member?.wioaQualificationJson ?? null);

  return {
    programInterest: member?.programInterest ?? null,
    wioaReviewStatusAtDecision: member?.wioaReviewStatus ?? null,
    selfScreening,
    profile: member?.profile ?? null,
  };
}

export async function recordWioaReviewSnapshot(args: RecordSnapshotArgs): Promise<void> {
  const { organizationId, userId, applicationId, source, decision, notes, actorUserId } = args;

  try {
    const [member, actorSnapshot, eligibilitySnapshot] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } }),
      resolveActorSnapshot(actorUserId),
      buildEligibilitySnapshot(userId),
    ]);

    await prisma.wioaReviewSnapshot.create({
      data: {
        organizationId,
        userId,
        memberEmailSnapshot: member?.email ?? 'unknown',
        memberNameSnapshot: member?.fullName ?? 'unknown',
        applicationId: applicationId ?? null,
        source,
        decision,
        notes: notes ?? null,
        actorUserId,
        actorEmailSnapshot: actorSnapshot.email,
        actorRoleSnapshot: actorSnapshot.role,
        eligibilitySnapshot: eligibilitySnapshot as object,
      },
    });
  } catch (error) {
    // Never let the audit trail block the decision it's recording.
    console.error('[wioa] failed to record review snapshot:', error);
  }
}

export type WioaReviewSnapshotRow = {
  id: string;
  source: string;
  decision: string;
  notes: string | null;
  actorEmailSnapshot: string | null;
  actorRoleSnapshot: string | null;
  createdAt: Date;
};

/** Read-only decision history for a member, newest first. */
export async function loadWioaReviewSnapshots(
  userId: string,
  organizationId: string,
): Promise<WioaReviewSnapshotRow[]> {
  return prisma.wioaReviewSnapshot.findMany({
    where: { userId, organizationId },
    select: {
      id: true,
      source: true,
      decision: true,
      notes: true,
      actorEmailSnapshot: true,
      actorRoleSnapshot: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
