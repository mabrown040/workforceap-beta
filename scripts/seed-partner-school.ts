#!/usr/bin/env npx tsx
/**
 * Seed a sponsored partner school (dev/demo helper).
 *
 * NOTE ON OWNERSHIP: scripts/create-chs-partner.ts owns the Concordia High
 * School production row and is the only script that should touch it. This
 * helper exists for local dev, demo environments, and standing up FUTURE
 * schools — it is the "adding school #2 is data entry" path that Phase B
 * unlocks. It refuses to touch the CHS slug unless you pass --force.
 *
 * What it does, idempotently (safe to re-run):
 * - Upserts a Partner keyed on --slug, populating the sponsorship block:
 *   sponsoredEnrollment = true, sponsorshipFundingSource = PARTNER_ORG,
 *   a term label (--term, default '2026') and a window covering that year,
 *   plus enrollmentPageEnabled = true so the partner enrollment page renders.
 * - Replaces that partner's PartnerProgramCatalog rows with --programs
 *   (comma-separated slugs) or the five CHS defaults, preserving display
 *   order and marking the first one featured.
 *
 * Usage:
 *   node scripts/prisma-env.js npx tsx scripts/seed-partner-school.ts \
 *     --slug=riverside-high-school --name="Riverside High School" \
 *     [--term=2027] [--programs=slug-a,slug-b] [--district="Austin ISD"] \
 *     [--referral-code=rhs2027] [--force]
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { PROGRAMS } from '../lib/content/programs';
import { getDefaultOrganizationId } from '../lib/tenant/organization';

const prisma = new PrismaClient();

/** Owned by scripts/create-chs-partner.ts — refuse to clobber it by accident. */
const PROTECTED_SLUGS = new Set(['concordia-high-school']);

/** The CHS launch five, reused as the default catalog for new schools. */
const DEFAULT_PROGRAM_SLUGS = [
  'it-support-professional-certificate-ibm',
  'cybersecurity-professional-certificate-google',
  'data-analytics-professional-certificate-google',
  'project-management-professional-certificate-microsoft',
  'ux-design-professional-certificate-google',
];

const DEFAULT_SLUG = 'demo-partner-high-school';
const DEFAULT_TERM = '2026';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const raw of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (!match) continue;
    args[match[1]] = match[2] ?? 'true';
  }
  return args;
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The sponsorship window. A term label of '2026' (or anything starting with a
 * four-digit year) yields that whole calendar year; otherwise we fall back to
 * the current year so the record is never left with a nonsensical window.
 */
function sponsorshipWindow(termLabel: string): { startsAt: Date; endsAt: Date } {
  const parsedYear = Number(/^(\d{4})/.exec(termLabel)?.[1]);
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  return {
    startsAt: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    endsAt: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const slug = args.slug ?? DEFAULT_SLUG;
  if (PROTECTED_SLUGS.has(slug) && args.force !== 'true') {
    console.error(
      `ERROR: '${slug}' is owned by scripts/create-chs-partner.ts (production row).\n` +
        'This helper is for dev/demo and future schools. Re-run with --force only if you ' +
        'genuinely intend to overwrite the sponsorship fields on that partner.'
    );
    process.exitCode = 1;
    return;
  }

  const name = args.name ?? titleCaseFromSlug(slug);
  const termLabel = args.term ?? DEFAULT_TERM;
  const { startsAt, endsAt } = sponsorshipWindow(termLabel);
  const referralCode = args['referral-code'] ?? slug;

  const programSlugs = (args.programs ? args.programs.split(',') : DEFAULT_PROGRAM_SLUGS)
    .map((s) => s.trim())
    .filter(Boolean);

  if (programSlugs.length === 0) {
    console.error('ERROR: --programs was provided but contained no usable slugs.');
    process.exitCode = 1;
    return;
  }

  // programSlug has no FK (programs live in code), so validate here instead —
  // an unknown slug would silently render nothing on the enrollment page.
  const knownSlugs = new Set(PROGRAMS.map((p) => p.slug));
  const unknown = programSlugs.filter((s) => !knownSlugs.has(s));
  if (unknown.length > 0) {
    console.warn(
      `WARNING: these slugs are not in lib/content/programs.ts and will not render: ${unknown.join(', ')}`
    );
  }

  const sponsorship = {
    sponsoredEnrollment: true,
    sponsorshipFundingSource: 'PARTNER_ORG',
    sponsorshipTermLabel: termLabel,
    sponsorshipStartsAt: startsAt,
    sponsorshipEndsAt: endsAt,
    sponsorshipNotes: `Sponsored by ${name} (${termLabel}) — no cost to students. Seeded by scripts/seed-partner-school.ts.`,
    enrollmentPageEnabled: true,
    enrollmentHeadline: `Start your career training with ${name}`,
    enrollmentBlurb: `${name} is covering the full cost of these programs for ${termLabel}. Pick a program below to get started — there is no cost to you.`,
    ...(args.district ? { schoolDistrict: args.district } : {}),
  } satisfies Partial<Prisma.PartnerUncheckedCreateInput>;

  const organizationId = await getDefaultOrganizationId();

  const partner = await prisma.partner.upsert({
    where: { slug },
    create: {
      organizationId,
      name,
      slug,
      referralCode,
      partnerType: 'high_school',
      status: 'active',
      active: true,
      ...sponsorship,
    },
    update: sponsorship,
  });

  console.log(
    `PARTNER "${partner.name}" — id=${partner.id}, slug=${partner.slug}, ` +
      `term=${partner.sponsorshipTermLabel}, enrollmentPageEnabled=${partner.enrollmentPageEnabled}`
  );

  // Replace the curated catalog: upsert the requested rows (so display order
  // and featured flags converge on re-run), then drop anything left over from
  // a previous run with a different program list.
  for (const [index, programSlug] of programSlugs.entries()) {
    await prisma.partnerProgramCatalog.upsert({
      where: { partnerId_programSlug: { partnerId: partner.id, programSlug } },
      create: {
        partnerId: partner.id,
        programSlug,
        displayOrder: index,
        featured: index === 0,
      },
      update: { displayOrder: index, featured: index === 0 },
    });
  }

  const removed = await prisma.partnerProgramCatalog.deleteMany({
    where: { partnerId: partner.id, programSlug: { notIn: programSlugs } },
  });

  console.log(
    `CATALOG ${programSlugs.length} program(s) set${removed.count > 0 ? `, ${removed.count} stale row(s) removed` : ''}: ${programSlugs.join(', ')}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
