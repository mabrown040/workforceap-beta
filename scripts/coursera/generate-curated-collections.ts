import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import {
  GENERATED_MODULE_PATH,
  parseCuratedCollectionsCsv,
  serializeCuratedCollectionsModule,
} from '@/lib/content/coursera/curatedCollectionsCsv';

function readArg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() ?? '' : '';
}

/**
 * Render Coursera's Curriculum download (`CuratedCollections-<programId>-<ms>.csv`,
 * from the admin UI's Curriculum page) as `curatedCollections.generated.ts`.
 *
 *   pnpm coursera:generate-curated-collections -- --csv ~/Downloads/CuratedCollections-....csv
 *   pnpm coursera:generate-curated-collections -- --csv <file> --check   # exit 1 when the module is stale
 *
 * The CSV holds no learner data, so it is safe to keep alongside the module if
 * a reviewer wants the raw source; only the module is required.
 */
function main(): void {
  const csvPath = readArg('--csv');
  const outPath = readArg('--out') || GENERATED_MODULE_PATH;
  const programIdOverride = readArg('--program-id');
  const check = process.argv.includes('--check');
  if (!csvPath) {
    throw new Error(
      'Usage: tsx scripts/coursera/generate-curated-collections.ts --csv <CuratedCollections-*.csv|CuratedCurriculum*.csv> [--out <file>] [--program-id <id>] [--check]',
    );
  }

  const csvBuffer = readFileSync(resolve(csvPath));
  const sha256 = createHash('sha256').update(csvBuffer).digest('hex');
  const parsed = parseCuratedCollectionsCsv(csvBuffer.toString('utf8'), {
    fileName: basename(csvPath),
    sha256,
  });
  // Enterprise CurriculumReport ZIPs omit the program id from the file name;
  // keep the known WAP umbrella id so registry tests and operators stay aligned.
  const withProgramId = {
    ...parsed,
    programId:
      parsed.programId ??
      (programIdOverride || process.env.COURSERA_B4B_PROGRAM_ID?.trim() || 'TpIlAogTQ8-SJQKIE8PP9w'),
  };
  const source = serializeCuratedCollectionsModule(withProgramId);
  const target = resolve(outPath);

  if (check) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== source) {
      console.error(`[generate-curated-collections] ${outPath} is stale; regenerate it from ${basename(csvPath)}.`);
      process.exitCode = 1;
      return;
    }
    console.log(`[generate-curated-collections] ${outPath} matches ${basename(csvPath)} (sha256 ${sha256}).`);
    return;
  }

  writeFileSync(target, source);
  console.log(
    JSON.stringify({
      out: outPath,
      programId: withProgramId.programId,
      exportedAt: withProgramId.exportedAt,
      collections: withProgramId.collections.length,
      courseRows: withProgramId.courseRows,
      skippedRows: withProgramId.skippedRows,
      sha256,
    }),
  );
}

try {
  main();
} catch (error) {
  console.error(`[generate-curated-collections] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
