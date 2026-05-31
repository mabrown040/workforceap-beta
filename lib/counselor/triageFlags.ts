/**
 * Counselor Triage Queue
 *
 * Promotes the counselor surface from "inbox of overdue replies" to "live triage
 * queue that catches members before they drop." Built on signals already in the
 * schema:
 *
 *   - MemberEvent activity timeline → no_activity_10d / sla_breach
 *   - latest member→counselor message vs counselor reply → SLA flags
 *   - User.staleTrainingDetectedAt (cron-set) → stale_training
 *   - User.needsComputerSupportFollowUp (career-quiz signal) → computer_support_followup
 *   - MemberEvent course_completed / certification_earned → milestone_reached
 *
 * Design discipline:
 *   - The predicates below are PURE FUNCTIONS so they can be unit-tested
 *     without the database. `getTriageQueue()` does the IO; the predicates
 *     do the logic.
 *   - A member who matches multiple flags is shown once at their HIGHEST
 *     priority (red > yellow > blue), with the additional flags listed in
 *     `additionalFlags` so the counselor can see the full picture without
 *     duplicate rows.
 *   - Thresholds (10 days inactive, 48h/24h SLA, 14d stale window, 7d
 *     milestone window) are exported as named constants so they're greppable
 *     and adjustable in one place.
 */

import { prisma } from '@/lib/db/prisma';
import { resolveAdminEnrolledMemberIds } from '@/lib/counselor/adminMemberScope';

// ─── Thresholds (single source of truth) ────────────────────────────────────

export const NO_ACTIVITY_DAYS = 10;
export const SLA_BREACH_HOURS = 48;
export const SLA_WARNING_HOURS = 24;
export const STALE_TRAINING_WINDOW_DAYS = 14;
export const MILESTONE_WINDOW_DAYS = 7;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ─── Types ──────────────────────────────────────────────────────────────────

export type TriagePriority = 'red' | 'yellow' | 'blue';

export type TriageFlagType =
  | 'no_activity_10d'
  | 'sla_breach_48h'
  | 'sla_warning_24h'
  | 'stale_training'
  | 'computer_support_followup'
  | 'milestone_reached';

export const FLAG_LABELS: Record<TriageFlagType, string> = {
  no_activity_10d: 'No activity 10+ days',
  sla_breach_48h: 'Counselor reply overdue (48h+)',
  sla_warning_24h: 'Counselor reply overdue (24h+)',
  stale_training: 'Training stalled',
  computer_support_followup: 'Needs computer support follow-up',
  milestone_reached: 'Recent milestone — celebrate',
};

export const FLAG_PRIORITY: Record<TriageFlagType, TriagePriority> = {
  no_activity_10d: 'red',
  sla_breach_48h: 'red',
  sla_warning_24h: 'yellow',
  stale_training: 'yellow',
  computer_support_followup: 'yellow',
  milestone_reached: 'blue',
};

const PRIORITY_RANK: Record<TriagePriority, number> = { red: 0, yellow: 1, blue: 2 };

export type TriageContext = {
  daysInactive?: number;
  hoursWaiting?: number;
  threadId?: string;
  lastMessagePreview?: string;
  staleSince?: Date;
  milestoneEventName?: string;
  milestoneAt?: Date;
};

export type TriageRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  enrolledProgram: string | null;
  primaryFlag: TriageFlagType;
  primaryPriority: TriagePriority;
  additionalFlags: TriageFlagType[];
  context: TriageContext;
};

export type TriageQueue = {
  red: TriageRow[];
  yellow: TriageRow[];
  blue: TriageRow[];
  totals: {
    red: number;
    yellow: number;
    blue: number;
    total: number;
    byFlag: Record<TriageFlagType, number>;
  };
};

// ─── Pure predicates (testable without DB) ──────────────────────────────────

/**
 * True when a member is enrolled but their last activity event was more than
 * NO_ACTIVITY_DAYS ago. A member who has never logged any event also qualifies
 * (`lastEventAt = null`) — we treat "never logged in" as the strongest signal.
 */
export function isInactive(
  lastEventAt: Date | null,
  isEnrolled: boolean,
  now: Date = new Date(),
): boolean {
  if (!isEnrolled) return false;
  if (!lastEventAt) return true;
  const ageMs = now.getTime() - lastEventAt.getTime();
  return ageMs > NO_ACTIVITY_DAYS * DAY_MS;
}

/**
 * Counselor SLA priority based on how long a member's last unanswered
 * message has been waiting. Returns `null` when the latest message is from
 * the counselor (or there is no member-authored last message).
 */
export function slaPriority(
  lastMessageFromMemberAt: Date | null,
  now: Date = new Date(),
): 'red' | 'yellow' | null {
  if (!lastMessageFromMemberAt) return null;
  const ageMs = now.getTime() - lastMessageFromMemberAt.getTime();
  if (ageMs >= SLA_BREACH_HOURS * HOUR_MS) return 'red';
  if (ageMs >= SLA_WARNING_HOURS * HOUR_MS) return 'yellow';
  return null;
}

/**
 * True if the stale-training cron flagged this member within the last
 * STALE_TRAINING_WINDOW_DAYS days. Older flags are assumed addressed or
 * superseded by other signals.
 */
export function isStaleTraining(
  staleTrainingDetectedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!staleTrainingDetectedAt) return false;
  const ageMs = now.getTime() - staleTrainingDetectedAt.getTime();
  return ageMs >= 0 && ageMs <= STALE_TRAINING_WINDOW_DAYS * DAY_MS;
}

/**
 * True when the career quiz flagged a computer-support need and no
 * follow-up has been recorded since. We use the absence of a follow-up
 * MemberEvent as the resolution signal so a counselor's recorded action
 * naturally drops the row from the queue.
 */
export function needsComputerSupportFollowUp(
  needsFollowUp: boolean,
  lastFollowUpEventAt: Date | null,
): boolean {
  if (!needsFollowUp) return false;
  return lastFollowUpEventAt === null;
}

/**
 * True when the member completed a course or earned a certification in the
 * last MILESTONE_WINDOW_DAYS, AND the counselor has not messaged them since
 * the milestone (or has never messaged). Drives a celebratory blue nudge.
 */
export function isMilestoneRecent(
  milestoneAt: Date | null,
  lastCounselorMessageAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!milestoneAt) return false;
  const ageMs = now.getTime() - milestoneAt.getTime();
  if (ageMs < 0 || ageMs > MILESTONE_WINDOW_DAYS * DAY_MS) return false;
  if (!lastCounselorMessageAt) return true;
  return lastCounselorMessageAt.getTime() < milestoneAt.getTime();
}

/**
 * Given the set of flags a member matches, pick the primary (highest
 * priority) flag. Ordering within a priority is by the order flags are
 * passed in — caller controls tie-breaking by sorting before calling.
 */
export function pickPrimaryFlag(
  flags: TriageFlagType[],
): { primary: TriageFlagType; priority: TriagePriority; additional: TriageFlagType[] } | null {
  if (flags.length === 0) return null;
  const sorted = [...flags].sort(
    (a, b) => PRIORITY_RANK[FLAG_PRIORITY[a]] - PRIORITY_RANK[FLAG_PRIORITY[b]],
  );
  const primary = sorted[0];
  return {
    primary,
    priority: FLAG_PRIORITY[primary],
    additional: sorted.slice(1),
  };
}

// ─── Database composition ───────────────────────────────────────────────────

type MemberLite = {
  id: string;
  fullName: string | null;
  email: string;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  staleTrainingDetectedAt: Date | null;
  needsComputerSupportFollowUp: boolean;
};

/**
 * Build the unified triage queue for a counselor (or an admin viewing the
 * surface as a force-multiplier).
 *
 * Scope:
 *   - For counselors: members in their active assignments.
 *   - For admins (no Counselor row): all enrolled members in the org, capped
 *     at `adminMemberCap` to avoid runaway queries.
 */
export async function getTriageQueue(
  counselorUserId: string,
  options?: { isAdmin?: boolean; adminMemberCap?: number },
): Promise<TriageQueue> {
  const now = new Date();
  const adminCap = options?.adminMemberCap ?? 200;

  // Resolve scope: which member ids does this user own?
  let memberIds: string[] = [];
  if (options?.isAdmin) {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: counselorUserId, active: true },
      select: { id: true },
    });
    if (counselor) {
      const assignments = await prisma.counselorAssignment.findMany({
        take: 5000,
        where: { counselorId: counselor.id, active: true },
        select: { memberId: true },
      });
      memberIds = assignments.map((a) => a.memberId);
    } else {
      memberIds = await resolveAdminEnrolledMemberIds(counselorUserId, adminCap);
    }
  } else {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: counselorUserId, active: true },
      select: { id: true },
    });
    if (!counselor) return emptyQueue();
    const assignments = await prisma.counselorAssignment.findMany({
      take: 5000,
      where: { counselorId: counselor.id, active: true },
      select: { memberId: true },
    });
    memberIds = assignments.map((a) => a.memberId);
  }
  if (memberIds.length === 0) return emptyQueue();

  // Fetch all the inputs in parallel.
  const milestoneCutoff = new Date(now.getTime() - MILESTONE_WINDOW_DAYS * DAY_MS);

  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  const [members, lastEventByUser, threads, lastStaffMsgByThread, computerFollowUpEvents, milestoneEvents] = await Promise.all([
    prisma.user.findMany({
      take: 5000,
      where: { id: { in: memberIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        enrolledAt: true,
        staleTrainingDetectedAt: true,
        needsComputerSupportFollowUp: true,
      },
    }),
    prisma.$queryRawUnsafe<Array<{ user_id: string; last_at: Date }>>(
      `SELECT user_id, MAX(created_at) AS last_at
       FROM member_events
       WHERE user_id = ANY($1::uuid[])
       GROUP BY user_id`,
      memberIds,
    ),
    prisma.messageThread.findMany({
      take: 500,
      where: { memberId: { in: memberIds }, kind: 'member' },
      select: {
        id: true,
        memberId: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, authorId: true, body: true, createdAt: true },
        },
      },
    }),
    // Most recent staff-authored (non-member) message per thread.
    //
    // We can't derive this from `messages[0]` above because if the member's
    // reply is the latest entry in the thread, the latest counselor reply
    // before it gets dropped — and the milestone flag would re-fire even
    // after the counselor already congratulated them.
    prisma.$queryRawUnsafe<Array<{ thread_id: string; member_id: string | null; staff_last_at: Date }>>(
      `SELECT t.id AS thread_id, t.member_id, MAX(m.created_at) AS staff_last_at
       FROM messages m
       JOIN message_threads t ON t.id = m.thread_id
       WHERE t.member_id = ANY($1::uuid[])
         AND t.kind = 'member'
         AND m.author_id <> t.member_id
       GROUP BY t.id, t.member_id`,
      memberIds,
    ),
    prisma.memberEvent.findMany({
      take: 5000,
      where: {
        userId: { in: memberIds },
        eventName: { in: ['computer_support_followup_recorded', 'counselor_followup_recorded'] },
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.memberEvent.findMany({
      take: 5000,
      where: {
        userId: { in: memberIds },
        eventName: { in: ['course_completed', 'certification_earned'] },
        createdAt: { gte: milestoneCutoff },
      },
      orderBy: { createdAt: 'desc' },
      select: { userId: true, eventName: true, createdAt: true },
    }),
  ]);

  const memberById = new Map<string, MemberLite>(members.map((m) => [m.id, m]));
  const lastEventMap = new Map<string, Date>();
  for (const r of lastEventByUser) {
    if (r.last_at) lastEventMap.set(r.user_id, r.last_at);
  }

  // Member's most recent unreplied message (used by the SLA flags). We only
  // care when the LATEST message is from the member — that's the definition
  // of an unanswered reply.
  const memberSlaContext = new Map<
    string,
    { threadId: string; lastMessageAt: Date; lastMessagePreview: string }
  >();
  for (const t of threads) {
    if (!t.memberId) continue;
    const last = t.messages[0];
    if (!last) continue;
    if (last.authorId === t.memberId) {
      memberSlaContext.set(t.memberId, {
        threadId: t.id,
        lastMessageAt: last.createdAt,
        lastMessagePreview: previewBody(last.body),
      });
    }
  }

  // Counselor's most recent message per member (used to clear the milestone
  // flag once the counselor has acknowledged a milestone, even if the member
  // has since replied). Sourced from the staff-authored MAX(created_at)
  // query above so a later "thanks" from the member doesn't re-arm the
  // milestone bucket.
  const lastCounselorMsgByMember = new Map<string, Date>();
  for (const r of lastStaffMsgByThread) {
    if (!r.member_id || !r.staff_last_at) continue;
    lastCounselorMsgByMember.set(r.member_id, r.staff_last_at);
  }

  const lastFollowUpByUser = new Map<string, Date>();
  for (const e of computerFollowUpEvents) {
    const cur = lastFollowUpByUser.get(e.userId);
    if (!cur || e.createdAt > cur) lastFollowUpByUser.set(e.userId, e.createdAt);
  }

  const milestoneByUser = new Map<string, { eventName: string; createdAt: Date }>();
  for (const e of milestoneEvents) {
    const cur = milestoneByUser.get(e.userId);
    if (!cur || e.createdAt > cur.createdAt) {
      milestoneByUser.set(e.userId, { eventName: e.eventName, createdAt: e.createdAt });
    }
  }

  // Compose flags per member.
  const rows: TriageRow[] = [];
  for (const m of members) {
    const flags: TriageFlagType[] = [];
    const context: TriageContext = {};

    const lastEventAt = lastEventMap.get(m.id) ?? null;
    if (isInactive(lastEventAt, m.enrolledProgram !== null, now)) {
      flags.push('no_activity_10d');
      const fallback = lastEventAt ?? m.enrolledAt;
      context.daysInactive = fallback
        ? Math.max(NO_ACTIVITY_DAYS, Math.floor((now.getTime() - fallback.getTime()) / DAY_MS))
        : NO_ACTIVITY_DAYS;
    }

    const sla = memberSlaContext.get(m.id);
    if (sla) {
      const pri = slaPriority(sla.lastMessageAt, now);
      if (pri === 'red') flags.push('sla_breach_48h');
      else if (pri === 'yellow') flags.push('sla_warning_24h');
      if (pri) {
        context.threadId = sla.threadId;
        context.lastMessagePreview = sla.lastMessagePreview;
        context.hoursWaiting = Math.max(
          0,
          Math.round((now.getTime() - sla.lastMessageAt.getTime()) / HOUR_MS),
        );
      }
    }

    if (isStaleTraining(m.staleTrainingDetectedAt, now)) {
      flags.push('stale_training');
      context.staleSince = m.staleTrainingDetectedAt ?? undefined;
    }

    if (needsComputerSupportFollowUp(
      m.needsComputerSupportFollowUp,
      lastFollowUpByUser.get(m.id) ?? null,
    )) {
      flags.push('computer_support_followup');
    }

    const milestone = milestoneByUser.get(m.id) ?? null;
    if (
      isMilestoneRecent(
        milestone?.createdAt ?? null,
        lastCounselorMsgByMember.get(m.id) ?? null,
        now,
      )
    ) {
      flags.push('milestone_reached');
      if (milestone) {
        context.milestoneEventName = milestone.eventName;
        context.milestoneAt = milestone.createdAt;
      }
    }

    const picked = pickPrimaryFlag(flags);
    if (!picked) continue;

    rows.push({
      memberId: m.id,
      memberName: m.fullName ?? m.email,
      memberEmail: m.email,
      enrolledProgram: m.enrolledProgram,
      primaryFlag: picked.primary,
      primaryPriority: picked.priority,
      additionalFlags: picked.additional,
      context,
    });
  }

  // Bucket and sort each bucket so the most pressing item is first.
  const red = rows
    .filter((r) => r.primaryPriority === 'red')
    .sort((a, b) => triageRowSeverity(b) - triageRowSeverity(a));
  const yellow = rows
    .filter((r) => r.primaryPriority === 'yellow')
    .sort((a, b) => triageRowSeverity(b) - triageRowSeverity(a));
  const blue = rows
    .filter((r) => r.primaryPriority === 'blue')
    .sort((a, b) => (b.context.milestoneAt?.getTime() ?? 0) - (a.context.milestoneAt?.getTime() ?? 0));

  const byFlag: Record<TriageFlagType, number> = {
    no_activity_10d: 0,
    sla_breach_48h: 0,
    sla_warning_24h: 0,
    stale_training: 0,
    computer_support_followup: 0,
    milestone_reached: 0,
  };
  for (const r of rows) {
    byFlag[r.primaryFlag] += 1;
    for (const f of r.additionalFlags) byFlag[f] += 1;
  }

  // Discard the fetched member context that we don't end up using to keep
  // memory tight when an admin is viewing the cohort-wide queue.
  void memberById;

  return {
    red,
    yellow,
    blue,
    totals: {
      red: red.length,
      yellow: yellow.length,
      blue: blue.length,
      total: rows.length,
      byFlag,
    },
  };
}

function emptyQueue(): TriageQueue {
  return {
    red: [],
    yellow: [],
    blue: [],
    totals: {
      red: 0,
      yellow: 0,
      blue: 0,
      total: 0,
      byFlag: {
        no_activity_10d: 0,
        sla_breach_48h: 0,
        sla_warning_24h: 0,
        stale_training: 0,
        computer_support_followup: 0,
        milestone_reached: 0,
      },
    },
  };
}

function previewBody(body: string | null | undefined, maxLen = 100): string {
  if (!body) return '';
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Internal severity score for sorting within a priority bucket. */
function triageRowSeverity(row: TriageRow): number {
  // Inactivity is scored as days; SLA as hours-waiting / 4 to make the
  // units comparable. Larger = more severe.
  const inactivity = row.context.daysInactive ?? 0;
  const slaWeight = (row.context.hoursWaiting ?? 0) / 4;
  return Math.max(inactivity, slaWeight);
}
