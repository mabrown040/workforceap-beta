/**
 * Pure-function matching + source-rewrite logic for the Coursera catalog
 * backfill script.
 *
 * Lives in `scripts/lib/` (CommonJS) so:
 *   1. The entry script (`scripts/backfill-coursera-courseids.cjs`) can
 *      `require()` it directly with no transpile step.
 *   2. The unit test (`lib/coursera/catalogBackfill.test.ts`) can also
 *      `require()` it via tsx interop, because `node --import tsx --test`
 *      preserves CJS interop for `.cjs` modules.
 *
 * No I/O, no env reads, no fetch. Inputs are plain JS values; outputs are
 * plain JS values. This makes the matcher trivially unit-testable and
 * keeps the entry script focused on plumbing.
 */

'use strict';

/**
 * Strip Coursera's `Course~` / `Specialization~` prefix from a B4B content id.
 * `Course~rUHfSakHEeeQ3gpuC4Fs_g-HixlS` → `rUHfSakHEeeQ3gpuC4Fs_g-HixlS`.
 */
function stripContentPrefix(rawId) {
  if (typeof rawId !== 'string') return '';
  const idx = rawId.indexOf('~');
  return idx >= 0 ? rawId.slice(idx + 1) : rawId;
}

/**
 * Coursera-style slug. Matches the convention used by
 * `lib/xapi/statementModel.ts#toSlug`: lowercase, runs of non-alphanum →
 * single dash, trim leading/trailing dashes.
 */
function toSlug(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a {nameKey, slugKey} → contentId index from a list of B4B
 * `listContents` results. Later entries with the same key win, but B4B's
 * catalog is dedup'd so collisions are rare in practice.
 */
function indexB4BContents(b4bContents) {
  const byName = new Map();
  const bySlug = new Map();
  if (!Array.isArray(b4bContents)) return { byName, bySlug };
  for (const entry of b4bContents) {
    if (!entry || typeof entry !== 'object') continue;
    const id = stripContentPrefix(entry.id);
    if (!id) continue;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (name) {
      byName.set(name.toLowerCase(), id);
    }
    // B4B exposes a slug field on most contents but not all; fall back to
    // a slug derived from the name.
    const explicitSlug =
      typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug.trim() : '';
    if (explicitSlug) {
      bySlug.set(explicitSlug.toLowerCase(), id);
    }
    if (name) {
      const derived = toSlug(name);
      if (derived && !bySlug.has(derived)) {
        bySlug.set(derived, id);
      }
    }
  }
  return { byName, bySlug };
}

/**
 * Look up a single catalog course in the B4B index. Tries exact name first
 * (Coursera's canonical course name should match what's in our catalog
 * file), falls back to slug match. Returns `{ contentId, strategy }` or
 * `null` if no match.
 */
function matchCourse(catalogCourse, index) {
  if (!catalogCourse || typeof catalogCourse !== 'object') return null;
  const name = typeof catalogCourse.name === 'string' ? catalogCourse.name.trim() : '';
  const slug = typeof catalogCourse.slug === 'string' ? catalogCourse.slug.trim() : '';

  if (name) {
    const byName = index.byName.get(name.toLowerCase());
    if (byName) return { contentId: byName, strategy: 'exact-name' };
  }
  if (slug) {
    const bySlug = index.bySlug.get(slug.toLowerCase());
    if (bySlug) return { contentId: bySlug, strategy: 'slug' };
  }
  if (name) {
    const derived = toSlug(name);
    if (derived) {
      const bySlug = index.bySlug.get(derived);
      if (bySlug) return { contentId: bySlug, strategy: 'derived-slug' };
    }
  }
  return null;
}

/**
 * Resolve a single LP-level entry: walk its courses, try to match each
 * against the B4B index, return the per-course result.
 *
 * Each result is `{ slug, name, currentCourseId, resolved: { contentId, strategy } | null }`.
 */
function resolveProgramCourses(programEntry, index) {
  const courses = Array.isArray(programEntry?.courses) ? programEntry.courses : [];
  return courses.map((course) => ({
    slug: typeof course?.slug === 'string' ? course.slug : '',
    name: typeof course?.name === 'string' ? course.name : '',
    currentCourseId: typeof course?.courseId === 'string' ? course.courseId : '',
    resolved: matchCourse(course, index),
  }));
}

/**
 * Determine if a `courseId` value looks like the placeholder pattern from
 * PR #1068. Real Coursera ids are 22-char base62 strings (sometimes with
 * `_g-HixlS`-style suffixes for content-version pinning). The placeholders
 * are `TODO_courseId_<digit>`.
 */
function isPlaceholderCourseId(courseId) {
  return typeof courseId === 'string' && courseId.startsWith('TODO_courseId_');
}

/**
 * Rewrite the source of `lib/content/courseraDiscoveredCatalog.ts` in
 * place: for each `courseId: "TODO_courseId_N"` we have a real id for,
 * substitute it. Anything we don't have a match for is left untouched.
 *
 * Inputs:
 *   - `source`: the full file content (string)
 *   - `resolutions`: `Array<{ programSlug, courseSlug, courseName, contentId }>`
 *
 * The replacement is anchored by both the `slug:` and `name:` fields on
 * the same line, so we only ever rewrite the exact line we intend to —
 * idempotent if run twice (the regex no longer matches once the placeholder
 * has been replaced) and safe against accidentally rewriting an unrelated
 * `TODO_courseId_<N>` in another LP.
 */
function applyResolutionsToSource(source, resolutions) {
  if (typeof source !== 'string') {
    throw new TypeError('applyResolutionsToSource: source must be a string');
  }
  if (!Array.isArray(resolutions)) {
    throw new TypeError('applyResolutionsToSource: resolutions must be an array');
  }

  let updated = source;
  let replaced = 0;
  const skipped = [];

  for (const res of resolutions) {
    if (!res || typeof res !== 'object') continue;
    const { courseSlug, courseName, contentId } = res;
    if (!contentId || typeof contentId !== 'string') {
      skipped.push({ ...res, reason: 'no contentId' });
      continue;
    }
    if (typeof courseSlug !== 'string' || !courseSlug) {
      skipped.push({ ...res, reason: 'no courseSlug' });
      continue;
    }

    // Match a single line that:
    //   - opens with `{ courseId: "TODO_courseId_<digits>",`
    //   - then has `slug: "<courseSlug>",`
    //   - then has `name: "<anything>",`
    // We anchor on the slug because that's the only field guaranteed
    // unique per LP (some courses share names — e.g. "Operating Systems
    // and Networking Fundamentals" appears in both A+ and Network+).
    const slugEsc = escapeRegex(courseSlug);
    const re = new RegExp(
      String.raw`(\{\s*courseId:\s*")TODO_courseId_\d+(",\s*slug:\s*")` +
        slugEsc +
        String.raw`("[^}]*\})`,
      'g',
    );
    const before = updated;
    updated = updated.replace(re, (_match, open, mid, tail) => {
      replaced += 1;
      return `${open}${contentId}${mid}${courseSlug}${tail}`;
    });
    if (updated === before) {
      skipped.push({ ...res, reason: 'placeholder line not found' });
    }
  }

  return { source: updated, replaced, skipped };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  stripContentPrefix,
  toSlug,
  indexB4BContents,
  matchCourse,
  resolveProgramCourses,
  isPlaceholderCourseId,
  applyResolutionsToSource,
};
