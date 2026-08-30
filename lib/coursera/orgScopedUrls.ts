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
import { getProgramBySlug } from '@/lib/content/programs';

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
  /**
   * Normalized program-name (lowercased, alphanumeric only) → org-scoped
   * url. Used as an automatic bridge when our internal slug doesn't match
   * Coursera's slug. Two programs with identical normalized names from
   * different sources collide (last-wins) — acceptable because that means
   * Coursera itself has duplicate names.
   */
  byNormalizedName: Map<string, string>;
  /**
   * When the org has exactly one B4B program (the umbrella WAP shell,
   * e.g. "Workforce Advancement Project"), this is its url. All catalog
   * programs are courses + specializations inside it — none has its own
   * B4B program peer. Use as a deterministic fallback whenever the
   * by-id / by-slug / by-name lookups all miss.
   */
  umbrellaUrl: string | null;
  fetchedAt: number;
};

/**
 * Lower-case, strip everything but alphanumerics, so "AI Professional
 * Practitioner Certificate" matches "ai professional practitioner
 * certificate" matches "AI-Professional-Practitioner-Certificate".
 */
function normalizeProgramName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

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
    const byNormalizedName = new Map<string, string>();
    const urlsSeen: string[] = [];
    try {
      const page = await listPrograms({ excludeContent: true, limit: 100 });
      for (const program of page.elements as B4BProgramWithUrl[]) {
        const url = program.url?.trim();
        if (!url) continue;
        urlsSeen.push(url);
        if (program.slug?.trim()) bySlug.set(program.slug.trim(), url);
        if (program.id?.trim()) byId.set(program.id.trim(), url);
        if (program.name?.trim()) {
          byNormalizedName.set(normalizeProgramName(program.name.trim()), url);
        }
      }
    } catch (error) {
      // Swallow — credentials may not be configured in dev/test. We still
      // return a (possibly empty) index so the local fallback wins later.
      console.warn(
        '[coursera/orgScopedUrls] listPrograms failed; falling back to local URL:',
        error instanceof Error ? error.message : error,
      );
    }
    // Single-umbrella detection: our B4B org returns 1 program ("Workforce
    // Advancement Project") and every "program" in our static catalog is a
    // course or specialization inside it. Stamp the lone program's url as
    // the umbrella fallback so by-id/slug/name misses don't drop to the
    // platform root.
    const umbrellaUrl = urlsSeen.length === 1 ? urlsSeen[0]! : null;
    const idx: ProgramIndex = {
      bySlug,
      byId,
      byNormalizedName,
      umbrellaUrl,
      fetchedAt: Date.now(),
    };
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
 * Resolution order:
 *   1. Discovered-catalog `publicProgramUrl` (admin-curated override).
 *   2. B4B `byId` lookup via the program's optional
 *      `courseraB4BProgramId` field — explicit manual override paste-able
 *      from `/admin/coursera` "List B4B programs".
 *   3. B4B `bySlug` — works when our internal slug coincidentally equals
 *      Coursera's slug.
 *   4. **Automatic name match**: lookup by normalized program title
 *      against the B4B `byNormalizedName` index. Stops the
 *      manual-paste-required gap that previously left every program
 *      falling through to the platform-root fallback.
 *   5. **Single-umbrella fallback**: when the B4B org has exactly one
 *      program (the WAP umbrella shell — courses + specializations live
 *      inside it), use its url. Every catalog program resolves to the
 *      same umbrella URL, which is what we want: the learner lands in
 *      the org-scoped program shell and picks a course from there.
 *   6. Local platform-root fallback (no longer 404s; see `localFallbackUrl`).
 *
 * Always returns a string so call sites can use it directly in `<a href>`.
 */
export async function getOrgScopedProgramUrl(
  programSlug: string,
  preferredProgramId?: string | null,
): Promise<string | null> {
  const slug = programSlug?.trim();
  if (!slug) return preferredProgramId?.trim() ? null : localFallbackUrl('', 'program');

  const preferredId = preferredProgramId?.trim();
  if (preferredId) {
    const idx = await getProgramIndex();
    // A validated approved track is an exact identity, not a hint. Missing
    // it must fail closed rather than leaking the learner onto a public
    // /learn page or a legacy umbrella that cannot prove entitlement.
    return idx.byId.get(preferredId) ?? null;
  }

  const fromCatalog = resolveCourseraPublicProgramUrl(slug);
  if (fromCatalog) return fromCatalog;

  const program = getProgramBySlug(slug);
  const idx = await getProgramIndex();

  if (program?.courseraB4BProgramId) {
    const fromManualId = idx.byId.get(program.courseraB4BProgramId);
    if (fromManualId) return fromManualId;
  }

  const fromB4BSlug = idx.bySlug.get(slug);
  if (fromB4BSlug) return fromB4BSlug;

  if (program?.title) {
    const fromName = idx.byNormalizedName.get(normalizeProgramName(program.title));
    if (fromName) return fromName;
  }

  if (idx.umbrellaUrl) return idx.umbrellaUrl;

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
  courseraCourseSlug: string | null | undefined,
  preferredProgramId?: string | null,
): Promise<string | null> {
  const courseSlug = courseraCourseSlug?.trim();
  const courseFallback = courseSlug ? localFallbackUrl(courseSlug, 'course') : null;

  let programUrl: string | null;
  try {
    programUrl = await getOrgScopedProgramUrl(programSlug, preferredProgramId);
  } catch {
    return preferredProgramId?.trim() ? null : courseFallback ?? PLATFORM_URL;
  }
  if (!programUrl) return preferredProgramId?.trim() ? null : courseFallback ?? PLATFORM_URL;

  // A course id only has meaning inside a real org-scoped /programs/... URL.
  // Appending it to the platform root produces a 200 page that never opens
  // the requested course, which looks like a dead CTA to the member.
  let isOrgScopedProgramUrl = false;
  try {
    const parsed = new URL(programUrl);
    const hostname = parsed.hostname.toLowerCase();
    isOrgScopedProgramUrl =
      (hostname === 'coursera.org' || hostname.endsWith('.coursera.org')) &&
      /^\/programs\/[^/?#]+\/?$/.test(parsed.pathname);
  } catch {
    isOrgScopedProgramUrl = false;
  }

  if (!isOrgScopedProgramUrl) {
    return preferredProgramId?.trim() ? null : courseFallback ?? programUrl;
  }

  const id = courseraCourseId?.trim();
  if (!id) return courseFallback ?? programUrl;

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
 *
 * IMPORTANT: For `kind: 'program'`, our internal program slug (e.g.
 * `it-support-professional-certificate-ibm`) is NOT a Coursera program
 * slug — Coursera only recognizes org-scoped slugs registered via B4B
 * (e.g. `workforce-advancement-project-8a3f0`). Building
 * `coursera.org/programs/{ourSlug}` produces a 404. We therefore fall
 * back to the Coursera platform root when no real org-scoped program
 * URL is resolvable; callers that need a usable program-context link
 * should resolve via the catalog or B4B (`getOrgScopedProgramUrl`) and
 * route members to a course-level `/learn/{courseraSlug}` if neither is
 * available.
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
      return PLATFORM_URL;
  }
}

/** Test-only: clear the in-memory cache between cases. */
export function _resetOrgScopedUrlCacheForTesting() {
  cachedIndex = null;
  inFlightFetch = null;
}
