import type { IpCareerRow, IpResultRow } from './interestProfiler';

const MIN_ALPHA_SEGMENT_LENGTH = 3;

type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

const AREA_TO_CODE: Record<string, RiasecCode> = {
  realistic: 'R',
  investigative: 'I',
  artistic: 'A',
  social: 'S',
  enterprising: 'E',
  conventional: 'C',
};

export const CURATED_RIASEC_CAREERS: Record<RiasecCode, IpCareerRow[]> = {
  R: [
    { code: '49-9071.00', title: 'Maintenance and Repair Workers, General' },
    { code: '47-2031.00', title: 'Carpenters' },
    { code: '49-3023.00', title: 'Automotive Service Technicians and Mechanics' },
    { code: '29-2056.00', title: 'Veterinary Technologists and Technicians' },
    { code: '17-3027.00', title: 'Mechanical Engineering Technologists and Technicians' },
    { code: '47-2111.00', title: 'Electricians' },
    { code: '49-9041.00', title: 'Industrial Machinery Mechanics' },
    { code: '53-3032.00', title: 'Heavy and Tractor-Trailer Truck Drivers' },
    { code: '51-4121.00', title: 'Welders, Cutters, Solderers, and Brazers' },
    { code: '33-3051.00', title: 'Police and Sheriff’s Patrol Officers' },
  ],
  I: [
    { code: '15-1252.00', title: 'Software Developers' },
    { code: '15-1211.00', title: 'Computer Systems Analysts' },
    { code: '19-1042.00', title: 'Medical Scientists, Except Epidemiologists' },
    { code: '15-1253.00', title: 'Software Quality Assurance Analysts and Testers' },
    { code: '19-1029.00', title: 'Biological Scientists, All Other' },
    { code: '15-2051.00', title: 'Data Scientists' },
    { code: '29-2011.00', title: 'Medical and Clinical Laboratory Technologists' },
    { code: '13-1161.00', title: 'Market Research Analysts and Marketing Specialists' },
    { code: '19-4092.00', title: 'Forensic Science Technicians' },
    { code: '15-1299.08', title: 'Computer Systems Engineers/Architects' },
  ],
  A: [
    { code: '27-1024.00', title: 'Graphic Designers' },
    { code: '27-1014.00', title: 'Special Effects Artists and Animators' },
    { code: '27-3043.00', title: 'Writers and Authors' },
    { code: '27-1025.00', title: 'Interior Designers' },
    { code: '27-2012.00', title: 'Producers and Directors' },
    { code: '27-3031.00', title: 'Public Relations Specialists' },
    { code: '27-4021.00', title: 'Photographers' },
    { code: '27-1021.00', title: 'Commercial and Industrial Designers' },
    { code: '27-1013.00', title: 'Fine Artists, Including Painters, Sculptors, and Illustrators' },
    { code: '27-3042.00', title: 'Technical Writers' },
  ],
  S: [
    { code: '21-1012.00', title: 'Educational, Guidance, and Career Counselors and Advisors' },
    { code: '29-1141.00', title: 'Registered Nurses' },
    { code: '21-1093.00', title: 'Social and Human Service Assistants' },
    { code: '25-2021.00', title: 'Elementary School Teachers, Except Special Education' },
    { code: '21-1021.00', title: 'Child, Family, and School Social Workers' },
    { code: '31-1120.00', title: 'Home Health and Personal Care Aides' },
    { code: '29-2052.00', title: 'Pharmacy Technicians' },
    { code: '25-9045.00', title: 'Teaching Assistants, Except Postsecondary' },
    { code: '21-1018.00', title: 'Substance Abuse, Behavioral Disorder, and Mental Health Counselors' },
    { code: '39-9032.00', title: 'Recreation Workers' },
  ],
  E: [
    { code: '41-4012.00', title: 'Sales Representatives, Wholesale and Manufacturing, Except Technical and Scientific Products' },
    { code: '11-1021.00', title: 'General and Operations Managers' },
    { code: '13-1161.00', title: 'Market Research Analysts and Marketing Specialists' },
    { code: '11-2022.00', title: 'Sales Managers' },
    { code: '13-1111.00', title: 'Management Analysts' },
    { code: '11-9111.00', title: 'Medical and Health Services Managers' },
    { code: '13-1071.00', title: 'Human Resources Specialists' },
    { code: '11-3031.00', title: 'Financial Managers' },
    { code: '41-1011.00', title: 'First-Line Supervisors of Retail Sales Workers' },
    { code: '11-2032.00', title: 'Public Relations Managers' },
  ],
  C: [
    { code: '43-3031.00', title: 'Bookkeeping, Accounting, and Auditing Clerks' },
    { code: '13-2011.00', title: 'Accountants and Auditors' },
    { code: '43-6014.00', title: 'Secretaries and Administrative Assistants, Except Legal, Medical, and Executive' },
    { code: '43-4051.00', title: 'Customer Service Representatives' },
    { code: '15-1232.00', title: 'Computer User Support Specialists' },
    { code: '43-9061.00', title: 'Office Clerks, General' },
    { code: '29-2072.00', title: 'Medical Records Specialists' },
    { code: '43-4171.00', title: 'Receptionists and Information Clerks' },
    { code: '43-6013.00', title: 'Medical Secretaries and Administrative Assistants' },
    { code: '43-9021.00', title: 'Data Entry Keyers' },
  ],
};

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function leadingFitTier(rows: IpCareerRow[]): IpCareerRow[] {
  if (rows.length === 0) return [];
  const firstFit = rows[0]?.fit ?? '';
  const tier: IpCareerRow[] = [];
  for (const row of rows) {
    if ((row.fit ?? '') !== firstFit) break;
    tier.push(row);
  }
  return tier;
}

export function isAlphabeticalWithinFitTier(rows: IpCareerRow[], minLength = MIN_ALPHA_SEGMENT_LENGTH): boolean {
  const tier = leadingFitTier(rows);
  if (tier.length < minLength) return false;

  for (let i = 1; i < tier.length; i += 1) {
    if (tier[i - 1].title.localeCompare(tier[i].title, 'en', { sensitivity: 'base' }) >= 0) {
      return false;
    }
  }
  return true;
}

function dominantRiasecCodes(results: IpResultRow[], limit = 2): RiasecCode[] {
  return [...results]
    .sort((a, b) => b.score - a.score)
    .map((row) => AREA_TO_CODE[row.title.toLowerCase()] ?? AREA_TO_CODE[row.code.toLowerCase()])
    .filter((code): code is RiasecCode => Boolean(code))
    .filter((code, index, arr) => arr.indexOf(code) === index)
    .slice(0, limit);
}

function curatedCareersForResults(results: IpResultRow[], maxCurated: number): IpCareerRow[] {
  const seen = new Set<string>();
  const out: IpCareerRow[] = [];
  for (const code of dominantRiasecCodes(results)) {
    for (const career of CURATED_RIASEC_CAREERS[code]) {
      if (seen.has(career.code)) continue;
      seen.add(career.code);
      out.push(career);
      if (out.length >= maxCurated) return out;
    }
  }
  return out;
}

export function applyRiasecCareerFallback(
  rows: IpCareerRow[],
  results: IpResultRow[],
  opts?: { maxCurated?: number }
): IpCareerRow[] {
  if (!isAlphabeticalWithinFitTier(rows)) return rows;

  const maxCurated = opts?.maxCurated ?? 10;
  const firstFit = rows[0]?.fit ?? 'Best';
  const curated = curatedCareersForResults(results, maxCurated);
  if (curated.length === 0) return rows;

  const byCode = new Map(rows.map((row) => [row.code, row]));
  const byTitle = new Map(rows.map((row) => [normalizeTitle(row.title), row]));
  const usedCodes = new Set<string>();

  const blended: IpCareerRow[] = curated.map((career) => {
    const existing = byCode.get(career.code) ?? byTitle.get(normalizeTitle(career.title));
    const row = existing ?? career;
    usedCodes.add(row.code);
    return { ...row, fit: firstFit };
  });

  for (const row of rows) {
    if (!usedCodes.has(row.code)) blended.push(row);
  }

  return blended;
}
