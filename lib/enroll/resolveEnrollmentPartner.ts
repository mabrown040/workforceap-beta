import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { normalizePartnerRef } from '@/lib/partner/sponsoredEnrollment';
import { enrollmentPathForSlug } from '@/lib/enroll/enrollmentPath';

export { enrollmentPathForSlug, enrollmentPathSegment } from '@/lib/enroll/enrollmentPath';

export type EnrollmentProgramCard = {
  slug: string;
  title: string;
  category: string;
  categoryColor: string;
  icon: string;
  duration: string;
  salary: string;
  partner: string;
  skills: string[];
  featured: boolean;
  note: string | null;
};

export type EnrollmentPageModel = {
  partnerId: string;
  name: string;
  slug: string;
  referralCode: string;
  enrollmentPath: string;
  headline: string;
  blurb: string;
  schoolDistrict: string | null;
  termLabel: string;
  costSentence: string;
  programs: EnrollmentProgramCard[];
};

function candidateKeys(school: string): string[] {
  const key = normalizePartnerRef(school);
  if (!key) return [];
  const keys = new Set<string>([key]);
  if (!key.endsWith('-high-school')) keys.add(`${key}-high-school`);
  return [...keys];
}

function salaryRangeDisplay(salary: string): string {
  const m = salary.match(/\$(\d+)K\s*[-–]\s*\$(\d+)K/i);
  if (m) return `$${parseInt(m[1], 10)}K–$${parseInt(m[2], 10)}K`;
  return salary.replace(/^Starting salary:\s*/i, '').trim();
}

function buildCostSentence(name: string, termLabel: string): string {
  return (
    `Career training and certifications offered at no cost to ${name} students for ${termLabel}` +
    ` — sponsored through the WorkforceAP–${name.replace(/ High School$/i, '')} partnership.`
  );
}

export async function resolveEnrollmentPartner(school: string): Promise<EnrollmentPageModel | null> {
  const keys = candidateKeys(school);
  if (keys.length === 0) return null;

  const partner = await prisma.partner.findFirst({
    where: {
      active: true,
      enrollmentPageEnabled: true,
      OR: [{ slug: { in: keys } }, { referralCode: { in: keys } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      referralCode: true,
      enrollmentHeadline: true,
      enrollmentBlurb: true,
      schoolDistrict: true,
      sponsorshipTermLabel: true,
      programCatalog: {
        orderBy: { displayOrder: 'asc' },
        select: { programSlug: true, featured: true, note: true },
      },
    },
  });
  if (!partner?.referralCode) return null;

  const programs: EnrollmentProgramCard[] = [];
  for (const row of partner.programCatalog) {
    const program = getProgramBySlug(row.programSlug);
    if (!program) continue;
    programs.push({
      slug: program.slug,
      title: program.title,
      category: program.categoryLabel,
      categoryColor: program.categoryColor,
      icon: program.icon,
      duration: program.duration,
      salary: salaryRangeDisplay(program.salary),
      partner: program.partner,
      skills: program.skills.slice(0, 3),
      featured: row.featured,
      note: row.note,
    });
  }
  if (programs.length === 0) return null;

  const termLabel = partner.sponsorshipTermLabel?.trim() || new Date().getUTCFullYear().toString();
  return {
    partnerId: partner.id,
    name: partner.name,
    slug: partner.slug,
    referralCode: partner.referralCode,
    enrollmentPath: enrollmentPathForSlug(partner.slug),
    headline: partner.enrollmentHeadline?.trim() || `${partner.name} students: launch your career with an industry certification`,
    blurb: partner.enrollmentBlurb?.trim() || buildCostSentence(partner.name, termLabel),
    schoolDistrict: partner.schoolDistrict,
    termLabel,
    costSentence: buildCostSentence(partner.name, termLabel),
    programs,
  };
}

export function enrollPageCopyIsStakeSafe(text: string): boolean {
  return !/\bfree\b/i.test(text);
}
