import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { sendEnrollmentConfirmationEmail, sendApplicationRejectedEmail } from '@/lib/email';
import { getProgramByInterestValue } from '@/lib/content/programs';
import { trackEvent } from '@/lib/events/track';
import type { ApplicationStatus } from '@prisma/client';

/**
 * Shared core of "change an application's status," used by both the
 * single-record PATCH route (`/api/admin/members/[id]/status`) and the bulk
 * review route (`/api/admin/applications/bulk-review`). One implementation
 * so the two paths can't drift on the compliance-sensitive parts: the
 * enrollment/rejection emails, the audit trail, and the funnel event.
 */

export type ApplicationReviewResult =
  | { ok: true; applicationId: string; previousStatus: ApplicationStatus; newStatus: ApplicationStatus }
  | { ok: false; applicationId: string; error: string };

function resolveApplicationStatusVerb(status: ApplicationStatus): string {
  if (status === 'APPROVED') return 'approved';
  if (status === 'DENIED') return 'voided';
  return 'status-changed';
}

export async function changeApplicationStatus(args: {
  applicationId: string;
  status: ApplicationStatus;
  notes?: string;
  orgId: string;
  actorUserId: string;
  actorRole: 'admin' | 'super_admin';
  requestMeta: ReturnType<typeof auditRequestMeta>;
}): Promise<ApplicationReviewResult> {
  const { applicationId: id, status, notes, orgId, actorUserId, actorRole, requestMeta } = args;

  // Tenant scope: Application isn't in TENANT_SCOPED_MODELS but is org-bound
  // via its owning User. Filter through the parent so an admin from Org A
  // can't change status on an Org B member's application by guessing the id.
  const application = await prisma.$transaction((tx) =>
    tx.application.findFirst({
      where: { id, user: { organizationId: orgId } },
      include: { user: { select: { email: true, fullName: true, programInterest: true } } },
    }),
  );

  if (!application) {
    return { ok: false, applicationId: id, error: 'Application not found' };
  }

  const previousStatus = application.status;

  // updateMany ensures the FK-filter is honored on the write side.
  // (Plain update({where:{id}}) bypasses the user.organizationId clause.)
  await prisma.$transaction((tx) =>
    tx.application.updateMany({
      where: { id, user: { organizationId: orgId } },
      data: { status, notes: notes ?? application.notes },
    }),
  );

  // Best-effort: send enrollment confirmation / rejection emails to member
  if (status === 'APPROVED') {
    const interest = application.user.programInterest ?? application.programInterest;
    const program = interest ? getProgramByInterestValue(interest) : undefined;
    const programName = program?.title ?? application.programInterest ?? 'your selected program';

    const assignment = await prisma.$transaction((tx) =>
      tx.counselorAssignment.findFirst({
        where: { memberId: application.userId, active: true },
        include: { counselor: { include: { user: { select: { fullName: true, email: true } } } } },
      }),
    );
    const counselorName = assignment?.counselor.user.fullName ?? undefined;
    const counselorContact = assignment?.counselor.user.email ?? undefined;

    sendEnrollmentConfirmationEmail({
      to: application.user.email,
      fullName: application.user.fullName,
      programName,
      counselorName,
      counselorContact,
    }).catch((err) => console.error('Enrollment confirmation email failed:', err));
  } else if (status === 'DENIED') {
    sendApplicationRejectedEmail({
      to: application.user.email,
      fullName: application.user.fullName,
    }).catch((err) => console.error('Application rejected email failed:', err));
  }

  if ((status === 'APPROVED' || status === 'DENIED') && previousStatus !== status) {
    await trackEvent({
      userId: application.userId,
      eventName: status === 'APPROVED' ? 'application_approved' : 'application_denied',
      entityType: 'application',
      entityId: id,
      metadata: { previousStatus, decidedByUserId: actorUserId },
    });
  }

  await auditLog({
    actorUserId,
    action: 'application_status_change',
    targetType: 'application',
    targetId: id,
    metadata: {
      previousStatus,
      newStatus: status,
      userId: application.userId,
      userEmail: application.user.email,
    },
  });

  await logAuditEvent({
    user: { id: actorUserId, role: actorRole },
    verb: resolveApplicationStatusVerb(status),
    object: { type: 'Application', id },
    result: {
      success: true,
      extensions: { previousStatus, newStatus: status, userId: application.userId },
    },
    request: requestMeta,
    orgId,
  }).catch((err) => console.error('[audit] application status change:', err));

  return { ok: true, applicationId: id, previousStatus, newStatus: status };
}
