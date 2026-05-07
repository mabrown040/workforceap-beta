import type { Program } from '@/lib/content/programs';

export type SkillsetElement = {
  skillsetId: string;
  skillsetName: string;
  progressPercent: number;
};

/** Normalize titles for comparison (case, punctuation, whitespace). */
export function normalizeTitleForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014\-_:.,;'"!?()[\]/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type EnterpriseSkillsetMergeResult = {
  courseSlugs: string[];
  /** Completed Coursera skillsets that could not be mapped to a catalog course slug. */
  unmatchedCompletedSkillsets: Array<{ skillsetId: string; skillsetName: string }>;
};

/** Minimum normalized title length for containment-based course ↔ skillset matching. */
export const COURSERA_TITLE_LOOSE_MIN_LEN = 14;

function slugSignificantTokens(slug: string): string[] {
  return slug
    .split('-')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 5);
}

/**
 * Map Enterprise learner skillset rows → internal course slugs (multi-signal, best-effort).
 *
 * Resolution order (high → lower confidence):
 * 1. **Explicit overrides** — `skillsetSlugOverrides[skillsetId]` → must match a course slug on the program.
 * 2. **Positional** — `orderedSkillsetIds[i]` aligns with `program.courses[i]` when progress is 100%.
 *    - If lengths match: use full list order (legacy / admin-aligned ordering).
 *    - If lengths differ: still apply for `min(ids.length, courses.length)` so partial env lists still work.
 * 3. **Exact title** — normalized skillset name equals normalized catalog course name.
 * 4. **Loose title** — normalized containment (guarded by minimum length to limit false positives).
 * 5. **Slug tokens** — significant hyphen tokens from the internal course slug appear in the skillset name.
 *
 * Completed skillsets that never map are returned in `unmatchedCompletedSkillsets` for ops/debugging.
 */
export function resolveCompletedCourseSlugsFromEnterpriseSkillsets(args: {
  program: Program;
  orderedSkillsetIds: string[];
  elements: SkillsetElement[];
  /** Optional per–skillset-id → internal course slug map (from env / Coursera admin alignment). */
  skillsetSlugOverrides?: Record<string, string>;
}): EnterpriseSkillsetMergeResult {
  const { program, orderedSkillsetIds, elements } = args;
  const overrides = args.skillsetSlugOverrides ?? {};
  const byId = new Map(elements.map((e) => [e.skillsetId, e]));

  const slugSet = new Set<string>();
  const usedSkillsetIds = new Set<string>();

  const validSlug = (slug: string) => program.courses.some((c) => c.slug === slug);

  for (const row of elements) {
    if (row.progressPercent < 100) continue;
    const slug = overrides[row.skillsetId]?.trim();
    if (!slug || !validSlug(slug)) continue;
    slugSet.add(slug);
    usedSkillsetIds.add(row.skillsetId);
  }

  const positionalLimit = Math.min(orderedSkillsetIds.length, program.courses.length);
  for (let i = 0; i < positionalLimit; i++) {
    const skillsetId = orderedSkillsetIds[i];
    if (usedSkillsetIds.has(skillsetId)) continue;
    const row = byId.get(skillsetId);
    if (!row || row.progressPercent < 100) continue;
    slugSet.add(program.courses[i].slug);
    usedSkillsetIds.add(skillsetId);
  }

  const tryExactTitle = (row: SkillsetElement) => {
    const target = normalizeTitleForMatch(row.skillsetName);
    return program.courses.find((c) => normalizeTitleForMatch(c.name) === target) ?? null;
  };

  const tryLooseTitle = (row: SkillsetElement) => {
    const norm = normalizeTitleForMatch(row.skillsetName);
    if (norm.length < COURSERA_TITLE_LOOSE_MIN_LEN) return null;
    return (
      program.courses.find((c) => {
        const cn = normalizeTitleForMatch(c.name);
        if (cn.length < COURSERA_TITLE_LOOSE_MIN_LEN) return false;
        return norm.includes(cn) || cn.includes(norm);
      }) ?? null
    );
  };

  const trySlugTokens = (row: SkillsetElement) => {
    const blob = normalizeTitleForMatch(row.skillsetName).replace(/-/g, ' ');
    for (const c of program.courses) {
      const tokens = slugSignificantTokens(c.slug);
      if (tokens.length === 0) continue;
      const hits = tokens.filter((t) => blob.includes(t));
      if (hits.length >= 2 || (hits.length === 1 && tokens.length === 1)) {
        return c;
      }
    }
    return null;
  };

  for (const row of elements) {
    if (row.progressPercent < 100 || usedSkillsetIds.has(row.skillsetId)) continue;
    const exact = tryExactTitle(row);
    if (exact) {
      slugSet.add(exact.slug);
      usedSkillsetIds.add(row.skillsetId);
    }
  }

  for (const row of elements) {
    if (row.progressPercent < 100 || usedSkillsetIds.has(row.skillsetId)) continue;
    const loose = tryLooseTitle(row);
    if (loose) {
      slugSet.add(loose.slug);
      usedSkillsetIds.add(row.skillsetId);
    }
  }

  for (const row of elements) {
    if (row.progressPercent < 100 || usedSkillsetIds.has(row.skillsetId)) continue;
    const token = trySlugTokens(row);
    if (token) {
      slugSet.add(token.slug);
      usedSkillsetIds.add(row.skillsetId);
    }
  }

  const unmatchedCompletedSkillsets = elements
    .filter((row) => row.progressPercent >= 100 && !usedSkillsetIds.has(row.skillsetId))
    .map((row) => ({ skillsetId: row.skillsetId, skillsetName: row.skillsetName }));

  return {
    courseSlugs: [...slugSet],
    unmatchedCompletedSkillsets,
  };
}

/** Returns only course slugs; use {@link resolveCompletedCourseSlugsFromEnterpriseSkillsets} when you need unmatched skillsets. */
export function mapCompletedSkillsetsToCourseSlugs(args: {
  program: Program;
  orderedSkillsetIds: string[];
  elements: SkillsetElement[];
  skillsetSlugOverrides?: Record<string, string>;
}): string[] {
  return resolveCompletedCourseSlugsFromEnterpriseSkillsets(args).courseSlugs;
}
