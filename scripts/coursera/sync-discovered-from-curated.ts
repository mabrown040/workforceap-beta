/**
 * Rewrite allowlisted discovered-catalog course lists from curated Curriculum
 * collections (additive alignment / new entries). Does not invent learningPathIds.
 *
 *   pnpm exec tsx scripts/coursera/sync-discovered-from-curated.ts --check
 *   pnpm exec tsx scripts/coursera/sync-discovered-from-curated.ts --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CURATED_COLLECTIONS } from '@/lib/content/coursera/curatedCollections';
import { COURSERA_LEARNING_PATHS } from '@/lib/content/coursera/learningPaths';

const CATALOG_PATH = resolve('lib/content/courseraDiscoveredCatalog.ts');

/** Collections where Curriculum is the source of truth for the WAP course list. */
const SYNC_COLLECTION_IDS = [
  '81uci', // combined Net+/Sec+ (cyber program)
  '6m4yZ', // AI and Software Developer (IBM)
  '61iuX', // AWS Cloud
  'tEMYo', // IT Support + Entry-Level Cyber (new catalog entry)
  'LVE2h', // CompTIA Network+
] as const;

function courseLiteral(course: {
  courseId: string;
  slug: string;
  name: string;
  partner: string;
}): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `      { courseId: "${esc(course.courseId)}", slug: "${esc(course.slug)}", name: "${esc(course.name)}", partner: "${esc(course.partner)}" },`;
}

function programBlock(args: {
  key: string;
  learningPathId: string | null;
  title: string;
  courses: ReadonlyArray<{ courseId: string; slug: string; name: string; partner: string }>;
}): string {
  const lp =
    args.learningPathId === null
      ? '    // learningPathId not yet captured from Coursera admin URL.\n    // learningPathId: null,'
      : `    learningPathId: "${args.learningPathId}",`;
  const courses = args.courses.map(courseLiteral).join('\n');
  return `  "${args.key}": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
${lp}
    title: "${args.title.replace(/"/g, '\\"')}",
    courses: [
${courses}
    ],
  },`;
}

function main(): void {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check') || !write;
  let source = readFileSync(CATALOG_PATH, 'utf8');
  const planned: string[] = [];

  for (const collectionId of SYNC_COLLECTION_IDS) {
    const path = COURSERA_LEARNING_PATHS.find((p) => p.collectionId === collectionId);
    const curated = CURATED_COLLECTIONS.find((c) => c.collectionId === collectionId);
    if (!path?.programSlug || !curated) {
      throw new Error(`Missing registry/curated for ${collectionId}`);
    }

    // Prefer the INNER key used in DISCOVERED_COURSERA_PROGRAMS_INNER when known.
    const innerKeyAliases: Record<string, string> = {
      'comptia-network-professional-certificate': 'comptia-network-plus-professional-certificate',
    };
    const key = innerKeyAliases[path.programSlug] ?? path.programSlug;

    const block = programBlock({
      key,
      learningPathId: path.learningPathId,
      title: curated.name,
      courses: curated.courses.map((c) => ({
        courseId: c.courseId,
        slug: c.slug,
        name: c.name,
        partner: c.partner,
      })),
    });

    const keyPattern = new RegExp(
      String.raw`  "${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}": \{[\s\S]*?\n  \},`,
      'm',
    );

    if (keyPattern.test(source)) {
      const next = source.replace(keyPattern, block);
      if (next !== source) {
        planned.push(`rewrite ${key} (${collectionId}) → ${curated.courses.length} courses`);
        source = next;
      } else {
        planned.push(`unchanged ${key} (${collectionId})`);
      }
    } else {
      // Insert before the closing `};` of DISCOVERED_COURSERA_PROGRAMS_INNER
      const insertAt = source.lastIndexOf('\n};');
      if (insertAt < 0) throw new Error('Could not find end of DISCOVERED_COURSERA_PROGRAMS_INNER');
      // The INNER object ends at the first `};` after the last program — find the
      // marker comment or the closing of INNER specifically.
      const innerEnd = source.indexOf('\n};\n\nexport type CourseraProgramSlug');
      if (innerEnd < 0) throw new Error('Could not find INNER object end marker');
      // Ensure preceding entry has a trailing comma
      let head = source.slice(0, innerEnd);
      if (!/,\s*$/.test(head)) {
        // last program block ends with `},` already in our files
      }
      if (!head.trimEnd().endsWith(',')) {
        head = `${head.trimEnd()},\n`;
      }
      source = `${head}\n${block}${source.slice(innerEnd)}`;
      planned.push(`insert ${key} (${collectionId}) → ${curated.courses.length} courses`);
    }
  }

  for (const line of planned) console.log(line);

  if (write) {
    writeFileSync(CATALOG_PATH, source);
    console.log(`Wrote ${CATALOG_PATH}`);
  } else if (check) {
    const current = readFileSync(CATALOG_PATH, 'utf8');
    if (current !== source) {
      console.error('[sync-discovered-from-curated] catalog would change; re-run with --write');
      process.exitCode = 1;
    } else {
      console.log('[sync-discovered-from-curated] catalog already matches allowlisted collections');
    }
  }
}

main();
