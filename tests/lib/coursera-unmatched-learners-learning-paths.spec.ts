import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
  },
}));

import { KNOWN_LEARNING_PATH_IDS } from '@/lib/content/coursera/learningPaths';
import { loadUnmatchedLearners } from '@/lib/coursera/progressQueries';

type RawCall = [TemplateStringsArray, ...unknown[]];

function sqlText(call: RawCall): string {
  return call[0].join('?');
}

describe('loadUnmatchedLearners ignores Learning Path rows', () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
  });

  it('excludes every registered path id from the course count and the progress rows', async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([
        {
          externalEmail: 'learner@example.com',
          externalName: 'Learner',
          courseCount: 1,
          badgeCount: 0,
          xapiCount: 0,
          actorIdentifier: null,
          actorHomePage: null,
          lastActivityTime: new Date('2026-09-12T00:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([]) // badges
      .mockResolvedValueOnce([
        {
          externalEmail: 'learner@example.com',
          courseGrade: null,
          overallProgress: 38,
          isCompleted: false,
          lastActivityTime: new Date('2026-09-12T00:00:00Z'),
        },
      ]);

    const learners = await loadUnmatchedLearners('org-1', 100, { includeTestAccounts: true });

    expect(learners).toHaveLength(1);
    expect(learners[0]).toMatchObject({ courseCount: 1, latestProgressPercent: 38, averageProgressPercent: 38 });

    const calls = mocks.queryRaw.mock.calls as RawCall[];
    expect(calls).toHaveLength(3);

    const unionText = sqlText(calls[0]);
    expect(unionText).toContain('coursera_course_id <> ALL(');
    // The exclusion belongs to the course CTE only; badges and xAPI rows are not courses.
    expect(unionText.split('coursera_course_id <> ALL(')).toHaveLength(2);
    expect(calls[0].slice(1)).toContainEqual([...KNOWN_LEARNING_PATH_IDS]);

    const gradesText = sqlText(calls[2]);
    expect(gradesText).toContain('coursera_course_id <> ALL(');
    expect(calls[2].slice(1)).toContainEqual([...KNOWN_LEARNING_PATH_IDS]);
  });

  it('binds at least the six paths seen on the live feed', () => {
    for (const id of [
      'vjCRy6uOReCwkcurjsXg3Q',
      'vaH4UkrHSKSh-FJKxxik4Q',
      'o9PJJ-ReQ_KTySfkXuPyHw',
      'gCtwKvPFS36rcCrzxSt-Yg',
      'iMhjZsGTRkSIY2bBk-ZEhA',
      'fT-1P-CkT6q_tT_gpM-qJw',
    ]) {
      expect(KNOWN_LEARNING_PATH_IDS).toContain(id);
    }
  });
});
