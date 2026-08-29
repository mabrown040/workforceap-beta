import { getProgramBySlug } from '@/lib/content/programs';

export type AssignableProgramOption = { slug: string; title: string };

/**
 * Converts the active tenant catalog into the choices staff may assign.
 *
 * The mutation routes accept only canonical WorkforceAP programs and reject
 * curricula that are paused for a versioned migration. Keeping the picker on
 * the same contract prevents a page-derived or stale option from advertising
 * an assignment the server will refuse.
 */
export function buildAssignableProgramOptions(
  activePrograms: ReadonlyArray<{ slug: string }>,
): AssignableProgramOption[] {
  const bySlug = new Map<string, AssignableProgramOption>();

  for (const row of activePrograms) {
    const program = getProgramBySlug(row.slug);
    if (!program || program.curriculumMigrationPending) continue;
    bySlug.set(program.slug, { slug: program.slug, title: program.title });
  }

  return [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
}
