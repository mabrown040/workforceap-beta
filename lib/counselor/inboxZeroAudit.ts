import 'server-only';

import type { NextRequest } from 'next/server';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getProfileRole } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

export type InboxZeroBulkAuditVerb =
  | 'launched'
  | 'completed'
  | 'experienced'
  | 'voided';

/**
 * Persist one xAPI AuditEvent per member for inbox-zero bulk actions.
 */
export async function logInboxZeroBulkAuditEvent(options: {
  actorUserId: string;
  memberId: string;
  verb: InboxZeroBulkAuditVerb;
  action: string;
  request?: Request | NextRequest;
  extensions?: Record<string, unknown>;
}): Promise<void> {
  const [orgId, profileRole] = await Promise.all([
    getActorOrganizationId(options.actorUserId),
    getProfileRole(options.actorUserId),
  ]);

  await logAuditEvent({
    user: { id: options.actorUserId, role: profileRole },
    verb: options.verb,
    object: { type: 'User', id: options.memberId },
    orgId,
    request: auditRequestMeta(options.request),
    result: {
      success: true,
      extensions: {
        inboxZeroAction: options.action,
        ...options.extensions,
      },
    },
  });
}
