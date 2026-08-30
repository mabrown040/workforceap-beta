import { listContents } from '@/lib/coursera/b4bClient';
import { APPROVED_PROGRAM_CURRICULA } from '@/lib/content/programCurriculumManifest';
import {
  drainB4BValidationPages,
  validateApprovedCurriculumCatalog,
} from '@/lib/coursera/validateApprovedCurriculumTrack';
import { loadEnvFile } from 'node:process';

function readArg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() ?? '' : '';
}

async function main() {
  const envFile = readArg('--env-file');
  if (envFile) loadEnvFile(envFile);
  const requestedProgram = readArg('--program');
  const programSlugs = requestedProgram
    ? [requestedProgram]
    : APPROVED_PROGRAM_CURRICULA.map((manifest) => manifest.programSlug);
  const snapshot = await drainB4BValidationPages(
    ({ start, limit }) => listContents({ start, limit }),
  );
  const validations = programSlugs.map((programSlug) =>
    validateApprovedCurriculumCatalog({
      programSlug,
      providerContents: snapshot.elements,
    }),
  );

  process.stdout.write(`${JSON.stringify({
    pagesFetched: snapshot.pagesFetched,
    providerContentCount: snapshot.elements.length,
    validations,
  }, null, 2)}\n`);
  if (validations.some((validation) => !validation.exactMappingValid)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
