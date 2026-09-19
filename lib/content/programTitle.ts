/**
 * Human-readable program title for staff surfaces.
 *
 * Stored program keys arrive in three shapes: a canonical catalog slug, a
 * legacy alias (`ai-professional-developer-certificate-ibm`), or a seed/import
 * slug the catalog has never known (`cybersecurity-google`). Every staff view
 * that prints a program should go through here so an alias resolves to the
 * catalog title exactly as the member dashboard shows it, and an unknown slug
 * reads as words rather than a raw hyphenated key.
 *
 * This does not change which slug is canonical — `canonicalizeProgramSlug`
 * already encodes the alias table (including IBM → AWS); it only decides what
 * to print.
 */
import { getProgramBySlug } from './programs';
import { canonicalizeProgramSlug } from './programSlug';

/** Vendor/acronym words that title-casing would otherwise mangle. */
const SLUG_WORD_OVERRIDES: Readonly<Record<string, string>> = {
  ai: 'AI',
  aws: 'AWS',
  ibm: 'IBM',
  it: 'IT',
  ux: 'UX',
  clt: 'CLT',
  cpt: 'CPT',
  dba: 'DBA',
  osha: 'OSHA',
  mchit: 'MCHIT',
  comptia: 'CompTIA',
  and: 'and',
  with: 'with',
  of: 'of',
  for: 'for',
  in: 'in',
  to: 'to',
};

/** `cybersecurity-google` → `Cybersecurity Google`; never returns an empty string for a non-empty slug. */
export function humanizeProgramSlug(slug: string): string {
  const words = slug
    .trim()
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean);
  if (words.length === 0) return slug.trim();
  return words
    .map((word, index) => {
      const override = SLUG_WORD_OVERRIDES[word];
      if (override) return index === 0 ? override.charAt(0).toUpperCase() + override.slice(1) : override;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Catalog title for a stored program key, falling back to a humanised slug.
 * Aliases are canonicalized first so a legacy key shows the current program's
 * title (the same title the member dashboard renders for that learner).
 */
export function programDisplayTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const program = getProgramBySlug(canonicalizeProgramSlug(trimmed)) ?? getProgramBySlug(trimmed);
  if (program) return program.title;
  return humanizeProgramSlug(trimmed);
}
