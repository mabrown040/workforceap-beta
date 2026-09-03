import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { sendCounselorAssignedEmail } from '@/lib/email';
import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';
import { createNotification } from '@/lib/notifications/create';
import { logger } from '@/lib/observability/logger';
import { captureApiError } from '@/lib/observability/captureApiError';
import { matchAmbassador, pickAmbassadorReferralText } from '@/lib/counselor/ambassadorReferral';

export type AmbassadorAutoAssignInput = {
  memberId: string;
  source: 'apply_signup' | 'member_eligibility' | 'public_eligibility';
  hearAbout?: string | null;
  hearAboutOther?: string | null;
  partnerAmbassadorReferral?: string | null;
};

export type AmbassadorAutoAssignResult =
  | { assigned: true; counselorUserId: string; counselorName: string; matchedOn: 'email' | 'name' }
  | {
      assigned: false;
      reason:
        | 'no_referral_text'
        | 'member_not_found'
        | 'already_assigned'
        | 'no_match'
        | 'ambiguous'
        | 'failed';
    };

/**
 * Put a new applicant on their Community Ambassador's caseload automatically.
 *
 * When the applicant named an ambassador (hear-about write-in or the referral
 * field) and exactly one active Community Ambassador counselor in the member's
 * organisation matches by name or email, create the counselor assignment the
 * same way the admin "assign counselor" action does (assignment row, message
 * thread owner, member email + notification) and tell the ambassador. Anything
 * ambiguous is left for staff; this never overrides an existing assignment.
 *
 * Designed to run inside `after()` from the intake routes: it must never throw
 * into the request that created the account.
 */
export async function autoAssignAmbassadorFromReferral(
  input: AmbassadorAutoAssignInput,
): Promise<AmbassadorAutoAssignResult> {
  const text = pickAmbassadorReferralText(input);
  if (!text) return { assigned: false, reason: 'no_referral_text' };

  try {
    const member = await prisma.user.findFirst({
      where: { id: input.memberId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        organizationId: true,
        counselorAssignments: { where: { active: true }, select: { id: true }, take: 1 },
      },
    });
    if (!member) return { assigned: false, reason: 'member_not_found' };
    if (member.counselorAssignments.length > 0) return { assigned: false, reason: 'already_assigned' };

    const ambassadors = await prisma.counselor.findMany({
      where: {
        active: true,
        affiliation: 'community_ambassador',
        user: {
          deletedAt: null,
          ...(member.organizationId ? { organizationId: member.organizationId } : {}),
        },
      },
      select: { id: true, userId: true, user: { select: { fullName: true, email: true } } },
    });

    const match = matchAmbassador(
      text,
      ambassadors.map((a) => ({
        counselorId: a.id,
        userId: a.userId,
        fullName: a.user.fullName,
        email: a.user.email,
      })),
    );
    if (!match.ok) {
      if (match.reason !== 'no_referral_text') {
        logger.info('ambassador auto-assign: no unique ambassador match; left for staff', {
          memberId: member.id,
          source: input.source,
          reason: match.reason,
          candidates: ambassadors.length,
        });
      }
      return { assigned: false, reason: match.reason };
    }

    const { candidate } = match;
    await prisma.$transaction(async (tx) => {
      const existingPair = await tx.counselorAssignment.findUnique({
        where: { counselorId_memberId: { counselorId: candidate.counselorId, memberId: member.id } },
        select: { id: true },
      });
      if (existingPair) {
        await tx.counselorAssignment.update({
          where: { id: existingPair.id },
          data: { active: true, notes: `Auto-assigned from ${input.source} referral ("${text}")` },
        });
      } else {
        await tx.counselorAssignment.create({
          data: {
            counselorId: candidate.counselorId,
            memberId: member.id,
            active: true,
            notes: `Auto-assigned from ${input.source} referral ("${text}")`,
          },
        });
      }
    });

    const counselorName = candidate.fullName?.trim() || 'your Community Ambassador';

    try {
      const thread = await getOrCreateMemberCounselorThread(member.id);
      await prisma.messageThread.update({
        where: { id: thread.id },
        data: { counselorUserId: candidate.userId },
      });
      void createNotification({
        userId: member.id,
        type: 'task_assigned',
        title: 'You have a new advisor',
        body: `${counselorName} has been assigned as your career advisor.`,
        data: { counselorId: candidate.counselorId, counselorUserId: candidate.userId, threadId: thread.id },
      });
    } catch (threadError) {
      logger.warn('ambassador auto-assign: assignment saved but thread/notification failed', {
        memberId: member.id,
        err: threadError instanceof Error ? threadError.message : String(threadError),
      });
    }

    void createNotification({
      userId: candidate.userId,
      type: 'task_assigned',
      title: 'A member you referred just joined',
      body: `${member.fullName?.trim() || member.email} applied and named you as their Community Ambassador. They are now on your My members list.`,
      data: { memberId: member.id, link: `/counselor/students/${member.id}` },
    });

    try {
      await sendCounselorAssignedEmail({
        to: member.email,
        memberFullName: member.fullName ?? '',
        counselorFullName: counselorName,
        orgId: member.organizationId,
      });
    } catch (emailError) {
      logger.warn('ambassador auto-assign: member email failed', {
        memberId: member.id,
        err: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    void auditLog({
      actorUserId: member.id,
      action: 'ambassador_auto_assign',
      targetType: 'user',
      targetId: member.id,
      metadata: {
        source: input.source,
        counselorUserId: candidate.userId,
        counselorName,
        matchedOn: match.matchedOn,
        referralText: text,
      },
    }).catch(() => {});

    return { assigned: true, counselorUserId: candidate.userId, counselorName, matchedOn: match.matchedOn };
  } catch (error) {
    captureApiError(error, {
      route: `ambassadorAutoAssign#${input.source}`,
      extra: { memberId: input.memberId },
    });
    return { assigned: false, reason: 'failed' };
  }
}
