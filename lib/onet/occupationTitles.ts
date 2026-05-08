/**
 * Static SOC / O*NET code → friendly role title fallback map.
 *
 * The seed file (prisma/seed-onet-career.ts) is the source of truth for the
 * occupations WorkforceAP cares about, but it only runs against the database.
 * On environments where O*NET has not been synced (or where a row is missing
 * a friendly title), the database `title` column can hold a raw SOC code like
 * `15-1252.00`. Surfacing that to members is poor UX, so this module provides
 * a small, hand-curated fallback that can be used both server- and client-side
 * without touching the network.
 *
 * Keep entries here in sync with prisma/seed-onet-career.ts. New programs
 * adding occupation mappings should add a corresponding entry below.
 */

export const ONET_CODE_PATTERN = /^\d{2}-\d{4}\.\d{2}$/;

/** Returns true when the given string looks like a raw O*NET SOC code. */
export function isRawOnetCode(value?: string | null): value is string {
  return !!value && ONET_CODE_PATTERN.test(value.trim());
}

/** Hand-curated SOC/O*NET code → human readable role title fallback. */
export const ONET_OCCUPATION_TITLE_FALLBACKS: Readonly<Record<string, string>> = {
  // IT & Support
  '15-1232.00': 'Computer User Support Specialists',
  '15-1231.00': 'Computer Network Support Specialists',
  // Security
  '15-1212.00': 'Information Security Analysts',
  // Software & Web Dev
  '15-1252.00': 'Software Developers',
  '15-1254.00': 'Web Developers',
  // Data & AI
  '15-2051.00': 'Data Scientists',
  '15-1221.00': 'Computer and Information Analysts',
  // Cloud & Network
  '15-1244.00': 'Network and Computer Systems Administrators',
  '15-1241.00': 'Computer Network Architects',
  // Design
  '15-1255.00': 'Web and Digital Interface Designers',
  // Business / Project Management
  '13-1082.00': 'Project Management Specialists',
  // Marketing
  '13-1161.00': 'Market Research Analysts and Marketing Specialists',
  '27-3043.00': 'Writers and Authors',
  // Healthcare / HIT
  '29-2072.00': 'Medical Records Specialists',
  '29-9021.00': 'Health Information Technologists and Medical Registrars',
  // Manufacturing
  '51-4041.00': 'Machinists',
  '51-9061.00': 'Inspectors, Testers, Sorters, Samplers, and Weighers',
  // Logistics
  '13-1081.00': 'Logisticians',
  '43-5071.00': 'Shipping, Receiving, and Inventory Clerks',
  // Construction
  '47-2061.00': 'Construction Laborers',
  '47-1011.00': 'First-Line Supervisors of Construction Trades and Extraction Workers',
  // General office / digital literacy
  '43-9061.00': 'Office Clerks, General',
  '43-4051.00': 'Customer Service Representatives',
  // DevOps / Automation
  '15-1299.08': 'Computer Systems Engineers/Architects',
  // Sales & Marketing
  '41-4012.00': 'Sales Representatives, Wholesale and Manufacturing',
  '41-4011.00': 'Sales Representatives, Wholesale and Manufacturing, Technical and Scientific Products',
  '11-2021.00': 'Marketing Managers',
  '11-2022.00': 'Sales Managers',
  '11-3021.00': 'Computer and Information Systems Managers',
};

/**
 * Resolve a friendly role title for a given SOC/O*NET code or candidate title.
 *
 * - If `candidateTitle` is already a non-empty, non-code string, it is returned.
 * - Otherwise, falls back to the static table by SOC code.
 * - Returns `undefined` if no friendly title is available.
 */
export function resolveOccupationTitle(
  onetCode: string | null | undefined,
  candidateTitle?: string | null
): string | undefined {
  const candidate = candidateTitle?.trim();
  if (candidate && !ONET_CODE_PATTERN.test(candidate)) {
    return candidate;
  }
  const code = onetCode?.trim();
  if (!code) return undefined;
  return ONET_OCCUPATION_TITLE_FALLBACKS[code];
}
