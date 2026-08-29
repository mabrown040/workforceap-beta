/**
 * Legacy/discovered program slugs that must collapse onto one canonical WAP
 * catalog key before any progress write or join. Keep this module dependency
 * free so ingestion code can canonicalize without importing the full catalog.
 */
export const PROGRAM_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'ai-practitioner-professional-certificate': 'ai-practitioner-professional-certificate-aws',
  'ai-professional-practitioner-certificate': 'ai-practitioner-professional-certificate-aws',
  'ai-professional-developer-certificate-ibm': 'ai-practitioner-professional-certificate-aws',
  'ai-and-software-development-professional-certificate-ibm':
    'software-developer-professional-certificate-ibm',
  'construction-readiness-certificate-osha-10': 'core-construction-training-certificate',
  'logistics-and-supply-chain-certificate-clt': 'certified-logistics-technician-clt',
  'production-technology-certificate-cpt': 'certified-production-technician-cpt',
  'medical-billing-coding-and-health-information-technology':
    'health-information-technology-mchit',
  'medical-billing-and-coding-certificate': 'health-information-technology-mchit',
  'it-automation-with-python-professional-certificate-google':
    'it-automation-with-python-google',
  'comptia-a-plus': 'comptia-a-professional-certificate',
  'management-and-data-analyst-professional-certificate-google-ibm':
    'data-analytics-professional-certificate-google',
  'data-science-and-database-administrator-dba-professional-certificate-ibm':
    'data-science-professional-certificate-ibm',
};

const PROGRAM_SLUG_ALIASES_BY_CANONICAL = Object.freeze(
  Object.entries(PROGRAM_SLUG_ALIASES).reduce<Record<string, string[]>>(
    (byCanonical, [alias, canonical]) => {
      (byCanonical[canonical] ??= []).push(alias);
      return byCanonical;
    },
    {},
  ),
);

export function canonicalizeProgramSlug(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  return PROGRAM_SLUG_ALIASES[normalized] ?? normalized;
}

export function programSlugsEquivalent(a: string, b: string): boolean {
  return canonicalizeProgramSlug(a) === canonicalizeProgramSlug(b);
}

/**
 * Return every stored program key that can represent the same WAP program.
 *
 * Canonicalization alone is sufficient for writes, but existing databases may
 * still contain legacy aliases until the explicit backfill is approved. Read
 * queries therefore need the reverse edge too: a canonical input must expand
 * to all aliases that collapse onto it.
 */
export function programSlugReadCandidates(raw: string): string[] {
  const normalized = raw.trim().toLowerCase();
  const canonical = canonicalizeProgramSlug(normalized);
  return Array.from(
    new Set([
      canonical,
      normalized,
      ...(PROGRAM_SLUG_ALIASES_BY_CANONICAL[canonical] ?? []),
    ].filter(Boolean)),
  );
}
