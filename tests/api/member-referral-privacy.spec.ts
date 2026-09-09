// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), code: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user }));
vi.mock('@/lib/member/referrals', () => ({ getOrCreateReferralCode: mocks.code, getRewardedReferralCount: mocks.count }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (fn: unknown) => fn }));
vi.mock('@/lib/db/withDbRetry', () => ({ withDbRetry: (fn: () => Promise<unknown>) => fn() }));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn() } }));
import { GET } from '@/app/api/member/referral/route';
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: 'own-member' }); mocks.code.mockResolvedValue('ABCD2345'); mocks.count.mockResolvedValue(2); });
describe('member referral API privacy', () => {
  it('requires an authenticated member', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/member/referral'))).status).toBe(401);
    expect(mocks.code).not.toHaveBeenCalled(); expect(mocks.count).not.toHaveBeenCalled();
  });
  it('ignores supplied identity and returns only the caller share details and aggregate', async () => {
    const response = await GET(new Request('http://localhost/api/member/referral?userId=another-member'));
    expect(await response.json()).toEqual({ code: 'ABCD2345', sharePath: '/r/ABCD2345', rewardedCount: 2 });
    expect(mocks.code).toHaveBeenCalledWith('own-member'); expect(mocks.count).toHaveBeenCalledWith('own-member');
  });
  it('returns a recoverable safe failure instead of an empty success', async () => {
    mocks.count.mockRejectedValue(new Error('Synthetic private SQL detail'));
    const response = await GET(new Request('http://localhost/api/member/referral'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Please try again'); expect(JSON.stringify(body)).not.toContain('SQL detail');
  });
});
