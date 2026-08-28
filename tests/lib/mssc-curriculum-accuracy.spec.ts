import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '@/lib/content/programs';
import { PROGRAM_SYLLABI } from '../../shared/programSyllabi';
import { PROGRAM_CURRICULA } from '../../shared/programCurricula';
import {
  PROGRAMS as MARKETING_PROGRAMS,
  partnerBadge,
} from '../../marketing/src/data/programs';

const EXPECTED_CURRICULA = {
  'certified-production-technician-cpt': ['Certified Production Technician (CPT)', 160, 8],
  'certified-logistics-technician-clt': ['Certified Logistics Technician (CLT)', 160, 8],
} as const;

describe('MSSC curriculum (CPT, CLT)', () => {
  it('covers exactly the two in-house authored programs', () => {
    expect(Object.keys(PROGRAM_CURRICULA)).toEqual(Object.keys(EXPECTED_CURRICULA));
  });

  it('never overlaps the source-locked TWC syllabus transcriptions', () => {
    for (const slug of Object.keys(PROGRAM_CURRICULA)) {
      expect(PROGRAM_SYLLABI).not.toHaveProperty(slug);
    }
  });

  it.each(Object.entries(EXPECTED_CURRICULA))(
    '%s declares hours that add up and class content that is filled in',
    (slug, [title, totalHours, courseCount]) => {
      const curriculum = PROGRAM_CURRICULA[slug];
      expect(curriculum.title).toBe(title);
      expect(curriculum.totalHours).toBe(totalHours);
      expect(curriculum.courses).toHaveLength(courseCount);
      expect(curriculum.courses.reduce((sum, course) => sum + course.hours, 0)).toBe(totalHours);
      expect(curriculum.clockHours + curriculum.labHours).toBe(totalHours);
      expect(curriculum.courses.every((course) => course.description.trim().length > 0)).toBe(true);
      expect(curriculum.courses.every((course) => course.certificationAlignment.length > 0)).toBe(true);
      expect(curriculum.certificationTargets.length).toBeGreaterThan(0);
    },
  );

  it.each(Object.keys(EXPECTED_CURRICULA))(
    '%s course content is identical in the Next and Astro catalogs',
    (slug) => {
      const curriculum = PROGRAM_CURRICULA[slug];
      const nextProgram = PROGRAMS.find((program) => program.slug === slug);
      const marketingProgram = MARKETING_PROGRAMS.find((program) => program.slug === slug);

      for (const program of [nextProgram, marketingProgram]) {
        expect(program?.curriculum).toEqual(curriculum);
        expect(program?.syllabus).toBeUndefined();
        expect(program?.duration).toBe(
          `${curriculum.totalHours} hours • ${curriculum.deliveryFormat}`,
        );
        expect(
          program?.courses.map(({ name, estimatedHours, description }) => ({
            name,
            estimatedHours,
            description,
          })),
        ).toEqual(
          curriculum.courses.map((course) => ({
            name: course.name,
            estimatedHours: course.hours,
            description: course.description,
          })),
        );
      }
      expect(partnerBadge(marketingProgram!)).toBe(curriculum.providers);
    },
  );

  it.each(Object.keys(EXPECTED_CURRICULA))(
    '%s keeps the course slugs that skill missions and checkpoints unlock from',
    (slug) => {
      const nextProgram = PROGRAMS.find((program) => program.slug === slug);
      const marketingProgram = MARKETING_PROGRAMS.find((program) => program.slug === slug);
      const expectedSlugs = PROGRAM_CURRICULA[slug].courses.map(
        (_, index) => `${slug}-course-${index + 1}`,
      );

      expect(nextProgram?.courses.map((course) => course.slug)).toEqual(expectedSlugs);
      expect(marketingProgram?.courses.map((course) => course.slug)).toEqual(expectedSlugs);
    },
  );

  it('publishes real contact hours instead of the 10-hour placeholder default', () => {
    for (const slug of Object.keys(EXPECTED_CURRICULA)) {
      const program = PROGRAMS.find((p) => p.slug === slug);
      const contactHours = (program?.courses ?? []).reduce(
        (sum, course) => sum + (course.estimatedHours ?? 0),
        0,
      );
      expect(contactHours).toBe(PROGRAM_CURRICULA[slug].totalHours);
    }
  });

  it('renders curriculum facts on the public program detail template', () => {
    const detailTemplate = readFileSync(
      join(process.cwd(), 'marketing/src/pages/programs/[slug].astro'),
      'utf8',
    );

    expect(detailTemplate).toContain('program.curriculum.deliveryFormat');
    expect(detailTemplate).toContain('program.curriculum.totalHoursLabel');
    expect(detailTemplate).toContain('program.curriculum.credential');
    expect(detailTemplate).toContain('program.curriculum.tuitionAndFees');
    expect(detailTemplate).toContain('program.curriculum.certificationTargets');
  });
});
