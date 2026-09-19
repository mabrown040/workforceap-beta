import { describe, expect, it } from 'vitest';

import {
  buildProvisioningCsv,
  deriveCourseraProvisioningState,
  PROVISIONING_STATE_LABELS,
  PROVISIONING_STATES,
  summarizeProvisioningStates,
  type CourseraProvisioningSignals,
  type CourseraProvisioningState,
} from '@/lib/coursera/provisioningState';

const NOW = new Date('2026-09-19T12:00:00Z');
const DAYS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAYS);

function signals(overrides: Partial<CourseraProvisioningSignals> = {}): CourseraProvisioningSignals {
  return {
    approved: false,
    programCompleted: false,
    invitedAt: null,
    membershipCreatedAt: null,
    courseEnrolledAuditAt: null,
    courseraEnrollmentAt: null,
    linkedCourseraRows: 0,
    unmatchedCourseraRows: 0,
    courseProgressRows: 0,
    xapiStatements: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

describe('deriveCourseraProvisioningState', () => {
  it('reports not_approved when nothing has happened and the seat is not approved', () => {
    const result = deriveCourseraProvisioningState(signals(), NOW);
    expect(result.state).toBe('not_approved');
    expect(result.needsAttention).toBe(false);
  });

  it('reports not_provisioned when approved but no invite, enrollment or activity exists', () => {
    const result = deriveCourseraProvisioningState(signals({ approved: true }), NOW);
    expect(result.state).toBe('not_provisioned');
    expect(result.needsAttention).toBe(true);
  });

  it('reports invited once a Coursera invite was sent and nothing later happened', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: true, invitedAt: daysAgo(3) }),
      NOW,
    );
    expect(result.state).toBe('invited');
    expect(result.invitedDaysAgo).toBe(3);
  });

  it('treats an invite older than 14 days with no acceptance as needing attention', () => {
    const fresh = deriveCourseraProvisioningState(signals({ approved: true, invitedAt: daysAgo(2) }), NOW);
    const old = deriveCourseraProvisioningState(signals({ approved: true, invitedAt: daysAgo(20) }), NOW);
    expect(fresh.needsAttention).toBe(false);
    expect(old.needsAttention).toBe(true);
  });

  it('reports enrolled_not_started when Coursera shows an enrollment but no learning activity yet', () => {
    const viaAudit = deriveCourseraProvisioningState(
      signals({ approved: true, invitedAt: daysAgo(10), courseEnrolledAuditAt: daysAgo(4) }),
      NOW,
    );
    const viaB4B = deriveCourseraProvisioningState(
      signals({ approved: true, linkedCourseraRows: 2, courseraEnrollmentAt: daysAgo(4) }),
      NOW,
    );
    expect(viaAudit.state).toBe('enrolled_not_started');
    expect(viaB4B.state).toBe('enrolled_not_started');
    expect(viaB4B.enrolledAt?.toISOString()).toBe(daysAgo(4).toISOString());
  });

  it('reports active when linked activity happened in the last 30 days', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: true, courseProgressRows: 3, lastActivityAt: daysAgo(5) }),
      NOW,
    );
    expect(result.state).toBe('active');
    expect(result.needsAttention).toBe(false);
  });

  it('reports stalled when the last linked activity is older than 30 days', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: true, xapiStatements: 12, lastActivityAt: daysAgo(45) }),
      NOW,
    );
    expect(result.state).toBe('stalled');
    expect(result.needsAttention).toBe(true);
  });

  it('shows activity even when the seat was never approved in the portal (hand-added learner)', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: false, linkedCourseraRows: 1, lastActivityAt: daysAgo(1) }),
      NOW,
    );
    expect(result.state).toBe('active');
    expect(result.approvalMismatch).toBe(true);
  });

  it('reports unmatched when Coursera rows exist under the member email but are not linked to the account', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: true, unmatchedCourseraRows: 4 }),
      NOW,
    );
    expect(result.state).toBe('unmatched');
    expect(result.needsAttention).toBe(true);
  });

  it('keeps the linked state but flags hasUnmatchedRows when both linked and unlinked rows exist', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: true, courseProgressRows: 1, lastActivityAt: daysAgo(2), unmatchedCourseraRows: 1 }),
      NOW,
    );
    expect(result.state).toBe('active');
    expect(result.hasUnmatchedRows).toBe(true);
    expect(result.needsAttention).toBe(true);
  });

  it('completed wins over every other signal', () => {
    const result = deriveCourseraProvisioningState(
      signals({ approved: false, programCompleted: true, unmatchedCourseraRows: 2, lastActivityAt: daysAgo(90) }),
      NOW,
    );
    expect(result.state).toBe('completed');
    expect(result.needsAttention).toBe(false);
  });

  it('prefers the Coursera-reported enrollment time over the portal audit timestamp', () => {
    const result = deriveCourseraProvisioningState(
      signals({
        approved: true,
        courseEnrolledAuditAt: daysAgo(2),
        courseraEnrollmentAt: daysAgo(6),
        linkedCourseraRows: 1,
      }),
      NOW,
    );
    expect(result.enrolledAt?.toISOString()).toBe(daysAgo(6).toISOString());
  });

  it('has a label for every state, in queue order', () => {
    for (const state of PROVISIONING_STATES) {
      expect(PROVISIONING_STATE_LABELS[state]).toBeTruthy();
    }
    expect(PROVISIONING_STATES[0]).toBe('not_provisioned');
    expect(PROVISIONING_STATES[PROVISIONING_STATES.length - 1]).toBe('not_approved');
  });
});

describe('summarizeProvisioningStates', () => {
  it('counts rows per state and the attention total', () => {
    const rows = [
      { state: 'active' as CourseraProvisioningState, needsAttention: false },
      { state: 'invited' as CourseraProvisioningState, needsAttention: true },
      { state: 'invited' as CourseraProvisioningState, needsAttention: false },
      { state: 'unmatched' as CourseraProvisioningState, needsAttention: true },
    ];
    const summary = summarizeProvisioningStates(rows);
    expect(summary.total).toBe(4);
    expect(summary.byState.invited).toBe(2);
    expect(summary.byState.active).toBe(1);
    expect(summary.byState.unmatched).toBe(1);
    expect(summary.byState.completed).toBe(0);
    expect(summary.needsAttention).toBe(2);
  });
});

describe('buildProvisioningCsv', () => {
  it('emits one header row plus one line per member with escaped values', () => {
    const csv = buildProvisioningCsv([
      {
        memberId: 'm1',
        memberName: 'Ada "Countess" Lovelace',
        memberEmail: 'ada@example.org',
        programSlug: 'it-support',
        programTitle: 'IT Support, Google',
        approved: true,
        approvedAt: '2026-09-01T00:00:00.000Z',
        state: 'invited',
        needsAttention: true,
        approvalMismatch: false,
        hasUnmatchedRows: false,
        invitedAt: '2026-09-02T00:00:00.000Z',
        enrolledAt: null,
        lastActivityAt: null,
        linkedCourseraRows: 0,
        unmatchedCourseraRows: 0,
        courseProgressRows: 0,
        xapiStatements: 0,
      },
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Coursera state');
    expect(lines[1]).toContain('"Ada ""Countess"" Lovelace"');
    expect(lines[1]).toContain('"IT Support, Google"');
    expect(lines[1]).toContain('Invited');
    expect(lines[1]).toContain('2026-09-02');
  });
});
