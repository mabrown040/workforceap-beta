import { listPrograms, type B4BContent } from '@/lib/coursera/b4bClient';
import { validateApprovedCurriculumTrack } from '@/lib/coursera/validateApprovedCurriculumTrack';
import { drainB4BValidationPages } from '@/lib/coursera/validateApprovedCurriculumTrack';
import { loadEnvFile } from 'node:process';

function readArg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() ?? '' : '';
}

async function main() {
  const envFile = readArg('--env-file');
  if (envFile) loadEnvFile(envFile);
  const programSlug = readArg('--program');
  const collectionId = readArg('--collection');
  if (!programSlug || !collectionId) {
    throw new Error(
      'Usage: tsx scripts/validate-approved-coursera-track.ts --program <wap-slug> --collection <coursera-id>',
    );
  }

  const snapshot = await drainB4BValidationPages(
    ({ start, limit }) => listPrograms({ excludeContent: false, start, limit }),
    { pageLimit: 100 },
  );
  const matches = snapshot.elements.filter((program) => program.id === collectionId);
  if (matches.length > 1) {
    throw new Error(`Coursera collection ${collectionId} appeared more than once across B4B pages`);
  }
  const providerProgram = matches[0];
  if (!providerProgram || !Array.isArray(providerProgram.contents)) {
    throw new Error(
      `Coursera collection ${collectionId} was not exposed by the B4B programs API with inline contents`,
    );
  }
  if (
    providerProgram.contentCount != null &&
    providerProgram.contentCount !== providerProgram.contents.length
  ) {
    throw new Error(
      `Coursera collection ${collectionId} exposed ${providerProgram.contents.length} of ${providerProgram.contentCount} contents`,
    );
  }
  const validation = validateApprovedCurriculumTrack({
    programSlug,
    providerProgram: {
      id: providerProgram.id,
      courses: (providerProgram.contents as B4BContent[]).map((content) => ({
        id: content.id,
        slug: content.slug ?? null,
        name: content.name ?? null,
        contentType: content.contentType ?? null,
      })),
    },
  });
  process.stdout.write(`${JSON.stringify({
    pagesFetched: snapshot.pagesFetched,
    providerProgramCount: snapshot.elements.length,
    validation,
  }, null, 2)}\n`);
  if (!validation.exactMatch) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
