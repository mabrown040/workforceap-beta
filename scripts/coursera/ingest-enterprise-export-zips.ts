/**
 * Unpack Coursera enterprise export ZIPs and route CSVs through existing
 * product pipelines:
 *
 *   - CurriculumReport / CuratedCollections-*.csv
 *       → `pnpm coursera:generate-curated-collections`
 *       → optional `sync-discovered-from-curated --write`
 *   - LearnerActivity ZIP → CourseActivity / LearningPathActivity CSVs
 *       → `parseCourseActivityCsv` / `parseLearningPathActivityCsv`
 *       → with `--ingest` (requires DB + org): `ingestCourseActivityRows` /
 *         `ingestLearningPathActivityRows` (same as `/api/admin/coursera/csv-import`)
 *   - LearnerPerformance / gradebook ZIPs
 *       → inventory only today (no CSV importer; gradebook is B4B API via
 *         `syncUserFromB4B` / `getCourseGradebookReports`)
 *
 * Usage:
 *   pnpm exec tsx scripts/coursera/ingest-enterprise-export-zips.ts \
 *     --out /tmp/coursera-exports \
 *     --zip path/to/CurriculumReport_....zip \
 *     --zip path/to/LearnerActivity_....zip
 *
 *   # Also write DB rows (needs DATABASE_URL / .env and --org-id):
 *   pnpm exec tsx scripts/coursera/ingest-enterprise-export-zips.ts \
 *     --out /tmp/coursera-exports --ingest --org-id <cuid> --zip ...
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import {
  detectCourseraCsvKind,
  parseCourseActivityCsv,
  parseLearningPathActivityCsv,
} from '@/lib/coursera/csvImport';

type ZipPlan = {
  zipPath: string;
  extractDir: string;
  files: string[];
};

function readArgs(): { zips: string[]; outDir: string; ingest: boolean; orgId: string | null } {
  const zips: string[] = [];
  let outDir = resolve('tmp/coursera-enterprise-exports');
  let ingest = false;
  let orgId: string | null = null;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--zip') {
      zips.push(resolve(process.argv[++i] ?? ''));
    } else if (arg === '--out') {
      outDir = resolve(process.argv[++i] ?? outDir);
    } else if (arg === '--ingest') {
      ingest = true;
    } else if (arg === '--org-id') {
      orgId = process.argv[++i]?.trim() || null;
    }
  }
  return { zips: zips.filter(Boolean), outDir, ingest, orgId };
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function unzip(zipPath: string, dest: string): string[] {
  mkdirSync(dest, { recursive: true });
  const result = spawnSync('unzip', ['-o', '-q', zipPath, '-d', dest], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`unzip failed for ${zipPath}: ${result.stderr || result.stdout || result.status}`);
  }
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dest);
  return files;
}

function classifyCsv(path: string): string {
  const base = basename(path).toLowerCase().replace(/\s+/g, '');
  if (base.startsWith('curatedcollections') || base.startsWith('curatedcurriculum')) {
    return 'curated-collections';
  }
  if (base.includes('courseactivity') || base.startsWith('courseactivity')) {
    return 'course-activity';
  }
  if (base.includes('learningpathactivity') || base.includes('specialisationactivity')) {
    return 'learning-path-activity';
  }
  if (base.includes('programactivity')) return 'program-activity-ignored';
  if (base.includes('activityby')) return 'aggregate-ignored';
  if (base.includes('gradebook') || base.includes('learnerperformance') || base.includes('plagiarism')) {
    return 'performance-or-gradebook';
  }
  // Enterprise "attempts gradebook" export often ships as "<Program Name>.csv"
  if (base.endsWith('.csv') && !base.includes('activity')) {
    return 'performance-or-gradebook';
  }
  return 'unknown';
}

async function maybeIngest(args: {
  kind: 'course-activity' | 'learning-path-activity';
  content: string;
  organizationId: string;
}): Promise<unknown> {
  const { ingestCourseActivityRows, ingestLearningPathActivityRows } = await import(
    '@/lib/coursera/csvImport.server'
  );
  if (args.kind === 'course-activity') {
    const rows = parseCourseActivityCsv(args.content);
    return ingestCourseActivityRows(rows, { source: 'csv_import', organizationId: args.organizationId });
  }
  const rows = parseLearningPathActivityCsv(args.content);
  return ingestLearningPathActivityRows(rows, { source: 'csv_import', organizationId: args.organizationId });
}

async function main(): Promise<void> {
  const { zips, outDir, ingest, orgId } = readArgs();
  if (zips.length === 0) {
    throw new Error(
      'Usage: tsx scripts/coursera/ingest-enterprise-export-zips.ts --out <dir> --zip <file> [--zip <file>...] [--ingest --org-id <id>]',
    );
  }
  for (const zip of zips) {
    if (!existsSync(zip)) throw new Error(`ZIP not found: ${zip}`);
  }
  if (ingest && !orgId) {
    throw new Error('--ingest requires --org-id <organization cuid>');
  }

  mkdirSync(outDir, { recursive: true });
  const report: Record<string, unknown> = {
    outDir,
    ingest,
    orgId,
    zips: [] as unknown[],
    actions: [] as unknown[],
    blockers: [] as string[],
  };

  const plans: ZipPlan[] = [];
  for (const zipPath of zips) {
    const extractDir = join(outDir, basename(zipPath, '.zip'));
    const files = unzip(zipPath, extractDir);
    plans.push({ zipPath, extractDir, files });
    (report.zips as unknown[]).push({
      zipPath,
      sha256: sha256File(zipPath),
      bytes: statSync(zipPath).size,
      extractDir,
      files: files.map((f) => ({ path: f, kind: classifyCsv(f), bytes: statSync(f).size })),
    });
  }

  const allFiles = plans.flatMap((p) => p.files);

  // Curriculum → curated collections module
  const curatedCsv = allFiles.find((f) => classifyCsv(f) === 'curated-collections');
  if (curatedCsv) {
    const gen = spawnSync(
      'pnpm',
      ['coursera:generate-curated-collections', '--', '--csv', curatedCsv],
      { encoding: 'utf8', cwd: resolve('.') },
    );
    (report.actions as unknown[]).push({
      action: 'generate-curated-collections',
      csv: curatedCsv,
      status: gen.status,
      stdout: gen.stdout?.trim(),
      stderr: gen.stderr?.trim(),
    });
    if (gen.status === 0) {
      const sync = spawnSync('pnpm', ['exec', 'tsx', 'scripts/coursera/sync-discovered-from-curated.ts', '--write'], {
        encoding: 'utf8',
        cwd: resolve('.'),
      });
      (report.actions as unknown[]).push({
        action: 'sync-discovered-from-curated',
        status: sync.status,
        stdout: sync.stdout?.trim(),
        stderr: sync.stderr?.trim(),
      });
    }
  } else {
    (report.blockers as string[]).push(
      'No CuratedCollections-*.csv found in ZIPs (CurriculumReport may use a different layout).',
    );
  }

  // Learner activity CSVs → parse (+ optional DB ingest)
  for (const file of allFiles) {
    if (!file.toLowerCase().endsWith('.csv')) continue;
    const kindGuess = classifyCsv(file);
    if (kindGuess !== 'course-activity' && kindGuess !== 'learning-path-activity') {
      if (kindGuess === 'performance-or-gradebook') {
        (report.actions as unknown[]).push({
          action: 'inventory-only',
          file,
          note:
            'LearnerPerformance / gradebook CSV has no admin importer yet. Use B4B syncUserFromB4B / enrollmentReports + courseGradebookReports.',
        });
      }
      continue;
    }
    const content = readFileSync(file, 'utf8');
    const kind = detectCourseraCsvKind(content);
    if (!kind) {
      (report.actions as unknown[]).push({
        action: 'detect-failed',
        file,
        error: 'CSV headers did not match CourseActivity or LearningPathActivity',
      });
      continue;
    }
    try {
      if (kind === 'course-activity') {
        const rows = parseCourseActivityCsv(content);
        const summary: Record<string, unknown> = {
          action: 'parse-course-activity',
          file,
          parsed: rows.length,
        };
        if (ingest && orgId) {
          summary.ingest = await maybeIngest({ kind, content, organizationId: orgId });
        }
        (report.actions as unknown[]).push(summary);
      } else {
        const rows = parseLearningPathActivityCsv(content);
        const summary: Record<string, unknown> = {
          action: 'parse-learning-path-activity',
          file,
          parsed: rows.length,
        };
        if (ingest && orgId) {
          summary.ingest = await maybeIngest({ kind, content, organizationId: orgId });
        }
        (report.actions as unknown[]).push(summary);
      }
    } catch (error) {
      (report.actions as unknown[]).push({
        action: 'parse-error',
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const reportPath = join(outDir, 'ingest-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, reportPath, actions: (report.actions as unknown[]).length, blockers: report.blockers }, null, 2));
}

main().catch((error) => {
  console.error(`[ingest-enterprise-export-zips] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
