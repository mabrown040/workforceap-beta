import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ fullName: 'Jordan Learner' })),
    },
    milestoneCascade: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));
vi.mock('@/lib/ai/anthropicChat', () => ({
  claudeChat: vi.fn(async () =>
    JSON.stringify({
      counselorBrief: 'Jordan reached the halfway point.',
      actions: [
        {
          type: 'flag_for_counselor_call',
          rationale: 'Check in on the remaining course plan.',
          confidence: 0.9,
        },
      ],
    }),
  ),
}));

import { draftCascade } from '@/lib/milestoneCascade/draftCascade';

describe('program milestone draft snapshots', () => {
  it('accepts a program-scoped snapshot without invented course fields', async () => {
    const result = await draftCascade({
      id: 'cascade-1',
      userId: 'user-1',
      milestoneType: 'program_halfway',
      contextSnapshot: {
        programSlug: 'program-one',
        completedCount: 2,
        totalCourses: 4,
        source: 'coursera-webhook',
        detectedAt: '2026-08-29T12:00:00.000Z',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: true, cascadeId: 'cascade-1' }),
    );
  });
});
