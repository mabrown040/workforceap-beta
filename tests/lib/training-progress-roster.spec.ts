import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROSTER_FILTERS,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_KEY,
  filterTrainingRows,
  isLinkFilter,
  isPaceFilter,
  isSortKey,
  countMembersWithTraining,
  rosterProgramOptions,
  sortTrainingRows,
  summarizeTrainingRows,
  type RosterRow,
} from '@/lib/admin/trainingProgressRoster';
import { latestCompletedGradeByUser } from '@/lib/admin/trainingProgressGrades';
import {
  deriveTrainingPace,
  programSlugsForLearner,
} from '@/lib/admin/trainingProgressPrograms';

function row(over: Partial<RosterRow> & { id: string }): RosterRow {
  return {
    student: 'Learner',
    program: 'IT Support Professional Certificate (IBM)',
    modulesDone: 0,
    modulesTotal: 10,
    percentComplete: 0,
    pace: 'Stalled',
    ...over,
  };
}

const NOEL = row({
  id: 'u1:it',
  student: 'Noel Gonzalez',
  modulesDone: 2,
  modulesTotal: 10,
  percentComplete: 22,
  pace: 'Behind',
  courseraGrade: 85.4,
  inWap: true,
  noProgram: true,
});
const JOSEPH = row({
  id: 'u2:ai',
  student: 'Joseph David Ring',
  program: 'AI and Software Developer Professional Certificate',
  modulesDone: 2,
  modulesTotal: 17,
  percentComplete: 16,
  pace: 'Behind',
  courseraGrade: 86.8,
  inWap: true,
  noProgram: true,
});
const AVERY = row({
  id: 'u3:it',
  student: 'Avery Stone',
  modulesDone: 9,
  modulesTotal: 10,
  percentComplete: 91,
  pace: 'Ahead',
  courseraGrade: null,
  inWap: true,
});
const UNMATCHED = row({
  id: 'coursera:zed@example.com',
  student: 'Zed Coursera',
  program: 'Coursera activity',
  modulesDone: 0,
  modulesTotal: 3,
  percentComplete: 4,
  pace: 'Stalled',
  inWap: false,
});

const ALL = [NOEL, JOSEPH, AVERY, UNMATCHED];
const ids = (rows: readonly RosterRow[]) => rows.map((r) => r.id);

describe('training roster filtering', () => {
  it('returns every row under the default filters', () => {
    expect(filterTrainingRows(ALL, DEFAULT_ROSTER_FILTERS)).toHaveLength(4);
  });

  it('matches the search against student and program, case-insensitively', () => {
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, search: 'noel' })))
      .toEqual(['u1:it']);
    // Program text is searchable too, so "who is in the AI program" works
    // without knowing a single learner's name.
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, search: 'AI AND SOFTWARE' })))
      .toEqual(['u2:ai']);
  });

  it('ignores surrounding whitespace in the search', () => {
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, search: '   ' })))
      .toEqual(ids(ALL));
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, search: '  avery  ' })))
      .toEqual(['u3:it']);
  });

  it('filters by pace', () => {
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, pace: 'Behind' })))
      .toEqual(['u1:it', 'u2:ai']);
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, pace: 'Ahead' })))
      .toEqual(['u3:it']);
  });

  it('filters by exact program title', () => {
    expect(
      ids(
        filterTrainingRows(ALL, {
          ...DEFAULT_ROSTER_FILTERS,
          program: 'IT Support Professional Certificate (IBM)',
        }),
      ),
    ).toEqual(['u1:it', 'u3:it']);
  });

  it('separates unmatched Coursera identities from members without a program', () => {
    // The distinction matters: one needs reconciling to a WAP account, the
    // other needs a program assigned. Lumping them together hides both jobs.
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, link: 'unmatched' })))
      .toEqual(['coursera:zed@example.com']);
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, link: 'no-program' })))
      .toEqual(['u1:it', 'u2:ai']);
    expect(ids(filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, link: 'linked' })))
      .toEqual(['u1:it', 'u2:ai', 'u3:it']);
  });

  it('combines filters conjunctively', () => {
    expect(
      ids(
        filterTrainingRows(ALL, {
          search: 'gonzalez',
          pace: 'Behind',
          program: 'IT Support Professional Certificate (IBM)',
          link: 'no-program',
        }),
      ),
    ).toEqual(['u1:it']);
    expect(
      filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, search: 'gonzalez', pace: 'Ahead' }),
    ).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [...ALL];
    filterTrainingRows(input, { ...DEFAULT_ROSTER_FILTERS, pace: 'Ahead' });
    expect(input).toEqual(ALL);
  });
});

describe('training roster sorting', () => {
  it('defaults to most complete first', () => {
    expect(ids(sortTrainingRows(ALL, DEFAULT_SORT_KEY, DEFAULT_SORT_DIRECTION)))
      .toEqual(['u3:it', 'u1:it', 'u2:ai', 'coursera:zed@example.com']);
  });

  it('sorts by student name in both directions', () => {
    expect(sortTrainingRows(ALL, 'student', 'asc').map((r) => r.student))
      .toEqual(['Avery Stone', 'Joseph David Ring', 'Noel Gonzalez', 'Zed Coursera']);
    expect(sortTrainingRows(ALL, 'student', 'desc').map((r) => r.student))
      .toEqual(['Zed Coursera', 'Noel Gonzalez', 'Joseph David Ring', 'Avery Stone']);
  });

  it('orders pace by health rather than alphabetically', () => {
    // Alphabetically 'Ahead' < 'Behind' < 'On track' < 'Stalled' would be a
    // coincidence; 'On track' must outrank 'Behind' because it is better.
    const paced = [
      row({ id: 'a', pace: 'Stalled' }),
      row({ id: 'b', pace: 'On track' }),
      row({ id: 'c', pace: 'Ahead' }),
      row({ id: 'd', pace: 'Behind' }),
    ];
    expect(sortTrainingRows(paced, 'pace', 'asc').map((r) => r.pace))
      .toEqual(['Ahead', 'On track', 'Behind', 'Stalled']);
  });

  it('sorts an unknown pace after every known one', () => {
    const paced = [row({ id: 'x', pace: 'Graduated' }), row({ id: 'y', pace: 'Stalled' })];
    expect(sortTrainingRows(paced, 'pace', 'asc').map((r) => r.pace))
      .toEqual(['Stalled', 'Graduated']);
  });

  it('keeps ungraded rows last in both directions', () => {
    // '—' is "no grade recorded", not a zero, so flipping the order must not
    // promote it above a real score. Both directions therefore end with the
    // same ungraded tail, held in a fixed id order rather than an arbitrary one.
    const descending = sortTrainingRows(ALL, 'courseraGrade', 'desc').map((r) => r.student);
    const ascending = sortTrainingRows(ALL, 'courseraGrade', 'asc').map((r) => r.student);

    expect(descending.slice(0, 2)).toEqual(['Joseph David Ring', 'Noel Gonzalez']);
    expect(ascending.slice(0, 2)).toEqual(['Noel Gonzalez', 'Joseph David Ring']);
    expect(descending.slice(2)).toEqual(['Zed Coursera', 'Avery Stone']);
    expect(ascending.slice(2)).toEqual(['Zed Coursera', 'Avery Stone']);
  });

  it('breaks module ties on the smaller program', () => {
    // Two modules of ten is further along than two of seventeen.
    expect(sortTrainingRows([JOSEPH, NOEL], 'modules', 'desc').map((r) => r.student))
      .toEqual(['Noel Gonzalez', 'Joseph David Ring']);
  });

  it('is stable and deterministic for fully tied rows', () => {
    const tied = [
      row({ id: 'z', student: 'Same', percentComplete: 50 }),
      row({ id: 'a', student: 'Same', percentComplete: 50 }),
      row({ id: 'm', student: 'Same', percentComplete: 50 }),
    ];
    expect(ids(sortTrainingRows(tied, 'percentComplete', 'desc'))).toEqual(['a', 'm', 'z']);
    // Re-sorting the already-sorted output must not shuffle it.
    expect(ids(sortTrainingRows(sortTrainingRows(tied, 'percentComplete', 'desc'), 'percentComplete', 'desc')))
      .toEqual(['a', 'm', 'z']);
  });

  it('does not mutate the input array', () => {
    const input = [...ALL];
    sortTrainingRows(input, 'student', 'asc');
    expect(ids(input)).toEqual(ids(ALL));
  });
});

describe('training roster summary', () => {
  it('counts Ahead toward On Track and rounds the mean', () => {
    const summary = summarizeTrainingRows(ALL);
    expect(summary).toEqual({
      total: 4,
      onTrack: 1,
      behind: 2,
      stalled: 1,
      // (22 + 16 + 91 + 4) / 4 = 33.25 → 33
      avgPercent: 33,
    });
  });

  it('summarizes the filtered subset, not the whole roster', () => {
    const behind = filterTrainingRows(ALL, { ...DEFAULT_ROSTER_FILTERS, pace: 'Behind' });
    expect(summarizeTrainingRows(behind)).toEqual({
      total: 2,
      onTrack: 0,
      behind: 2,
      stalled: 0,
      avgPercent: 19,
    });
  });

  it('reports zeroes for an empty set instead of dividing by zero', () => {
    expect(summarizeTrainingRows([])).toEqual({
      total: 0,
      onTrack: 0,
      behind: 0,
      stalled: 0,
      avgPercent: 0,
    });
  });
});

describe('training roster program options', () => {
  it('lists each program once, alphabetically', () => {
    expect(rosterProgramOptions(ALL)).toEqual([
      'AI and Software Developer Professional Certificate',
      'Coursera activity',
      'IT Support Professional Certificate (IBM)',
    ]);
  });
});

describe('countMembersWithTraining', () => {
  const MEMBER_IDS = ['u1', 'u2', 'u3'];

  it('counts each member once when every member holds a single row', () => {
    expect(countMembersWithTraining([NOEL, JOSEPH, AVERY, UNMATCHED], MEMBER_IDS)).toBe(3);
  });

  it('counts a multi-program member once, not once per row', () => {
    // PR #2280 emits one row per program a learner has progress in. Counting
    // rows here would report more members with training activity than the
    // organization has members.
    const multiProgram = [
      row({ id: 'u1:it', student: 'Noel Gonzalez', percentComplete: 22 }),
      row({ id: 'u1:ai', student: 'Noel Gonzalez', program: 'AI', percentComplete: 9 }),
      row({ id: 'u1:sec', student: 'Noel Gonzalez', program: 'Security', percentComplete: 4 }),
      row({ id: 'u2:it', student: 'Avery Stone', percentComplete: 91 }),
    ];
    expect(multiProgram).toHaveLength(4);
    expect(countMembersWithTraining(multiProgram, MEMBER_IDS)).toBe(2);
  });

  it('excludes unmatched Coursera identities, which are not members', () => {
    expect(countMembersWithTraining([UNMATCHED], MEMBER_IDS)).toBe(0);
  });

  it('ignores a row whose id prefix is not a known member', () => {
    // Cross-checking against the real member list keeps a stray or malformed
    // id from inflating the number shown on the page.
    const stray = [row({ id: 'ghost:it', student: 'Nobody' }), row({ id: 'u2:it', student: 'Avery' })];
    expect(countMembersWithTraining(stray, MEMBER_IDS)).toBe(1);
  });

  it('reports zero for an empty roster', () => {
    expect(countMembersWithTraining([], MEMBER_IDS)).toBe(0);
  });
});

describe('roster control guards', () => {
  it('rejects values that are not valid filter or sort choices', () => {
    // The selects are driven by URL-independent state, but these guards keep a
    // stray value from becoming an unhandled filter that silently shows all.
    expect(isPaceFilter('Behind')).toBe(true);
    expect(isPaceFilter('behind')).toBe(false);
    expect(isLinkFilter('no-program')).toBe(true);
    expect(isLinkFilter('everyone')).toBe(false);
    expect(isSortKey('percentComplete')).toBe(true);
    expect(isSortKey('grade')).toBe(false);
  });
});

describe('latestCompletedGradeByUser', () => {
  const noelRows = [
    {
      userId: 'noel',
      courseSlug: 'introduction-software-programming-and-databases',
      status: 'IN_PROGRESS' as const,
      scoreScaled: 0.16,
      lastActivityAt: new Date('2026-09-15T23:51:35.633Z'),
      lastUpdatedAt: new Date('2026-09-16T12:30:47.484Z'),
    },
    {
      userId: 'noel',
      courseSlug: 'introduction-to-hardware-and-operating-systems',
      status: 'COMPLETED' as const,
      scoreScaled: 0.854,
      lastActivityAt: new Date('2026-09-08T23:37:19.234Z'),
      lastUpdatedAt: new Date('2026-09-16T12:30:47.691Z'),
    },
    {
      userId: 'noel',
      courseSlug: 'introduction-to-technical-support',
      status: 'COMPLETED' as const,
      scoreScaled: 0.86,
      lastActivityAt: new Date('2026-09-02T05:15:07.130Z'),
      lastUpdatedAt: new Date('2026-09-16T12:30:47.589Z'),
    },
  ];

  it('never reports a partial score from a course still in progress', () => {
    // Production shape. Before the fix this member displayed 16% — the partial
    // score of an unfinished course — while passing two courses at ~86%.
    expect(latestCompletedGradeByUser(noelRows).get('noel')).toBe(85.4);
  });

  it('does not depend on the order rows arrive in', () => {
    const forward = latestCompletedGradeByUser(noelRows).get('noel');
    const reversed = latestCompletedGradeByUser([...noelRows].reverse()).get('noel');
    expect(forward).toBe(reversed);
  });

  it('picks the most recently active completed course', () => {
    expect(
      latestCompletedGradeByUser([
        { userId: 'u', courseSlug: 'old', status: 'COMPLETED', scoreScaled: 0.7, lastActivityAt: new Date('2026-01-01T00:00:00Z') },
        { userId: 'u', courseSlug: 'new', status: 'COMPLETED', scoreScaled: 0.9, lastActivityAt: new Date('2026-06-01T00:00:00Z') },
      ]).get('u'),
    ).toBe(90);
  });

  it('breaks an exact activity tie on course slug so the value is stable', () => {
    const sameInstant = new Date('2026-05-05T00:00:00Z');
    const rows = [
      { userId: 'u', courseSlug: 'b-course', status: 'COMPLETED' as const, scoreScaled: 0.5, lastActivityAt: sameInstant },
      { userId: 'u', courseSlug: 'a-course', status: 'COMPLETED' as const, scoreScaled: 0.8, lastActivityAt: sameInstant },
    ];
    expect(latestCompletedGradeByUser(rows).get('u')).toBe(80);
    expect(latestCompletedGradeByUser([...rows].reverse()).get('u')).toBe(80);
  });

  it('falls back to lastUpdatedAt when a row has no activity timestamp', () => {
    expect(
      latestCompletedGradeByUser([
        { userId: 'u', courseSlug: 'a', status: 'COMPLETED', scoreScaled: 0.6, lastActivityAt: null, lastUpdatedAt: new Date('2026-02-01T00:00:00Z') },
        { userId: 'u', courseSlug: 'b', status: 'COMPLETED', scoreScaled: 0.7, lastActivityAt: null, lastUpdatedAt: new Date('2026-03-01T00:00:00Z') },
      ]).get('u'),
    ).toBe(70);
  });

  it('records no grade when every completed course is unscored', () => {
    const grades = latestCompletedGradeByUser([
      { userId: 'u', courseSlug: 'a', status: 'COMPLETED', scoreScaled: null, lastActivityAt: new Date() },
      { userId: 'u', courseSlug: 'b', status: 'IN_PROGRESS', scoreScaled: 0.42, lastActivityAt: new Date() },
    ]);
    expect(grades.has('u')).toBe(false);
  });

  it('keeps learners independent of one another', () => {
    const grades = latestCompletedGradeByUser([
      { userId: 'a', courseSlug: 'x', status: 'COMPLETED', scoreScaled: 0.91, lastActivityAt: new Date('2026-04-01T00:00:00Z') },
      { userId: 'b', courseSlug: 'y', status: 'COMPLETED', scoreScaled: 0.55, lastActivityAt: new Date('2026-04-02T00:00:00Z') },
    ]);
    expect(grades.get('a')).toBe(91);
    expect(grades.get('b')).toBe(55);
  });
});

const CATALOG: Record<string, string> = {
  'google-it-support': 'google-it-support',
  'IT Support Professional Certificate (IBM)': 'google-it-support',
  'ai-practitioner-professional-certificate-aws': 'ai-practitioner-professional-certificate-aws',
  'software-developer-professional-certificate-ibm':
    'software-developer-professional-certificate-ibm',
};

function resolveCatalogSlug(slug: string): string | undefined {
  return CATALOG[slug];
}

describe('programSlugsForLearner', () => {
  const learner = { id: 'u1', enrolledProgram: null as string | null };

  it('emits the stored primary program when there is no progress yet', () => {
    expect(
      programSlugsForLearner({
        learner,
        primaryEnrollment: { programSlug: 'google-it-support' },
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual(['google-it-support']);
  });

  it('falls back to User.enrolledProgram when no CourseEnrollment row exists', () => {
    expect(
      programSlugsForLearner({
        learner: { id: 'u1', enrolledProgram: 'IT Support Professional Certificate (IBM)' },
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual(['google-it-support']);
  });

  it('adds every progress program instead of collapsing to the stored primary', () => {
    // Joseph Ring's software-dev work plus an AI practitioner course used to
    // collapse to whichever program held the most recent activity.
    expect(
      programSlugsForLearner({
        learner,
        primaryEnrollment: { programSlug: 'software-developer-professional-certificate-ibm' },
        progressProgramSlugs: [
          'software-developer-professional-certificate-ibm',
          'ai-practitioner-professional-certificate-aws',
        ],
        inferredProgramSlug: 'ai-practitioner-professional-certificate-aws',
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual([
      'software-developer-professional-certificate-ibm',
      'ai-practitioner-professional-certificate-aws',
    ]);
  });

  it('does not use inferred activity when a stored program already exists', () => {
    expect(
      programSlugsForLearner({
        learner,
        primaryEnrollment: { programSlug: 'google-it-support' },
        inferredProgramSlug: 'ai-practitioner-professional-certificate-aws',
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual(['google-it-support']);
  });

  it('does not use inferred activity when any progress program already exists', () => {
    expect(
      programSlugsForLearner({
        learner,
        progressProgramSlugs: ['google-it-support'],
        inferredProgramSlug: 'ai-practitioner-professional-certificate-aws',
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual(['google-it-support']);
  });

  it('falls back to the inferred program only when nothing else is known', () => {
    expect(
      programSlugsForLearner({
        learner,
        inferredProgramSlug: 'google-it-support',
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual(['google-it-support']);
  });

  it('drops slugs that are not in the catalog', () => {
    expect(
      programSlugsForLearner({
        learner: { id: 'u1', enrolledProgram: 'not-a-real-program' },
        inferredProgramSlug: 'also-missing',
        resolveCanonicalSlug: resolveCatalogSlug,
      }),
    ).toEqual([]);
  });
});

describe('deriveTrainingPace', () => {
  const idleCutoff = new Date('2026-09-01T00:00:00Z');
  const recent = new Date('2026-09-10T00:00:00Z');
  const idle = new Date('2026-08-01T00:00:00Z');

  it('marks ≥85% Ahead even when the learner has gone idle', () => {
    expect(
      deriveTrainingPace({ percentComplete: 90, lastActivity: idle, idleCutoff }),
    ).toBe('Ahead');
  });

  it('marks a finished course Ahead rather than Stalled', () => {
    expect(
      deriveTrainingPace({ percentComplete: 100, lastActivity: idle, idleCutoff }),
    ).toBe('Ahead');
  });

  it('marks incomplete idle work Stalled', () => {
    expect(
      deriveTrainingPace({ percentComplete: 50, lastActivity: idle, idleCutoff }),
    ).toBe('Stalled');
  });

  it('marks never-active incomplete work Stalled', () => {
    expect(deriveTrainingPace({ percentComplete: 10, idleCutoff })).toBe('Stalled');
  });

  it('marks recently active work under 40% Behind', () => {
    expect(
      deriveTrainingPace({ percentComplete: 39, lastActivity: recent, idleCutoff }),
    ).toBe('Behind');
  });

  it('marks recently active work at 40% On track', () => {
    expect(
      deriveTrainingPace({ percentComplete: 40, lastActivity: recent, idleCutoff }),
    ).toBe('On track');
  });
});
