import { PROGRAMS } from '@/lib/content/programs';
import { enrollmentPathForSlug } from '@/lib/enroll/enrollmentPath';

const KNOWN_PROGRAM_SLUGS = new Set(PROGRAMS.map((program) => program.slug));

export function sponsorshipWindowFromTerm(
  termLabel: string | null | undefined,
): { startsAt: Date; endsAt: Date } | null {
  const year = Number(/^(\d{4})/.exec(termLabel?.trim() ?? '')?.[1]);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return {
    startsAt: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    endsAt: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

export function validateAdminProgramSlugs(
  slugs: string[] | undefined,
  opts: { publishing: boolean },
): { ok: true; slugs: string[] } | { ok: false; error: string } {
  const list = [...new Set((slugs ?? []).map((slug) => slug.trim()).filter(Boolean))];
  if (opts.publishing && list.length === 0) {
    return { ok: false, error: 'Pick at least one program before publishing the enrollment page' };
  }
  const unknown = list.find((slug) => !KNOWN_PROGRAM_SLUGS.has(slug));
  if (unknown) {
    return { ok: false, error: `Unknown program slug: ${unknown}` };
  }
  return { ok: true, slugs: list };
}

export function sponsorshipStampFields(input: {
  name: string;
  sponsoredEnrollment?: boolean;
  sponsorshipTermLabel?: string | null;
}): {
  sponsorshipStartsAt?: Date | null;
  sponsorshipEndsAt?: Date | null;
  sponsorshipNotes?: string;
} {
  if (!input.sponsoredEnrollment) return {};
  const term = input.sponsorshipTermLabel?.trim() || '2026';
  const window = sponsorshipWindowFromTerm(term);
  return {
    sponsorshipStartsAt: window?.startsAt ?? null,
    sponsorshipEndsAt: window?.endsAt ?? null,
    sponsorshipNotes: `Sponsored by ${input.name} (${term})`,
  };
}

export function partnerDirectoryMeta(partner: {
  slug: string;
  partnerType?: string | null;
  referralCode?: string | null;
  enrollmentPageEnabled?: boolean;
  sponsoredEnrollment?: boolean;
}): { isSchool: boolean; enrollPath: string | null; referralCode: string | null } {
  const isSchool = isSchoolManagedPartner(partner);
  return {
    isSchool,
    enrollPath: partner.enrollmentPageEnabled ? enrollmentPathForSlug(partner.slug) : null,
    referralCode: partner.referralCode?.trim() || null,
  };
}

export function isSchoolManagedPartner(partner: {
  partnerType?: string | null;
  enrollmentPageEnabled?: boolean;
  sponsoredEnrollment?: boolean;
}): boolean {
  return (
    partner.partnerType === 'high_school' ||
    partner.enrollmentPageEnabled === true ||
    partner.sponsoredEnrollment === true
  );
}
