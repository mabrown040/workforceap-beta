import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '@/lib/content/programs';
import { PROGRAM_SYLLABI } from '../../shared/programSyllabi';
import {
  PROGRAMS as MARKETING_PROGRAMS,
  partnerBadge,
} from '../../marketing/src/data/programs';

const EXPECTED_SYLLABI = {
  'it-support-professional-certificate-ibm': ['IT Support Professional Certificate (IBM)', 160, 10],
  'comptia-a-professional-certificate': ['CompTIA A+ Professional Certificate (CompTIA A+)', 160, 10],
  'cybersecurity-professional-certificate-google': ['Networking and Cybersecurity Professional Certificate (Net+, Sec+)', 160, 14],
  'project-management-professional-certificate-microsoft': ['Project Management Professional Certificate (Microsoft)', 160, 10],
  'ai-practitioner-professional-certificate-aws': ['AI Practitioner Professional Certificate (AWS)', 160, 17],
  'data-analytics-professional-certificate-google': ['Management and Data Analyst Professional Certificate (Google/IBM)', 160, 13],
  'data-science-professional-certificate-ibm': ['Data Science and Database Administrator (DBA) Professional Certificate (IBM)', 160, 9],
  'aws-cloud-technology-amazon': ['AWS Cloud Technology Professional Certificate (AWS)', 160, 10],
  'ux-design-professional-certificate-google': ['UX Design Professional Certificate (Google)', 160, 8],
  'digital-marketing-e-commerce-google': ['Digital Marketing & E-Commerce Professional Certificate (Google)', 160, 8],
  'software-developer-professional-certificate-ibm': ['AI and Software Developer Professional Certificate (IBM)', 200, 17],
  'health-information-technology-mchit': ['Medical Billing, Coding, and Health Information Technician Certificate (MBCHIT)', 160, 16],
} as const;

describe('TWC syllabus source lock', () => {
  it('contains the exact 12 submitted program records', () => {
    expect(Object.keys(PROGRAM_SYLLABI)).toEqual(Object.keys(EXPECTED_SYLLABI));
  });

  it.each(Object.entries(EXPECTED_SYLLABI))(
    '%s preserves the submitted title, total hours, course count, and hour sum',
    (slug, [title, totalHours, courseCount]) => {
      const syllabus = PROGRAM_SYLLABI[slug as keyof typeof PROGRAM_SYLLABI];
      expect(syllabus.title).toBe(title);
      expect(syllabus.totalHours).toBe(totalHours);
      expect(syllabus.courses).toHaveLength(courseCount);
      expect(syllabus.courses.reduce((sum, course) => sum + course.hours, 0)).toBe(totalHours);
      expect(syllabus.courses.every((course) => course.description.trim().length > 0)).toBe(true);
    },
  );

  it.each(Object.keys(EXPECTED_SYLLABI))(
    '%s drives both Next and Astro catalog records',
    (slug) => {
      const syllabus = PROGRAM_SYLLABI[slug as keyof typeof PROGRAM_SYLLABI];
      const nextProgram = PROGRAMS.find((program) => program.slug === slug);
      const marketingProgram = MARKETING_PROGRAMS.find((program) => program.slug === slug);

      for (const program of [nextProgram, marketingProgram]) {
        expect(program?.title).toBe(syllabus.title);
        expect(program?.description).toBe(syllabus.description);
        expect(program?.syllabus).toEqual(syllabus);
        expect(program?.courses.map(({ name, estimatedHours, description }) => ({ name, estimatedHours, description }))).toEqual(
          syllabus.courses.map((course) => ({
            name: course.name,
            estimatedHours: course.hours,
            description: course.description,
          })),
        );
      }
      expect(partnerBadge(marketingProgram!)).toBe(syllabus.providers);
    },
  );

  it('renders syllabus facts and removes the generic course placeholder', () => {
    const detailTemplate = readFileSync(
      join(process.cwd(), 'marketing/src/pages/programs/[slug].astro'),
      'utf8',
    );

    expect(detailTemplate).not.toContain('Part of the {display} program.');
    expect(detailTemplate).toContain('program.syllabus.deliveryFormat');
    expect(detailTemplate).toContain('program.syllabus.totalHoursLabel');
    expect(detailTemplate).toContain('program.syllabus.tuitionAndFees');
    expect(detailTemplate).toContain('c.description');
  });
});
