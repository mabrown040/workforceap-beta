import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ progress: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn(async () => ({ id: 'member-1', email: 'learner@example.com' })) }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: vi.fn(async () => ({ enrolledProgram: null })) } }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/coursera/learnerProgress', () => ({ fetchLearnerProgressFromB4B: mocks.progress }));
import { POST } from '@/app/api/member/coursera/refresh-progress/route';

describe('Coursera refresh reports provider coverage', () => {
  beforeEach(() => vi.clearAllMocks());
  const run = () => POST(new Request('https://wap.example/api/member/coursera/refresh-progress'));
  it('distinguishes a complete empty roster from unavailable data', async () => {
    mocks.progress.mockResolvedValueOnce(Object.assign(new Map(), { coverage: 'complete' }));
    const complete = await run();
    expect(complete.status).toBe(200);
    expect(await complete.json()).toMatchObject({ complete: true, coverage: 'complete', coursesWithProgress: 0 });
    mocks.progress.mockResolvedValueOnce(Object.assign(new Map(), { coverage: 'unavailable' }));
    const failed = await run();
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ coverage: 'unavailable', coursesWithProgress: 0 });
  });
  it.each(['capped', 'unavailable'])('keeps observed facts and identifies %s coverage', async (coverage) => {
    mocks.progress.mockResolvedValue(Object.assign(new Map([['C1', {}]]), { coverage }));
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ complete: false, coverage, coursesWithProgress: 1, message: expect.any(String) });
  });
});
