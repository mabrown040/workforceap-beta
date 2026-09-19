/**
 * Pure derivation of a member's Coursera *provisioning* state for the admin
 * provisioning queue (`/admin/coursera/provisioning`).
 *
 * The enrollment command center (`lib/admin/courseraEnrollmentPipeline.ts`)
 * answers "approved / started / stalled / done". This module answers the
 * operational question behind manual Coursera provisioning: for each member
 * with a program, where are they between "nobody has touched Coursera for
 * this person" and "learning on Coursera", and does anyone need to act?
 *
 * Deliberately NOT `server-only`: it takes plain facts so it runs in vitest
 * and in the client table (CSV export) without any database access. The
 * facts come from existing tables only — no new columns, no B4B calls:
 *
 *   - `users.coursera_enrollment_approved`            → `approved`
 *   - `audit_logs.action = coursera_invited`           → `invitedAt`
 *   - `audit_logs.action = coursera_membership_created`→ `membershipCreatedAt`
 *   - `audit_logs.action = coursera_course_enrolled`   → `courseEnrolledAuditAt`
 *   - `coursera_course_progress` linked to the user    → `linkedCourseraRows`,
 *     `courseraEnrollmentAt` (min enrollment_time), activity
 *   - `coursera_course_progress` with user_id NULL but the member's email
 *                                                      → `unmatchedCourseraRows`
 *   - `course_progress`, `xapi_statements` (by email)  → activity signals
 *
 * State precedence (top wins):
 *   completed            program finished (canonical `memberProgramCompleted`)
 *   active               linked activity within the last 30 days
 *   stalled              linked activity exists, but older than 30 days
 *   enrolled_not_started Coursera enrollment exists (B4B row or portal audit)
 *                        with no learning activity yet
 *   unmatched            Coursera rows exist under the member's email but are
 *                        not linked to the account (identity mapping needed)
 *   invited              a Coursera invite was sent; no acceptance evidence
 *   not_provisioned      approved, nothing has happened on Coursera
 *   not_approved         not approved, nothing has happened on Coursera
 *
 * Activity beats the approval flag on purpose: a learner added by hand in
 * Coursera's own console shows up as `active` with `approvalMismatch: true`
 * rather than hiding behind "not approved".
 */

import { buildCsv, csvDate } from '@/lib/csv';

export type CourseraProvisioningState =
  | 'not_provisioned'
  | 'invited'
  | 'unmatched'
  | 'enrolled_not_started'
  | 'stalled'
  | 'active'
  | 'completed'
  | 'not_approved';

/** Queue order: things that need a hand first, finished work last. */
export const PROVISIONING_STATES: readonly CourseraProvisioningState[] = [
  'not_provisioned',
  'invited',
  'unmatched',
  'enrolled_not_started',
  'stalled',
  'active',
  'completed',
  'not_approved',
];

export const PROVISIONING_STATE_LABELS: Record<CourseraProvisioningState, string> = {
  not_provisioned: 'Approved — not provisioned',
  invited: 'Invited',
  unmatched: 'Unmatched Coursera activity',
  enrolled_not_started: 'Enrolled — not started',
  stalled: 'Stalled',
  active: 'Active',
  completed: 'Completed',
  not_approved: 'Not approved',
};

export const PROVISIONING_STATE_HINTS: Record<CourseraProvisioningState, string> = {
  not_provisioned: 'Seat approved in the portal, but no invite, enrollment or activity exists on Coursera yet.',
  invited: 'Coursera sent an invite; no membership, enrollment or activity has been seen since.',
  unmatched: 'Coursera reports progress under this email, but the rows are not linked to the member account.',
  enrolled_not_started: 'Coursera shows an enrollment but no learning activity yet.',
  stalled: 'Linked Coursera activity exists, but nothing in the last 30 days.',
  active: 'Linked Coursera activity in the last 30 days.',
  completed: 'Program complete per the canonical progress rollup.',
  not_approved: 'Not approved for a Coursera seat and nothing has happened on Coursera.',
};

export type CourseraProvisioningSignals = {
  approved: boolean;
  programCompleted: boolean;
  /** Latest `coursera_invited` audit row for this member. */
  invitedAt: Date | null;
  /** Latest `coursera_membership_created` audit row. */
  membershipCreatedAt: Date | null;
  /** Latest `coursera_course_enrolled` audit row (portal-initiated enrollment). */
  courseEnrolledAuditAt: Date | null;
  /** Earliest `coursera_course_progress.enrollment_time` linked to the member. */
  courseraEnrollmentAt: Date | null;
  /** `coursera_course_progress` rows with `user_id` = member. */
  linkedCourseraRows: number;
  /** `coursera_course_progress` rows with `user_id` NULL and the member's email. */
  unmatchedCourseraRows: number;
  /** Merged `course_progress` rows for the member. */
  courseProgressRows: number;
  /** `xapi_statements` whose actor email is the member's email. */
  xapiStatements: number;
  /** Max of every linked activity timestamp (course_progress, B4B rows, xAPI). */
  lastActivityAt: Date | null;
};

export type CourseraProvisioningDerived = {
  state: CourseraProvisioningState;
  /** Someone should look at this row (see `needsAttention` rules below). */
  needsAttention: boolean;
  /** Coursera activity exists although the portal never approved the seat. */
  approvalMismatch: boolean;
  /** Unlinked Coursera rows exist alongside linked activity. */
  hasUnmatchedRows: boolean;
  invitedDaysAgo: number | null;
  /** Coursera-reported enrollment time when known, else the portal audit time. */
  enrolledAt: Date | null;
  lastActivityAt: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_WINDOW_DAYS = 30;
/** An unaccepted invite older than this is worth a nudge. */
export const INVITE_ATTENTION_DAYS = 14;

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

export function deriveCourseraProvisioningState(
  signals: CourseraProvisioningSignals,
  now: Date = new Date(),
): CourseraProvisioningDerived {
  const hasLinkedActivity =
    signals.courseProgressRows > 0 || signals.xapiStatements > 0 || signals.linkedCourseraRows > 0;
  const hasEnrollmentEvidence =
    signals.courseraEnrollmentAt != null ||
    signals.courseEnrolledAuditAt != null ||
    signals.membershipCreatedAt != null ||
    signals.linkedCourseraRows > 0;
  const hasUnmatchedRows = signals.unmatchedCourseraRows > 0;

  const enrolledAt = signals.courseraEnrollmentAt ?? signals.courseEnrolledAuditAt ?? signals.membershipCreatedAt;
  const invitedDaysAgo = signals.invitedAt ? daysBetween(now, signals.invitedAt) : null;
  const activityIsRecent =
    signals.lastActivityAt != null && now.getTime() - signals.lastActivityAt.getTime() <= ACTIVE_WINDOW_DAYS * DAY_MS;

  let state: CourseraProvisioningState;
  if (signals.programCompleted) {
    state = 'completed';
  } else if (hasLinkedActivity && signals.lastActivityAt) {
    state = activityIsRecent ? 'active' : 'stalled';
  } else if (hasEnrollmentEvidence) {
    state = 'enrolled_not_started';
  } else if (hasUnmatchedRows) {
    state = 'unmatched';
  } else if (signals.invitedAt) {
    state = 'invited';
  } else if (signals.approved) {
    state = 'not_provisioned';
  } else {
    state = 'not_approved';
  }

  const approvalMismatch = !signals.approved && state !== 'not_approved' && state !== 'completed';

  let needsAttention: boolean;
  switch (state) {
    case 'not_provisioned':
    case 'unmatched':
    case 'stalled':
      needsAttention = true;
      break;
    case 'invited':
      needsAttention = invitedDaysAgo != null && invitedDaysAgo >= INVITE_ATTENTION_DAYS;
      break;
    case 'enrolled_not_started':
      needsAttention = enrolledAt != null && daysBetween(now, enrolledAt) >= INVITE_ATTENTION_DAYS;
      break;
    default:
      needsAttention = false;
  }
  if (state !== 'completed' && hasUnmatchedRows) needsAttention = true;

  return {
    state,
    needsAttention,
    approvalMismatch,
    hasUnmatchedRows: hasUnmatchedRows && state !== 'unmatched',
    invitedDaysAgo,
    enrolledAt: enrolledAt ?? null,
    lastActivityAt: signals.lastActivityAt,
  };
}

export type ProvisioningSummary = {
  total: number;
  needsAttention: number;
  byState: Record<CourseraProvisioningState, number>;
};

export function summarizeProvisioningStates(
  rows: ReadonlyArray<{ state: CourseraProvisioningState; needsAttention: boolean }>,
): ProvisioningSummary {
  const byState = Object.fromEntries(PROVISIONING_STATES.map((s) => [s, 0])) as Record<
    CourseraProvisioningState,
    number
  >;
  let needsAttention = 0;
  for (const row of rows) {
    byState[row.state] += 1;
    if (row.needsAttention) needsAttention += 1;
  }
  return { total: rows.length, needsAttention, byState };
}

/** Serialisable row shape shared by the server loader, the table and the CSV. */
export type CourseraProvisioningRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  programSlug: string;
  programTitle: string;
  approved: boolean;
  approvedAt: string | null;
  state: CourseraProvisioningState;
  needsAttention: boolean;
  approvalMismatch: boolean;
  hasUnmatchedRows: boolean;
  invitedAt: string | null;
  enrolledAt: string | null;
  lastActivityAt: string | null;
  linkedCourseraRows: number;
  unmatchedCourseraRows: number;
  courseProgressRows: number;
  xapiStatements: number;
};

function isoToCsvDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : csvDate(d);
}

export function buildProvisioningCsv(rows: ReadonlyArray<CourseraProvisioningRow>): string {
  const headers = [
    'Member',
    'Email',
    'Program',
    'Seat approved',
    'Approved on',
    'Coursera state',
    'Needs attention',
    'Approval mismatch',
    'Invited on',
    'Enrolled on Coursera',
    'Last activity',
    'Linked Coursera rows',
    'Unmatched Coursera rows',
    'Portal course rows',
    'xAPI statements',
  ];
  const data = rows.map((row) => [
    row.memberName,
    row.memberEmail,
    row.programTitle,
    row.approved ? 'Yes' : 'No',
    isoToCsvDate(row.approvedAt),
    PROVISIONING_STATE_LABELS[row.state],
    row.needsAttention ? 'Yes' : 'No',
    row.approvalMismatch ? 'Yes' : 'No',
    isoToCsvDate(row.invitedAt),
    isoToCsvDate(row.enrolledAt),
    isoToCsvDate(row.lastActivityAt),
    row.linkedCourseraRows,
    row.unmatchedCourseraRows,
    row.courseProgressRows,
    row.xapiStatements,
  ]);
  return buildCsv(headers, data);
}
