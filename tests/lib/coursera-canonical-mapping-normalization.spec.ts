import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * B4B's `listContents` returns `Course~<id>`; its `enrollmentReports` return
 * the bare `<id>`. Mapping rows were seeded from whichever endpoint fed them
 * and `courseraCourseId` is unique per spelling, so the same course could hold
 * a bare row and a prefixed twin while an exact-match lookup on the bare id saw
 * only one. In production 130 of 228 mapping rows carried the prefix and 20 of
 * 42 raw progress rows matched nothing. These tests pin the normalized lookup.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    courseraCanonicalCourseMapping: {
      findMany: mocks.findMany,
    },
  },
}));

import {
  courseraCourseIdLookupVariants,
  findCanonicalMappingForCourseraCourse,
  indexCanonicalMappingRows,
  loadCanonicalMappingsForCourseraIds,
} from '@/lib/coursera/canonicalMapping';

const ID = 'nI__WUzdEe64qQ7qqom4Rw';

function row(over: {
  courseraCourseId: string;
  program?: string;
  course?: string;
  slug?: string | null;
}) {
  return {
    courseraCourseId: over.courseraCourseId,
    courseraCourseSlug: over.slug ?? null,
    canonicalProgramSlug: over.program ?? 'it-support-professional-certificate-ibm',
    canonicalCourseSlug: over.course ?? 'introduction-to-technical-support',
  };
}

beforeEach(() => {
  mocks.findMany.mockReset();
});

describe('courseraCourseIdLookupVariants', () => {
  it('covers the bare id and both provider prefixes', () => {
    expect(courseraCourseIdLookupVariants(ID)).toEqual([ID, `Course~${ID}`, `Specialization~${ID}`]);
  });
});

describe('indexCanonicalMappingRows', () => {
  it('keys a prefixed row under its bare id', () => {
    // The regression: a mapping seeded from listContents was unreachable from
    // a progress row's bare id.
    const index = indexCanonicalMappingRows([row({ courseraCourseId: `Course~${ID}` })]);
    expect(index.byCourseraCourseId.get(ID)?.courseSlug).toBe('introduction-to-technical-support');
    expect(index.byCourseraCourseId.has(`Course~${ID}`)).toBe(false);
  });

  it('prefers the bare row when a prefixed twin disagrees, regardless of order', () => {
    // The bare row is the only one progress rows have ever matched, so it is
    // the current effective behaviour; the twin may only fill gaps.
    const bare = row({ courseraCourseId: ID, program: 'catalog-program', course: 'catalog-course' });
    const twin = row({ courseraCourseId: `Course~${ID}`, program: 'b4b-program', course: 'b4b-course' });

    expect(indexCanonicalMappingRows([bare, twin]).byCourseraCourseId.get(ID)?.programSlug).toBe('catalog-program');
    expect(indexCanonicalMappingRows([twin, bare]).byCourseraCourseId.get(ID)?.programSlug).toBe('catalog-program');
  });

  it('applies the same preference to the slug index', () => {
    const bare = row({ courseraCourseId: ID, program: 'catalog-program', slug: 'intro-tech-support' });
    const twin = row({ courseraCourseId: `Course~${ID}`, program: 'b4b-program', slug: 'intro-tech-support' });
    expect(indexCanonicalMappingRows([twin, bare]).byCourseraCourseSlug.get('intro-tech-support')?.programSlug)
      .toBe('catalog-program');
  });

  it('keeps distinct courses distinct', () => {
    const index = indexCanonicalMappingRows([
      row({ courseraCourseId: 'aaa', course: 'course-a' }),
      row({ courseraCourseId: 'Course~bbb', course: 'course-b' }),
    ]);
    expect(index.byCourseraCourseId.get('aaa')?.courseSlug).toBe('course-a');
    expect(index.byCourseraCourseId.get('bbb')?.courseSlug).toBe('course-b');
    expect(index.byCourseraCourseId.size).toBe(2);
  });

  it('ignores rows whose id normalizes to nothing', () => {
    expect(indexCanonicalMappingRows([row({ courseraCourseId: 'Course~' })]).byCourseraCourseId.size).toBe(0);
  });
});

describe('loadCanonicalMappingsForCourseraIds', () => {
  it('queries every spelling of each id and normalizes the input', async () => {
    mocks.findMany.mockResolvedValue([]);
    await loadCanonicalMappingsForCourseraIds([`Course~${ID}`, ` ${ID} `, null, undefined, '']);

    const where = mocks.findMany.mock.calls[0][0].where.courseraCourseId.in as string[];
    // One course, three spellings — the prefixed and bare inputs collapse first.
    expect(where).toEqual([ID, `Course~${ID}`, `Specialization~${ID}`]);
  });

  it('resolves a bare progress id against a prefixed mapping row', async () => {
    mocks.findMany.mockResolvedValue([row({ courseraCourseId: `Course~${ID}` })]);
    const index = await loadCanonicalMappingsForCourseraIds([ID]);
    expect(index.byCourseraCourseId.get(ID)).toEqual({
      programSlug: 'it-support-professional-certificate-ibm',
      courseSlug: 'introduction-to-technical-support',
    });
  });

  it('returns an empty index without querying when nothing usable is passed', async () => {
    const index = await loadCanonicalMappingsForCourseraIds([null, '', '   ']);
    expect(index.byCourseraCourseId.size).toBe(0);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe('findCanonicalMappingForCourseraCourse', () => {
  it('finds a prefixed row from a bare id', async () => {
    mocks.findMany.mockResolvedValue([row({ courseraCourseId: `Course~${ID}` })]);
    const hit = await findCanonicalMappingForCourseraCourse({ courseraCourseId: ID });
    expect(hit?.courseSlug).toBe('introduction-to-technical-support');

    const where = mocks.findMany.mock.calls[0][0].where.OR[0].courseraCourseId.in as string[];
    expect(where).toContain(`Course~${ID}`);
  });

  it('prefers the bare row over a more recently updated prefixed twin', async () => {
    // Rows arrive most-recent first. Two crons refresh the prefixed twin every
    // run, so recency alone would let the auto-seeded row outrank a curated one.
    mocks.findMany.mockResolvedValue([
      row({ courseraCourseId: `Course~${ID}`, program: 'b4b-program' }),
      row({ courseraCourseId: ID, program: 'catalog-program' }),
    ]);
    const hit = await findCanonicalMappingForCourseraCourse({ courseraCourseId: `Course~${ID}` });
    expect(hit?.programSlug).toBe('catalog-program');
  });

  it('prefers an id match over a slug-only match', async () => {
    mocks.findMany.mockResolvedValue([
      row({ courseraCourseId: 'other-course', slug: 'shared-slug', program: 'slug-program' }),
      row({ courseraCourseId: `Course~${ID}`, program: 'id-program' }),
    ]);
    const hit = await findCanonicalMappingForCourseraCourse({
      courseraCourseId: ID,
      courseraCourseSlug: 'shared-slug',
    });
    expect(hit?.programSlug).toBe('id-program');
  });

  it('falls back to a slug match when no id matches', async () => {
    mocks.findMany.mockResolvedValue([
      row({ courseraCourseId: 'other-course', slug: 'shared-slug', program: 'slug-program' }),
    ]);
    const hit = await findCanonicalMappingForCourseraCourse({
      courseraCourseId: ID,
      courseraCourseSlug: 'shared-slug',
    });
    expect(hit?.programSlug).toBe('slug-program');
  });

  it('returns null with no rows and null with no usable input', async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await findCanonicalMappingForCourseraCourse({ courseraCourseId: ID })).toBeNull();
    expect(await findCanonicalMappingForCourseraCourse({ courseraCourseId: '  ', courseraCourseSlug: null })).toBeNull();
  });
});
