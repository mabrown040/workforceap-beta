// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ referrals: vi.fn(), logs: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partnerReferral: { findMany: db.referrals },
    partnerOutreachLog: { findMany: db.logs },
  },
}));

import { buildPartnerAttentionQueue } from '@/lib/partner/attentionQueue';

const programSlug = 'it-support-professional-certificate-ibm';
const now = new Date('2026-09-09T12:00:00Z');
function referral(id: string, overrides: Record<string, unknown> = {}) {
  return {
    memberId: id,
    assignedPartnerUserId: null,
    assignedPartnerUser: null,
    member: {
      id, fullName: `Synthetic ${id}`, enrolledProgram: programSlug,
      courseEnrollments: [{ programSlug, curriculumVersion: 'legacy-v1', isPrimary: true }],
      enrolledAt: new Date('2026-07-01'), updatedAt: new Date('2026-08-01'),
      deletedAt: null, assessmentCompleted: true, courseraEnrollmentApproved: true,
      placementRecord: null, userCertifications: [], applications: [], memberProgramProgress: [],
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db.logs.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('partner follow-up eligibility', () => {
  it('retains a quiet learner after the first course and preserves an immutable assignment over a stale program pointer', async () => {
    db.referrals.mockResolvedValue([
      referral('active', {
        enrolledProgram: 'stale-program-pointer',
        memberProgramProgress: [{ programSlug, averagePercent: 10, coursesCompleted: 1 }],
      }),
    ]);
    const rows = await buildPartnerAttentionQueue('partner-1', 'org-1');
    expect(rows).toEqual([expect.objectContaining({
      memberId: 'active', stage: 'in_training', stageLabel: 'In Training', riskTier: 'high',
      nextBestAction: expect.stringContaining('latest course progress'),
    })]);
  });

  it('distinguishes approval pending from approved pre-training enrollment without inventing funding approval', async () => {
    db.referrals.mockResolvedValue([
      referral('pending', { courseraEnrollmentApproved: false }),
      referral('approved'),
    ]);
    const rows = await buildPartnerAttentionQueue('partner-1', 'org-1');
    expect(rows.find(row => row.memberId === 'pending')).toMatchObject({
      stage: 'approval_pending', stageLabel: 'Training approval pending',
      nextBestAction: expect.stringContaining('confirm enrollment approval and any funding steps'),
    });
    expect(rows.find(row => row.memberId === 'approved')).toMatchObject({
      stage: 'enrolled', nextBestAction: expect.stringContaining('Confirm they can open'),
    });
    expect(JSON.stringify(rows)).not.toMatch(/funding approved|fully funded/i);
  });

  it('does not hide observed training merely because a legacy approval flag is absent', async () => {
    db.referrals.mockResolvedValue([referral('legacy-active', {
      courseraEnrollmentApproved: false,
      memberProgramProgress: [{ programSlug, averagePercent: 20, coursesCompleted: 2 }],
    })]);
    expect(await buildPartnerAttentionQueue('partner-1', 'org-1')).toEqual([
      expect.objectContaining({ stage: 'in_training' }),
    ]);
  });

  it('keeps applicants and excludes closed, placed and certified members from this pre-placement queue', async () => {
    db.referrals.mockResolvedValue([
      referral('applicant', { enrolledProgram: null, courseEnrollments: [], enrolledAt: null }),
      referral('closed', { deletedAt: now }),
      referral('placed', { placementRecord: { employerName: 'Synthetic', jobTitle: 'Support', placedAt: now } }),
      referral('certified', { userCertifications: [{ certName: 'Recorded certificate', earnedAt: now }] }),
    ]);
    expect((await buildPartnerAttentionQueue('partner-1', 'org-1')).map(row => row.memberId)).toEqual(['applicant']);
  });

  it('applies the active partner, same-tenant member and real-member predicates before reading referrals', async () => {
    db.referrals.mockResolvedValue([]);
    expect(await buildPartnerAttentionQueue('partner-1', 'org-1')).toEqual([]);
    expect(db.referrals).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        partnerId: 'partner-1', partner: { organizationId: 'org-1', active: true },
        member: expect.objectContaining({ organizationId: 'org-1', deletedAt: null, profile: { role: 'member' } }),
      },
    }));
    expect(db.logs).not.toHaveBeenCalled();
  });
});
