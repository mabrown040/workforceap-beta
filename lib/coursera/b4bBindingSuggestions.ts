/**
 * B4B program-id binding suggestions.
 *
 * For each WorkforceAP `Program` in the static catalog, find the best B4B
 * program match by normalized name and report a confidence score so an
 * admin can review + apply (today: paste the id into `programs.ts`; later:
 * a DB-backed override table).
 *
 * Confidence levels:
 *   - 'exact'   — normalized names are identical
 *   - 'partial' — one normalized name is a prefix of the other (catches
 *                 "AI Practitioner Professional Certificate" matching
 *                 "AI Professional Practitioner Certificate (IBM)" etc.)
 *   - 'none'    — no usable match
 *
 * Pure logic — no `'server-only'` chain, so node:test can import it
 * directly. The async server wrapper that calls `loadB4BPrograms()`
 * lives in `b4bBindingSuggestions.server.ts`.
 */
import type { Program } from '@/lib/content/programs';

export type SuggestionConfidence = 'exact' | 'partial' | 'none';

/** Minimal shape we need from a B4B program — keeps this file pure. */
export type B4BProgramSummary = {
  id: string;
  slug: string | null;
  name: string;
};

export type B4BBindingSuggestion = {
  catalogSlug: string;
  catalogTitle: string;
  currentB4BId: string | null;
  suggestedB4BId: string | null;
  suggestedB4BName: string | null;
  suggestedB4BSlug: string | null;
  confidence: SuggestionConfidence;
  alreadyBound: boolean;
};

export type B4BBindingsReport = {
  totalCatalogPrograms: number;
  totalB4BPrograms: number;
  alreadyBound: number;
  exactMatches: number;
  partialMatches: number;
  unmatched: number;
  suggestions: B4BBindingSuggestion[];
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function computeBindingSuggestions(
  catalog: Program[],
  b4bPrograms: B4BProgramSummary[],
): B4BBindingsReport {
  const report: B4BBindingsReport = {
    totalCatalogPrograms: catalog.length,
    totalB4BPrograms: b4bPrograms.length,
    alreadyBound: 0,
    exactMatches: 0,
    partialMatches: 0,
    unmatched: 0,
    suggestions: [],
  };

  for (const program of catalog) {
    const targetNormalized = normalize(program.title);
    let confidence: SuggestionConfidence = 'none';
    let suggested: B4BProgramSummary | null = null;

    for (const b4b of b4bPrograms) {
      const candidateNormalized = normalize(b4b.name);
      if (!candidateNormalized) continue;
      if (candidateNormalized === targetNormalized) {
        suggested = b4b;
        confidence = 'exact';
        break;
      }
    }

    if (!suggested) {
      for (const b4b of b4bPrograms) {
        const candidateNormalized = normalize(b4b.name);
        if (!candidateNormalized) continue;
        if (
          candidateNormalized.startsWith(targetNormalized) ||
          targetNormalized.startsWith(candidateNormalized)
        ) {
          suggested = b4b;
          confidence = 'partial';
          break;
        }
      }
    }

    const currentB4BId = program.courseraB4BProgramId ?? null;
    const alreadyBound =
      Boolean(currentB4BId) && currentB4BId === (suggested?.id ?? null);

    if (alreadyBound) {
      report.alreadyBound += 1;
    } else if (confidence === 'exact') {
      report.exactMatches += 1;
    } else if (confidence === 'partial') {
      report.partialMatches += 1;
    } else {
      report.unmatched += 1;
    }

    report.suggestions.push({
      catalogSlug: program.slug,
      catalogTitle: program.title,
      currentB4BId,
      suggestedB4BId: suggested?.id ?? null,
      suggestedB4BName: suggested?.name ?? null,
      suggestedB4BSlug: suggested?.slug ?? null,
      confidence,
      alreadyBound,
    });
  }

  return report;
}

export function renderPatchHint(report: B4BBindingsReport): string {
  const ready = report.suggestions.filter(
    (s) => s.confidence === 'exact' && !s.alreadyBound && s.suggestedB4BId,
  );
  if (ready.length === 0) {
    return '// No exact-match suggestions available. Review partial / unmatched rows manually.';
  }
  const lines = ready.map(
    (s) =>
      `'${s.catalogSlug}': '${s.suggestedB4BId}', // ${s.suggestedB4BName ?? ''}`,
  );
  return [
    '// Paste into lib/content/programs.ts (or the new bindings table when introduced):',
    'export const PROGRAM_COURSERA_B4B_IDS = {',
    ...lines.map((l) => `  ${l}`),
    '};',
  ].join('\n');
}
