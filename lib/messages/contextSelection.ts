import type { CounselorInboxRow } from '@/lib/messages/counselorInbox';

export type MessageQueryValue = string | string[] | undefined;

const MAX_CONTEXT_ID_LENGTH = 200;

/**
 * Accept one unambiguous query value. Repeated parameters are ignored instead
 * of letting array ordering decide which member or thread the portal opens.
 */
export function normalizeMessageQueryValue(value: MessageQueryValue): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_CONTEXT_ID_LENGTH) return null;
  return normalized;
}

type CounselorMessageRow = Pick<CounselorInboxRow, 'memberId' | 'threadId'>;

export type AuthorizedCounselorMessageContext = {
  memberId: string;
  threadId: string;
};

/**
 * Resolve a deep link only through inbox rows the server already authorized
 * for the signed-in counselor. Query ids are never used as an access grant.
 */
export function resolveAuthorizedCounselorMessageContext(
  rows: readonly CounselorMessageRow[],
  requested: { threadId?: MessageQueryValue; memberId?: MessageQueryValue },
): AuthorizedCounselorMessageContext | null {
  const requestedThreadId = normalizeMessageQueryValue(requested.threadId);
  if (requestedThreadId) {
    const row = rows.find((candidate) => candidate.threadId === requestedThreadId);
    if (row) return { memberId: row.memberId, threadId: row.threadId };
  }

  const requestedMemberId = normalizeMessageQueryValue(requested.memberId);
  if (requestedMemberId) {
    const row = rows.find((candidate) => candidate.memberId === requestedMemberId);
    if (row) return { memberId: row.memberId, threadId: row.threadId };
  }

  return null;
}

export type PartnerMessageMember = {
  id: string;
  fullName: string;
};

/** Resolve a partner member context only from the server-loaded referral set. */
export function resolveAuthorizedPartnerMessageMember(
  permittedMembers: readonly PartnerMessageMember[],
  requestedMemberId: MessageQueryValue,
): PartnerMessageMember | null {
  const normalizedMemberId = normalizeMessageQueryValue(requestedMemberId);
  if (!normalizedMemberId) return null;
  return permittedMembers.find((member) => member.id === normalizedMemberId) ?? null;
}
