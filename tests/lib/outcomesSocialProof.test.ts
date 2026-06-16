import { describe, expect, it, vi } from 'vitest';
import {
  buildPartnerReferralBadge,
  formatSuppressedRate,
  getOutcomesSocialProof,
  isOutcomesSocialProofEnabled,
} from '@/lib/outcomes/socialProof';

const baseUrl = 'https://www.workforceap.org';

type DbOverrides = {
  enrolled?: number;
  placed?: number;
  storyRows?: Array<{ id: string; jobTitle: string; programSlug: string | null; placedAt: Date }>;
  referralRows?: Array<{ memberId: string }>;
  partnerPlacementRows?: Array<{ userId: string }>;
  activePartners?: number;
};

function makeDb(overrides: DbOverrides = {}) {
  return {
    user: { count: vi.fn().mockResolvedValue(overrides.enrolled ?? 0) },
    placementRecord: {
      count: vi.fn().mockResolvedValue(overrides.placed ?? 0),
      findMany: vi.fn().mockResolvedValueOnce(overrides.partnerPlacementRows ?? []).mockResolvedValueOnce(overrides.storyRows ?? []),
    },
    partnerReferral: { findMany: vi.fn().mockResolvedValue(overrides.referralRows ?? []) },
    partner: { count: vi.fn().mockResolvedValue(overrides.activePartners ?? 0) },
  };
}

describe('outcomes social proof feature flag', () => {
  it('is off by default and only enabled by an explicit true-ish env value', () => {
    expect(isOutcomesSocialProofEnabled({})).toBe(false);
    expect(isOutcomesSocialProofEnabled({ WORKFORCEAP_PUBLIC_OUTCOMES_SOCIAL_PROOF: 'false' })).toBe(false);
    expect(isOutcomesSocialProofEnabled({ WORKFORCEAP_PUBLIC_OUTCOMES_SOCIAL_PROOF: '1' })).toBe(true);
    expect(isOutcomesSocialProofEnabled({ WORKFORCEAP_PUBLIC_OUTCOMES_SOCIAL_PROOF: 'true' })).toBe(true);
  });
});

describe('formatSuppressedRate', () => {
  it('suppresses rates below the methodology threshold while preserving counts', () => {
    expect(formatSuppressedRate(3, 9)).toEqual({ label: '3 of 9', suppressed: true });
    expect(formatSuppressedRate(7, 10)).toEqual({ label: '70%', suppressed: false });
  });
});

describe('getOutcomesSocialProof', () => {
  it('returns no public cards or snapshot when the flag is disabled', async () => {
    const db = makeDb();
    const result = await getOutcomesSocialProof(db as never, { enabled: false, baseUrl });
    expect(result.enabled).toBe(false);
    expect(result.storyCards).toEqual([]);
    expect(result.partnerSnapshot).toBeNull();
    expect(result.badge).toBeNull();
    expect(db.user.count).not.toHaveBeenCalled();
  });

  it('suppresses story cards below the methodology threshold and de-duplicates partner placements', async () => {
    const db = makeDb({
      enrolled: 9,
      placed: 3,
      storyRows: [{ id: 'placement-1', jobTitle: 'Patient Care Technician', programSlug: 'patient-care-technician', placedAt: new Date('2026-05-10T00:00:00Z') }],
      referralRows: [{ memberId: 'member-1' }, { memberId: 'member-1' }, { memberId: 'member-2' }],
      partnerPlacementRows: [{ userId: 'member-1' }],
      activePartners: 4,
    });
    const result = await getOutcomesSocialProof(db as never, { enabled: true, baseUrl });
    expect(result.enabled).toBe(true);
    expect(result.storyCards).toEqual([]);
    expect(result.partnerSnapshot).toMatchObject({ referrals: 2, placements: 1, activePartners: 4, placementRate: { label: '1 of 2', suppressed: true } });
  });

  it('uses only live placement rows for story cards when the cohort is reliable', async () => {
    const db = makeDb({
      enrolled: 10,
      placed: 3,
      storyRows: [{ id: 'placement-1', jobTitle: 'Patient Care Technician', programSlug: 'patient-care-technician', placedAt: new Date('2026-05-10T00:00:00Z') }],
      referralRows: [{ memberId: 'member-1' }, { memberId: 'member-2' }],
      partnerPlacementRows: [{ userId: 'member-1' }],
      activePartners: 1,
    });
    const result = await getOutcomesSocialProof(db as never, { enabled: true, baseUrl });
    expect(result.storyCards).toHaveLength(1);
    expect(result.storyCards[0]).toMatchObject({ jobTitle: 'Patient Care Technician', programSlug: 'patient-care-technician' });
    expect(result.storyCards[0].memberName).toBeUndefined();
    expect(result.storyCards[0].employerName).toBeUndefined();
    expect(result.storyCards[0].salaryOffered).toBeUndefined();
  });

  it('suppresses the whole social-proof bundle when there are no real placements', async () => {
    const db = makeDb({ enrolled: 12, placed: 0, referralRows: [{ memberId: 'member-1' }], partnerPlacementRows: [], activePartners: 1 });
    const result = await getOutcomesSocialProof(db as never, { enabled: true, baseUrl });
    expect(result.storyCards).toEqual([]);
    expect(result.partnerSnapshot).toBeNull();
  });

  it('does not build a badge through the bundle while the flag is disabled', async () => {
    const result = await getOutcomesSocialProof(makeDb() as never, {
      enabled: false,
      baseUrl,
      referralCode: 'austin-partner',
      partnerName: 'Austin Workforce Partner',
    });
    expect(result.badge).toBeNull();
  });
});

describe('buildPartnerReferralBadge', () => {
  it('builds a share link and escaped embed code from a real partner referral code', () => {
    const badge = buildPartnerReferralBadge({ baseUrl, referralCode: 'austin-partner', partnerName: 'Austin Workforce Partner' });
    expect(badge.href).toBe('https://www.workforceap.org/apply?ref=austin-partner');
    expect(badge.embedCode).toContain('href="https://www.workforceap.org/apply?ref=austin-partner"');
    expect(badge.embedCode).toContain('Austin Workforce Partner');
    expect(badge.embedCode).not.toContain('<script');
  });
});
