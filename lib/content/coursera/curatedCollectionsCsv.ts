/**
 * Parser and code generator for Coursera's **Curriculum download**
 * (`CuratedCollections-<programId>-<exportedAtMs>.csv`), the admin-UI export
 * that lists every curated collection (Learning Path) in the org's B4B program
 * together with its ordered courses.
 *
 * The enrollment feed only ever names a collection *per learner row*; this
 * export is the one place Coursera states, for the whole org, which collection
 * ids exist and which courses each one contains. It is therefore the authority
 * for collection ids and course membership in `learningPaths.ts`, and it is
 * what `curatedCollections.generated.ts` is built from.
 *
 * Pure: no filesystem, no Prisma, so `node --test` can import it directly.
 */

export type CuratedCourse = {
  /** 22-character Coursera course id, as `Item ID` reports it. */
  courseId: string;
  slug: string;
  name: string;
  partner: string;
  /** `Duration` column, in hours; null when Coursera leaves it blank. */
  durationHours: number | null;
  /** Coursera specialization ids the course also belongs to; often empty. */
  specializationIds: readonly string[];
};

export type CuratedCollection = {
  /** Short opaque collection id, the same token enrollment rows carry as `collectionId`. */
  collectionId: string;
  /** Display name exactly as Coursera exports it (trimmed). */
  name: string;
  /** Courses in Coursera's curated order. */
  courses: readonly CuratedCourse[];
};

export type CuratedCollectionsSource = {
  /** 22-character id of the org's B4B program, from the export file name. */
  programId: string | null;
  fileName: string;
  sha256: string;
  /** Export time from the file name's millisecond timestamp, ISO 8601. */
  exportedAt: string | null;
  courseRows: number;
  /** Rows whose `Item Type` was not `COURSE`; kept out of the data. */
  skippedRows: number;
};

export type CuratedCollectionsExport = CuratedCollectionsSource & {
  collections: readonly CuratedCollection[];
};

const REQUIRED_COLUMNS = [
  'Collection ID',
  'Collection Name',
  'Item Type',
  'Item ID',
  'Item Name',
  'Item Slug',
  'Partner Name',
] as const;

export const CURATED_COURSE_ID = /^[A-Za-z0-9_-]{22}$/;
const EXPORT_FILE_NAME = /^CuratedCollections-([A-Za-z0-9_-]{22})-(\d{13})\.csv$/;

/**
 * Minimal RFC 4180 reader: quoted fields, doubled quotes, embedded newlines,
 * CRLF or LF row ends, optional UTF-8 BOM. Blank lines are dropped.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ',') {
      endField();
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] !== '\n') endRow();
      continue;
    }
    if (ch === '\n') {
      endRow();
      continue;
    }
    field += ch;
  }
  if (quoted) throw new Error('CSV ends inside a quoted field');
  if (field.length > 0 || row.length > 0) endRow();

  return rows.filter((cells) => !(cells.length === 1 && cells[0] === ''));
}

export function parseExportFileName(fileName: string): { programId: string; exportedAt: string } | null {
  const match = EXPORT_FILE_NAME.exec(fileName.trim());
  if (!match) return null;
  return { programId: match[1], exportedAt: new Date(Number(match[2])).toISOString() };
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Turn the export into collections in Coursera's order. Throws on anything
 * that would silently corrupt attribution: a missing column, a non-22-char
 * course id, one collection id with two names, or a course listed twice in
 * the same collection. Non-course items are counted and skipped.
 */
export function parseCuratedCollectionsCsv(
  csvText: string,
  source: { fileName: string; sha256: string },
): CuratedCollectionsExport {
  const rows = parseCsv(csvText);
  if (rows.length === 0) throw new Error('Curriculum download is empty');
  const header = rows[0].map((cell) => cell.trim());
  const column = new Map(header.map((name, index) => [name, index]));
  const missing = REQUIRED_COLUMNS.filter((name) => !column.has(name));
  if (missing.length > 0) {
    throw new Error(`Curriculum download is missing column(s): ${missing.join(', ')}`);
  }
  const cell = (row: string[], name: string): string => row[column.get(name) as number]?.trim() ?? '';

  const collections = new Map<string, { collectionId: string; name: string; courses: CuratedCourse[] }>();
  let courseRows = 0;
  let skippedRows = 0;

  for (const [offset, row] of rows.slice(1).entries()) {
    const line = offset + 2;
    const itemType = cell(row, 'Item Type').toUpperCase();
    if (itemType !== 'COURSE') {
      skippedRows += 1;
      continue;
    }
    const collectionId = cell(row, 'Collection ID');
    const collectionName = cell(row, 'Collection Name');
    const courseId = cell(row, 'Item ID');
    if (!collectionId) throw new Error(`line ${line}: empty Collection ID`);
    if (!collectionName) throw new Error(`line ${line}: empty Collection Name for ${collectionId}`);
    if (!CURATED_COURSE_ID.test(courseId)) {
      throw new Error(`line ${line}: "${courseId}" is not a 22-character Coursera course id`);
    }

    const existing = collections.get(collectionId);
    if (existing && existing.name !== collectionName) {
      throw new Error(
        `line ${line}: collection ${collectionId} is named "${collectionName}" here but "${existing.name}" earlier`,
      );
    }
    const collection = existing ?? { collectionId, name: collectionName, courses: [] };
    if (!existing) collections.set(collectionId, collection);
    if (collection.courses.some((course) => course.courseId === courseId)) {
      throw new Error(`line ${line}: course ${courseId} is listed twice in collection ${collectionId}`);
    }

    const duration = Number(cell(row, 'Duration'));
    collection.courses.push({
      courseId,
      slug: cell(row, 'Item Slug'),
      name: cell(row, 'Item Name'),
      partner: cell(row, 'Partner Name'),
      durationHours: cell(row, 'Duration') !== '' && Number.isFinite(duration) ? duration : null,
      specializationIds: splitList(row[column.get('Part Of Specialization ID') ?? -1]),
    });
    courseRows += 1;
  }

  const fileMeta = parseExportFileName(source.fileName);
  return {
    programId: fileMeta?.programId ?? null,
    fileName: source.fileName,
    sha256: source.sha256,
    exportedAt: fileMeta?.exportedAt ?? null,
    courseRows,
    skippedRows,
    collections: [...collections.values()].map((collection) => ({
      ...collection,
      courses: [...collection.courses],
    })),
  };
}

function ts(value: string | number | null | readonly string[]): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => ts(item)).join(', ')}]`;
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

export const GENERATED_MODULE_PATH = 'lib/content/coursera/curatedCollections.generated.ts';

/** Render the export as the TypeScript module `curatedCollections.generated.ts`. Deterministic. */
export function serializeCuratedCollectionsModule(data: CuratedCollectionsExport): string {
  const lines: string[] = [];
  lines.push('// GENERATED by scripts/coursera/generate-curated-collections.ts — do not edit by hand.');
  lines.push(`// Source: ${data.fileName} (Coursera admin UI → Curriculum download), sha256 ${data.sha256}.`);
  lines.push(
    `// Exported ${data.exportedAt ?? 'unknown'}; ${data.courseRows} course rows across ${data.collections.length} collections` +
      (data.skippedRows ? `; ${data.skippedRows} non-course row(s) skipped.` : '.'),
  );
  lines.push('// Regenerate: pnpm coursera:generate-curated-collections -- --csv <path to CuratedCollections-*.csv>');
  lines.push("import type { CuratedCollection, CuratedCollectionsSource } from './curatedCollectionsCsv';");
  lines.push('');
  lines.push('export const CURATED_COLLECTIONS_SOURCE: CuratedCollectionsSource = Object.freeze({');
  lines.push(`  programId: ${ts(data.programId)},`);
  lines.push(`  fileName: ${ts(data.fileName)},`);
  lines.push(`  sha256: ${ts(data.sha256)},`);
  lines.push(`  exportedAt: ${ts(data.exportedAt)},`);
  lines.push(`  courseRows: ${data.courseRows},`);
  lines.push(`  skippedRows: ${data.skippedRows},`);
  lines.push('});');
  lines.push('');
  lines.push('export const CURATED_COLLECTIONS: readonly CuratedCollection[] = Object.freeze([');
  for (const collection of data.collections) {
    lines.push('  {');
    lines.push(`    collectionId: ${ts(collection.collectionId)},`);
    lines.push(`    name: ${ts(collection.name)},`);
    lines.push('    courses: [');
    for (const course of collection.courses) {
      lines.push(
        `      { courseId: ${ts(course.courseId)}, slug: ${ts(course.slug)}, name: ${ts(course.name)}, partner: ${ts(course.partner)}, durationHours: ${ts(course.durationHours)}, specializationIds: ${ts(course.specializationIds)} },`,
      );
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push(']);');
  lines.push('');
  return lines.join('\n');
}
