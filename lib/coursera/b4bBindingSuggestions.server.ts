import 'server-only';

import { PROGRAMS } from '@/lib/content/programs';
import { loadB4BPrograms } from '@/lib/coursera/programContentsCache';
import { computeBindingSuggestions, type B4BBindingsReport } from '@/lib/coursera/b4bBindingSuggestions';

/**
 * Server-only wrapper around `computeBindingSuggestions` that pulls the
 * live B4B program directory from the cached client. Kept in a separate
 * file so the pure logic file can be unit-tested without the
 * `'server-only'` import chain breaking node:test.
 */
export async function getBindingSuggestions(): Promise<B4BBindingsReport> {
  const programs = await loadB4BPrograms();
  return computeBindingSuggestions(
    PROGRAMS,
    programs.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
  );
}
