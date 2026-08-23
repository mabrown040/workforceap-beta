/**
 * Counselor Inbox Zero — today's attention queue.
 *
 * Surfaces assigned members who need counselor action TODAY based on:
 *   - doc_missing: no resume for > DOC_MISSING_DAYS since assignment
 *   - application_stalled: enrollment application pending > APPLICATION_STALLED_DAYS
 *   - at_risk: open AtRiskAlert
 *   - last_contact: no counselor message in > LAST_CONTACT_DAYS
 *
 * Predicates are pure for unit tests; `getInboxZeroQueue()` handles IO.
 * Dismissals for today are read from audit logs (`counselor.inbox_zero.dismiss`).
 */

import { prisma } from '@/lib/db/prisma';
import { COUNSELOR_ROSTER_CAP } from '@/lib/db/queryCaps';

import { resolveAdminEnrolledMemberIds } from '@/lib/counselor/adminMemberScope';

function riskLevelFromScore(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

// ─── Thresholds ─────────────────────────────────────────────────────────────

export const DOC_MISSING_DAYS = 3;
export const APPLICATION_STALLED_DAYS = 5;
export const LAST_CONTACT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const INBOX_ZERO_DISMISS_ACTION = 'counselor.inbox_zero.dismiss';
export const INBOX_ZERO_CONTACTED_ACTION = 'counselor.inbox_zero.contacted';
export const INBOX_ZERO_REASSIGN_ACTION = 'counselor.inbox_zero.reassign';
export const INBOX_ZERO_FOLLOW_UP_ACTION = 'counselor.inbox_zero.follow_up';

// ─── Types ──────────────────────────────────────────────────────────────────

export type InboxZeroFlagType =
  | 'doc_missing'
  | 'application_stalled'
  | 'at_risk'
  | 'last_contact';

export const INBOX_FLAG_LABELS: Record<InboxZeroFlagType, string> = {
  doc_missing: 'Resume missing 3+ days',
  application_stalled: 'Application stalled 5+ days',
  at_risk: 'At-risk alert open',
  last_contact: 'No counselor contact 7+ days',
};

/** Lower rank = higher priority in the sorted queue. */
export const FLAG_PRIORITY_RANK: Record<InboxZeroFlagType, number> = {
  at_risk: 0,
  doc_missing: 1,
  application_stalled: 2,
  last_contact: 3,
};

export type InboxZeroContext = {
  daysSinceAssignment?: number;
  daysSinceApplication?: number;
  daysSinceLastContact?: number;
  atRiskScore?: number;
  atRiskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
};

export type InboxZeroRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  enrolledProgram: string | null;
  primaryFlag: InboxZeroFlagType;
  additionalFlags: InboxZeroFlagType[];
  priorityRank: number;
  severity: number;
  context: InboxZeroContext;
};

export type InboxZeroQueue = {
  rows: InboxZeroRow[];
  totals: {
    total: number;
    dismissedToday: number;
    byFlag: Record<InboxZeroFlagType, number>;
  };
};

// ─── Pure predicates ──────────────────────────────────────────────────────────

export function isDocMissing(
  hasResume: boolean,
  assignedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (hasResume) return false;
  if (!assignedAt) return false;
  const ageMs = now.getTime() - assignedAt.getTime();
  return ageMs > DOC_MISSING_DAYS * DAY_MS;
}

export function isApplicationStalled(
  applicationSubmittedOrCreatedAt: Date | null,
  applicationStatus: string | null,
  now: Date = new Date(),
): boolean {
  if (!applicationSubmittedOrCreatedAt) return false;
  const stalledStatuses = new Set(['PENDING', 'NEEDS_INFO']);
  if (!applicationStatus || !stalledStatuses.has(applicationStatus)) return false;
  const ageMs = now.getTime() - applicationSubmittedOrCreatedAt.getTime();
  return ageMs > APPLICATION_STALLED_DAYS * DAY_MS;
}

export function isAtRiskFlag(openAlertScore: number | null): boolean {
  return openAlertScore !== null;
}

export function isLastContactOverdue(
  lastCounselorMessageAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!lastCounselorMessageAt) return true;
  const ageMs = now.getTime() - lastCounselorMessageAt.getTime();
  return ageMs > LAST_CONTACT_DAYS * DAY_MS;
}

export function pickPrimaryInboxFlag(
  flags: InboxZeroFlagType[],
): { primary: InboxZeroFlagType; additional: InboxZeroFlagType[] } | null {
  if (flags.length === 0) return null;
  const sorted = [...flags].sort(
    (a, b) => FLAG_PRIORITY_RANK[a] - FLAG_PRIORITY_RANK[b],
  );
  return { primary: sorted[0], additional: sorted.slice(1) };
}

export function inboxRowSeverity(
  primaryFlag: InboxZeroFlagType,
  context: InboxZeroContext,
): number {
  switch (primaryFlag) {
    case 'at_risk':
      return context.atRiskScore ?? 0;
    case 'doc_missing':
      return context.daysSinceAssignment ?? DOC_MISSING_DAYS;
    case 'application_stalled':
      return context.daysSinceApplication ?? APPLICATION_STALLED_DAYS;
    case 'last_contact':
      return context.daysSinceLastContact ?? LAST_CONTACT_DAYS;
    default:
      return 0;
  }
}

export function sortInboxRows(rows: InboxZeroRow[]): InboxZeroRow[] {
  return [...rows].sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.memberName.localeCompare(b.memberName);
  });
}

function startOfLocalDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

// ─── Database composition ───────────────────────────────────────────────────

async function resolveMemberIds(
  counselorUserId: string,
  options?: { isAdmin?: boolean; adminMemberCap?: number },
): Promise<string[]> {
  const adminCap = options?.adminMemberCap ?? 200;

  if (options?.isAdmin) {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: counselorUserId, active: true },
      select: { id: true },
    });
    if (counselor) {
      const assignments = await prisma.counselorAssignment.findMany({
        take: COUNSELOR_ROSTER_CAP,
        where: { counselorId: counselor.id, active: true },
        select: { memberId: true },
      });
      return assignments.map((a) => a.memberId);
    }
    return resolveAdminEnrolledMemberIds(counselorUserId, adminCap);
  }

  const counselor = await prisma.counselor.findFirst({
    where: { userId: counselorUserId, active: true },
    select: { id: true },
  });
  if (!counselor) return [];
  const assignments = await prisma.counselorAssignment.findMany({
    take: COUNSELOR_ROSTER_CAP,
    where: { counselorId: counselor.id, active: true },
    select: { memberId: true },
  });
  return assignments.map((a) => a.memberId);
}

async function getHandledMemberIdsToday(
  counselorUserId: string,
  actions: string[],
  now: Date,
): Promise<Set<string>> {
  const handled = new Set<string>();
  const dayStart = startOfLocalDay(now);
  const logs = await prisma.auditLog.findMany({
    where: {
      actorUserId: counselorUserId,
      action: { in: actions },
      createdAt: { gte: dayStart },
    },
    select: { metadata: true },
  });
  for (const log of logs) {
    const meta = log.metadata as { memberId?: string } | null;
    if (meta?.memberId) handled.add(meta.memberId);
  }
  return handled;
}

async function getDismissedMemberIdsToday(
  counselorUserId: string,
  now: Date,
): Promise<Set<string>> {
  return getHandledMemberIdsToday(counselorUserId, [INBOX_ZERO_DISMISS_ACTION], now);
}

async function getContactedMemberIdsToday(
  counselorUserId: string,
  now: Date,
): Promise<Set<string>> {
  return getHandledMemberIdsToday(counselorUserId, [INBOX_ZERO_CONTACTED_ACTION], now);
}

/**
 * Build today's inbox-zero queue for a counselor (or admin preview).
 */
export async function getInboxZeroQueue(
  counselorUserId: string,
  options?: { isAdmin?: boolean; adminMemberCap?: number },
): Promise<InboxZeroQueue> {
  const now = new Date();
  const memberIds = await resolveMemberIds(counselorUserId, options);
  if (memberIds.length === 0) {
    return emptyInboxQueue();
  }

  const [dismissedToday, contactedToday, assignmentRows, members, applications, atRiskAlerts, lastStaffMsgByThread] =
    await Promise.all([
      getDismissedMemberIdsToday(counselorUserId, now),
      getContactedMemberIdsToday(counselorUserId, now),
      prisma.counselorAssignment.findMany({
        where: { memberId: { in: memberIds }, active: true },
        select: { memberId: true, assignedAt: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.user.findMany({
        take: COUNSELOR_ROSTER_CAP,
        where: { id: { in: memberIds }, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          enrolledProgram: true,
          createdAt: true,
          profile: {
            select: { resumeOriginalPath: true, resumeEnhancedPath: true },
          },
        },
      }),
      prisma.application.findMany({
        where: { userId: { in: memberIds } },
        select: {
          userId: true,
          status: true,
          submittedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.atRiskAlert.findMany({
        where: { userId: { in: memberIds }, status: 'open' },
        select: { userId: true, score: true },
        orderBy: { score: 'desc' },
      }),
      prisma.$queryRawUnsafe<Array<{ member_id: string | null; staff_last_at: Date }>>(
        `SELECT t.member_id, MAX(m.created_at) AS staff_last_at
         FROM messages m
         JOIN message_threads t ON t.id = m.thread_id
         WHERE t.member_id = ANY($1::uuid[])
           AND t.kind = 'member'
           AND m.author_id <> t.member_id
         GROUP BY t.member_id`,
        memberIds,
      ),
    ]);

  const assignedAtByMember = new Map<string, Date>();
  for (const a of assignmentRows) {
    if (!assignedAtByMember.has(a.memberId)) {
      assignedAtByMember.set(a.memberId, a.assignedAt);
    }
  }

  const applicationByUser = new Map<
    string,
    { status: string; submittedAt: Date | null; createdAt: Date }
  >();
  for (const app of applications) {
    if (!applicationByUser.has(app.userId)) {
      applicationByUser.set(app.userId, {
        status: app.status,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
      });
    }
  }

  const atRiskByUser = new Map<string, number>();
  for (const alert of atRiskAlerts) {
    if (!atRiskByUser.has(alert.userId)) {
      atRiskByUser.set(alert.userId, alert.score);
    }
  }

  const lastCounselorMsgByMember = new Map<string, Date>();
  for (const r of lastStaffMsgByThread) {
    if (!r.member_id || !r.staff_last_at) continue;
    lastCounselorMsgByMember.set(r.member_id, r.staff_last_at);
  }

  const rows: InboxZeroRow[] = [];

  for (const m of members) {
    if (dismissedToday.has(m.id) || contactedToday.has(m.id)) continue;

    const flags: InboxZeroFlagType[] = [];
    const context: InboxZeroContext = {};

    const hasResume = Boolean(
      m.profile?.resumeOriginalPath || m.profile?.resumeEnhancedPath,
    );
    const assignedAt = assignedAtByMember.get(m.id) ?? m.createdAt;
    if (isDocMissing(hasResume, assignedAt, now)) {
      flags.push('doc_missing');
      context.daysSinceAssignment = Math.floor(
        (now.getTime() - assignedAt.getTime()) / DAY_MS,
      );
    }

    const app = applicationByUser.get(m.id);
    const appAnchor = app?.submittedAt ?? app?.createdAt ?? null;
    if (isApplicationStalled(appAnchor, app?.status ?? null, now)) {
      flags.push('application_stalled');
      context.daysSinceApplication = Math.floor(
        (now.getTime() - (appAnchor as Date).getTime()) / DAY_MS,
      );
    }

    const riskScore = atRiskByUser.get(m.id) ?? null;
    if (isAtRiskFlag(riskScore)) {
      flags.push('at_risk');
      context.atRiskScore = riskScore ?? undefined;
      context.atRiskLevel = riskLevelFromScore(riskScore ?? 0);
    }

    const lastContact = lastCounselorMsgByMember.get(m.id) ?? null;
    if (isLastContactOverdue(lastContact, now)) {
      flags.push('last_contact');
      context.daysSinceLastContact = lastContact
        ? Math.floor((now.getTime() - lastContact.getTime()) / DAY_MS)
        : LAST_CONTACT_DAYS + 1;
    }

    const picked = pickPrimaryInboxFlag(flags);
    if (!picked) continue;

    const severity = inboxRowSeverity(picked.primary, context);
    rows.push({
      memberId: m.id,
      memberName: m.fullName ?? m.email,
      memberEmail: m.email,
      enrolledProgram: m.enrolledProgram,
      primaryFlag: picked.primary,
      additionalFlags: picked.additional,
      priorityRank: FLAG_PRIORITY_RANK[picked.primary],
      severity,
      context,
    });
  }

  const sorted = sortInboxRows(rows);
  const byFlag: Record<InboxZeroFlagType, number> = {
    doc_missing: 0,
    application_stalled: 0,
    at_risk: 0,
    last_contact: 0,
  };
  for (const r of sorted) {
    byFlag[r.primaryFlag] += 1;
    for (const f of r.additionalFlags) byFlag[f] += 1;
  }

  return {
    rows: sorted,
    totals: {
      total: sorted.length,
      dismissedToday: dismissedToday.size,
      byFlag,
    },
  };
}

function emptyInboxQueue(): InboxZeroQueue {
  return {
    rows: [],
    totals: {
      total: 0,
      dismissedToday: 0,
      byFlag: {
        doc_missing: 0,
        application_stalled: 0,
        at_risk: 0,
        last_contact: 0,
      },
    },
  };
}
