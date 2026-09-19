import { prisma } from '@/lib/db/prisma';
import { isAdmin, isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { ensureSelfServeCounselorAssigned } from '@/lib/counselor/autoAssign';

const MAX_BODY = 8000;

export type ThreadMessageRow = {
  id: string;
  threadId: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
};

export function compactStringIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function getMessageAuthorName(nameById: Map<string, string | null>, authorId: string | null): string {
  return authorId ? (nameById.get(authorId) ?? 'User') : 'User';
}

export async function resolveAssignedCounselorUserId(memberId: string): Promise<string | null> {
  const row = await prisma.counselorAssignment.findFirst({
    where: { memberId, active: true },
    orderBy: { assignedAt: 'desc' },
    select: { counselor: { select: { userId: true, active: true } } },
  });
  if (!row?.counselor?.active) return null;
  return row.counselor.userId;
}

export async function getOrCreateMemberCounselorThread(memberId: string) {
  const existing = await prisma.messageThread.findUnique({
    where: { memberId },
  });
  if (existing?.counselorUserId) return existing;

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { organizationId: true },
  });
  if (member?.organizationId) {
    await ensureSelfServeCounselorAssigned({
      memberId,
      organizationId: member.organizationId,
    });
  }

  const thread = existing ?? await prisma.messageThread.findUnique({
    where: { memberId },
  });
  if (thread) {
    if (!thread.counselorUserId) {
      const cid = await resolveAssignedCounselorUserId(memberId);
      if (cid) {
        return prisma.messageThread.update({
          where: { id: thread.id },
          data: { counselorUserId: cid },
        });
      }
    }
    return thread;
  }

  const counselorUserId = await resolveAssignedCounselorUserId(memberId);

  return prisma.messageThread.create({
    data: {
      kind: 'member',
      memberId,
      counselorUserId,
    },
  });
}

export async function assertMemberCanAccessThread(userId: string, threadId: string) {
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, memberId: userId },
  });
  return thread;
}

export async function assertStaffCanAccessThread(staffUserId: string, threadId: string) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      kind: true,
      memberId: true,
      counselorUserId: true,
    },
  });
  if (!thread) return null;

  if (thread.kind === 'employer' || thread.kind === 'partner') {
    return (await isAdmin(staffUserId)) ? thread : null;
  }

  // A cached thread owner is routing metadata, not lasting authorization.
  // Reassignment, counselor deactivation, or an old failed sync must revoke it.

  // Tenant-scoped admin access: super_admin is cross-tenant by design;
  // org admins may only access threads for members in their own org.
  const memberOrgId = thread.memberId
    ? (await prisma.user.findFirst({ where: { id: thread.memberId, deletedAt: null }, select: { organizationId: true } }))?.organizationId ?? null
    : null;
  if (memberOrgId && (await isSuperAdmin(staffUserId))) return thread;
  if (memberOrgId && (await isAdminInOrg(staffUserId, memberOrgId))) return thread;

  if (!thread.memberId || !memberOrgId) return null;

  const assigned = await prisma.counselorAssignment.findFirst({
    where: {
      memberId: thread.memberId, active: true,
      counselor: { userId: staffUserId, active: true, user: { organizationId: memberOrgId, deletedAt: null } },
    },
    select: { id: true },
  });
  if (assigned) return thread;

  return null;
}

export async function assertMemberCanPost(userId: string, threadId: string) {
  return assertMemberCanAccessThread(userId, threadId);
}

export async function assertStaffCanPost(staffUserId: string, threadId: string) {
  return assertStaffCanAccessThread(staffUserId, threadId);
}

export function normalizeMessageBody(raw: string): { ok: true; body: string } | { ok: false; error: string } {
  const body = raw.trim();
  if (!body) return { ok: false, error: 'Message cannot be empty' };
  if (body.length > MAX_BODY) return { ok: false, error: `Message too long (max ${MAX_BODY} characters)` };
  return { ok: true, body };
}

export function serializeMessage(m: ThreadMessageRow) {
  return {
    id: m.id,
    threadId: m.threadId,
    authorId: m.authorId ?? '',
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}
