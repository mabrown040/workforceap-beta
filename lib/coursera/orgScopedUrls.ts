/**
 * Org-scoped Coursera URL resolver.
 *
 * Coursera For Business returns a learner-facing program URL in
 * `programs[].url` (e.g. `https://www.coursera.org/programs/workforce-advancement-project-8a3f0`).
 * That URL bounces an authenticated learner straight into the right org
 * context (Coursera handles auth via cookies). If the learner isn't logged
 * in, they hit the org sign-in page instead of a generic catalog page.
 *
 * This module centralizes the "give me a member-friendly Coursera URL for
 * program/course X" question so the various member-facing call sites stop
 * hard-coding `https://www.coursera.org/learn/{slug}` (which drops members
 * on the public catalog and loses the org context).
 *
 * Resolution order for `getOrgScopedProgramUrl`:
 *   1. The discovered catalog's `publicProgramUrl` for the slug (already
 *      org-scoped — written by hand or by an offline catalog dump).
 *   2. A live B4B `listPrograms()` lookup, matching by program slug. The
 *      response is cached in-memory for 1 hour so we don't pay a network
 *      round-trip on every page render.
 *   3. The local fallback (`https://www.coursera.org/programs/{slug}`).
 *
 * The module deliberately reads B4B credentials lazily and returns a
 * cached result so hosts without B4B credentials still get a sensible
 * URL via steps 1 and 3.
 */

import 'server-only';
import { listPrograms, type B4BProgram } from '@/lib/coursera/b4bClient';
import { resolveCourseraPublicProgramUrl } from '@/lib/coursera/configCore';

const PLATFORM_URL = 'https://www.coursera.org';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * B4B's `programs[]` envelope returns `url` on each row but the typed
 * client doesn't model it (only the few fields we used historically).
 * We widen the shape locally rather than mutating the public type.
 */
type B4BProgramWithUrl = B4BProgram & { url?: string };

type ProgramIndex = {
  /** programSlug → org-scoped url */
  bySlug: Map<string, string>;
  /** programId → org-scoped url (B4B doesn't always populate slug) */
  byId: Map<string, string>;
  fetchedAt: number;
};

let cachedIndex: ProgramIndex | null = null;
let inFlightFetch: Promise<ProgramIndex> | null = null;

function isFresh(idx: ProgramIndex | null): idx is ProgramIndex {
  return Boolean(idx && Date.now() - idx.fetchedAt < CACHE_TTL_MS);
}

async function fetchProgramIndex(): Promise<ProgramIndex> {
  if (inFlightFetch) return inFlightFetch;
  inFlightFetch = (async () => {
    const bySlug = new Map<string, string>();
    const byId = new Map<string, string>();
    try {
      const page = await listPrograms({ excludeContent: true, limit: 100 });
      for (const program of page.elements as B4BProgramWithUrl[]) {
        const url = program.url?.trim();
        if (!url) continue;
        if (program.slug?.trim()) bySlug.set(program.slug.trim(), url);
        if (program.id?.trim()) byId.set(program.id.trim(), url);
      }
    } catch (error) {
      // Swallow — credentials may not be configured in dev/test. We still
      // return a (possibly empty) index so the local fallback wins later.
      console.warn(
        '[coursera/orgScopedUrls] listPrograms failed; falling back to local URL:',
        error instanceof Error ? error.message : error,
      );
    }
    const idx: ProgramIndex = { bySlug, byId, fetchedAt: Date.now() };
    cachedIndex = idx;
    return idx;
  })();
  try {
    return await inFlightFetch;
  } finally {
    inFlightFetch = null;
  }
}

async function getProgramIndex(): Promise<ProgramIndex> {
  if (isFresh(cachedIndex)) return cachedIndex;
  return fetchProgramIndex();
}

/**
 * Returns the org-scoped Coursera program URL.
 *
 * Resolution: catalog → B4B → local fallback. Always returns a string —
 * never null — so call sites can use it directly in `<a href>`.
 */
export async function getOrgScopedProgramUrl(programSlug: string): Promise<string> {
  const slug = programSlug?.trim();
  if (!slug) return localFallbackUrl('', 'program');

  const fromCatalog = resolveCourseraPublicProgramUrl(slug);
  if (fromCatalog) return fromCatalog;

  const idx = await getProgramIndex();
  const fromB4B = idx.bySlug.get(slug);
  if (fromB4B) return fromB4B;

  return localFallbackUrl(slug, 'program');
}

/**
 * Returns the org-scoped continue-learning URL for a single course inside
 * a program. Format observed in B4B:
 *
 *   https://www.coursera.org/programs/{programSlug}?productId={courseId}&productType=course&showMiniModal=true
 *
 * If the program URL itself can't be resolved, falls back to the generic
 * /learn/ page for the course (which still works, just outside the org).
 */
export async function getOrgScopedCourseUrl(
  programSlug: string,
  courseraCourseId: string,
): Promise<string> {
  const programUrl = await getOrgScopedProgramUrl(programSlug);
  const id = courseraCourseId?.trim();
  if (!id) return programUrl;

  // The "showMiniModal" param tells Coursera to surface the in-program
  // course modal rather than navigating away from the program shell.
  try {
    const url = new URL(programUrl);
    url.searchParams.set('productId', id);
    url.searchParams.set('productType', 'course');
    url.searchParams.set('showMiniModal', 'true');
    return url.toString();
  } catch {
    return programUrl;
  }
}

/**
 * Pure local helper — no network call. Used as the absolute last-resort
 * fallback when neither the catalog nor B4B can resolve the slug. Also
 * exported so non-async callers (client components) have a deterministic
 * URL builder available.
 */
export function localFallbackUrl(
  slug: string,
  kind: 'course' | 'specialization' | 'program',
): string {
  const trimmed = slug?.trim();
  if (!trimmed) return PLATFORM_URL;
  switch (kind) {
    case 'course':
      return `${PLATFORM_URL}/learn/${trimmed}`;
    case 'specialization':
      return `${PLATFORM_URL}/specializations/${trimmed}`;
    case 'program':
      return `${PLATFORM_URL}/programs/${trimmed}`;
  }
}

/** Test-only: clear the in-memory cache between cases. */
export function _resetOrgScopedUrlCacheForTesting() {
  cachedIndex = null;
  inFlightFetch = null;
}
