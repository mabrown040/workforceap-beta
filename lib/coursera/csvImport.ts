/**
 * Coursera "Learner activity & progress" CSV import.
 *
 * Pure parsing helpers + a server-only ingester. The parser exports here are
 * intentionally free of `server-only` / Prisma so they can be exercised by
 * `node --import tsx --test` without spinning up a database.
 *
 * The ingester (which DOES need Prisma + the runtime DDL helpers) is split off
 * into `csvImport.server.ts` and is the entry point used by the admin route.
 */

const REQUIRED_HEADERS = [
  'Name',
  'Email',
  'Course',
  'Course ID',
  'Course Slug',
  'Overall Progress',
  'Total Estimated Learning Hours (since enrolled)',
  'Completed',
  'Removed From Program',
  'Program Slug',
] as const;

export type ParsedCourseActivityRow = {
  name: string;
  email: string;
  externalId: string | null;
  course: string;
  courseId: string;
  courseSlug: string | null;
  university: string | null;
  enrollmentTime: Date | null;
  classStartTime: Date | null;
  classEndTime: Date | null;
  lastActivityTime: Date | null;
  overallProgress: number;
  totalEstimatedLearningHours: number;
  completed: boolean;
  removedFromProgram: boolean;
  programSlug: string;
  programName: string | null;
  collectionName: string | null;
  collectionId: string | null;
  completionTime: Date | null;
  courseGrade: string | null;
  courseCertificateUrl: string | null;
  contractName: string | null;
  isEnterpriseContractActive: boolean | null;
  learningHours: number;
};

export type IngestResult = {
  inserted: number;
  updated: number;
  resolvedToUsers: number;
  unresolved: number;
  errors: string[];
  unresolvedRows: Array<{ email: string; name: string; courseId: string; course: string }>;
};

/**
 * Split a single CSV line into fields. Handles double-quoted fields (with embedded
 * commas and "" escape) and unquoted fields. Whitespace inside quotes is preserved.
 *
 * Coursera's export wraps every field in double quotes, so the parser is intentionally
 * conservative — anything outside of the simple "" / quoted-field shape is treated as
 * literal text in the field.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote inside quoted field
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      fields.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  fields.push(current);
  return fields;
}

/**
 * Tokenize the full CSV content into rows. Splits on newlines, but only when not
 * inside a quoted field — Coursera occasionally emits embedded newlines in free-text
 * fields (e.g. course names with line breaks), so we cannot use a naive split.
 */
function splitCsvRows(content: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;

  // Strip BOM if present
  const text = content.replace(/^﻿/, '');

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      // Treat \r\n as a single newline
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (current.length > 0) {
        rows.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) rows.push(current);
  return rows;
}

function parseDateOrNull(value: string | undefined | null): Date | null {
  const v = value?.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseYesNo(value: string | undefined | null): boolean {
  return (value ?? '').trim().toLowerCase() === 'yes';
}

function parseYesNoNullable(value: string | undefined | null): boolean | null {
  const trimmed = (value ?? '').trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'yes') return true;
  if (trimmed === 'no') return false;
  return null;
}

function parseNumberOrZero(value: string | undefined | null): number {
  const v = (value ?? '').trim();
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nullable(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/**
 * Parse the Coursera CourseActivity CSV into structured rows.
 *
 * Throws if required headers are missing — a sentinel against accidentally feeding
 * a different tab from the same enterprise export ZIP.
 */
export function parseCourseActivityCsv(content: string): ParsedCourseActivityRow[] {
  const lines = splitCsvRows(content);
  if (lines.length < 1) return [];

  const header = splitCsvLine(lines[0]).map((field) => field.trim());

  for (const required of REQUIRED_HEADERS) {
    if (!header.includes(required)) {
      throw new Error(
        `Coursera CourseActivity CSV is missing required header "${required}". ` +
          `Did you upload the wrong tab? Expected the "CourseActivity" CSV from the enterprise export.`
      );
    }
  }

  const indexOf = (col: string) => header.indexOf(col);
  const idx = {
    name: indexOf('Name'),
    email: indexOf('Email'),
    externalId: indexOf('External ID'),
    course: indexOf('Course'),
    courseId: indexOf('Course ID'),
    courseSlug: indexOf('Course Slug'),
    university: indexOf('University'),
    enrollmentTime: indexOf('Enrollment Time'),
    classStartTime: indexOf('Class Start Time'),
    classEndTime: indexOf('Class End Time'),
    lastActivityTime: indexOf('Last Course Activity Time'),
    overallProgress: indexOf('Overall Progress'),
    totalEstimatedLearningHours: indexOf('Total Estimated Learning Hours (since enrolled)'),
    completed: indexOf('Completed'),
    removedFromProgram: indexOf('Removed From Program'),
    programSlug: indexOf('Program Slug'),
    programName: indexOf('Program Name'),
    collectionName: indexOf('Collection Name'),
    collectionId: indexOf('Collection ID'),
    completionTime: indexOf('Completion Time'),
    courseGrade: indexOf('Course Grade'),
    courseCertificateUrl: indexOf('Course Certificate URL'),
    contractName: indexOf('Contract'),
    isEnterpriseContractActive: indexOf('Is Enterprise Contract Active'),
    learningHours: indexOf('Learning Hours'),
  };

  const rows: ParsedCourseActivityRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const fields = splitCsvLine(raw);

    const email = (fields[idx.email] ?? '').trim();
    const courseId = (fields[idx.courseId] ?? '').trim();
    const programSlug = (fields[idx.programSlug] ?? '').trim();

    // Skip rows missing the absolute minimum identifiers — without these we
    // cannot upsert deterministically and would just generate noise.
    if (!email || !courseId || !programSlug) continue;

    rows.push({
      name: (fields[idx.name] ?? '').trim(),
      email,
      externalId: nullable(fields[idx.externalId]),
      course: (fields[idx.course] ?? '').trim(),
      courseId,
      courseSlug: nullable(fields[idx.courseSlug]),
      university: nullable(fields[idx.university]),
      enrollmentTime: parseDateOrNull(fields[idx.enrollmentTime]),
      classStartTime: parseDateOrNull(fields[idx.classStartTime]),
      classEndTime: parseDateOrNull(fields[idx.classEndTime]),
      lastActivityTime: parseDateOrNull(fields[idx.lastActivityTime]),
      overallProgress: parseNumberOrZero(fields[idx.overallProgress]),
      totalEstimatedLearningHours: parseNumberOrZero(fields[idx.totalEstimatedLearningHours]),
      completed: parseYesNo(fields[idx.completed]),
      removedFromProgram: parseYesNo(fields[idx.removedFromProgram]),
      programSlug,
      programName: nullable(fields[idx.programName]),
      collectionName: nullable(fields[idx.collectionName]),
      collectionId: nullable(fields[idx.collectionId]),
      completionTime: parseDateOrNull(fields[idx.completionTime]),
      courseGrade: nullable(fields[idx.courseGrade]),
      courseCertificateUrl: nullable(fields[idx.courseCertificateUrl]),
      contractName: nullable(fields[idx.contractName]),
      isEnterpriseContractActive: parseYesNoNullable(fields[idx.isEnterpriseContractActive]),
      learningHours: parseNumberOrZero(fields[idx.learningHours]),
    });
  }

  return rows;
}

// Re-export the server-only ingester so callers can import everything from one file.
// The server module is lazy-loaded via dynamic import to keep this file safe to
// pull in from non-server contexts (e.g. unit tests, future client utilities).
export async function ingestCourseActivityRows(
  rows: ParsedCourseActivityRow[],
  options?: { source?: string }
): Promise<IngestResult> {
  const mod = await import('./csvImport.server');
  return mod.ingestCourseActivityRows(rows, options);
}
