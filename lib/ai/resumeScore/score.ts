import { scoreStructural } from './structural';
import { inferTargetOccupations, type TargetOccupation } from './occupations';
import { scoreOnetCoverage, type OnetCoverageResult } from './onetCoverage';
import { getMarketSignal, scoreMarketCoverage, type MarketCoverageResult } from './marketScrape';
import { synthesizeAnalysis } from './synthesis';
import type { StructuralScore } from './types';

export interface ResumeAnalysisResult {
  /** Overall composite weighted across all available signals (0-100). */
  composite: number;
  /** Per-pillar subscores so UI can render breakdown. */
  pillars: {
    structural: { score: number; label: string };
    onetCoverage: { score: number; label: string } | null;
    marketCoverage: { score: number; label: string } | null;
  };
  structural: StructuralScore;
  occupations: TargetOccupation[];
  onetCoverage: OnetCoverageResult[];
  marketCoverage: MarketCoverageResult[];
  /** LLM-generated narrative (null if all providers failed). */
  narrative: string | null;
  /** Per-stage diagnostics for debug / cost tracking. */
  diagnostics: {
    structuralMs: number;
    occupationsMs: number;
    onetMs: number;
    marketMs: number;
    synthesisMs: number;
  };
}

function averageScore(results: { coverageScore: number }[]): number | null {
  if (results.length === 0) return null;
  const sum = results.reduce((s, r) => s + r.coverageScore, 0);
  return Math.round(sum / results.length);
}

/**
 * Full resume analysis pipeline:
 *   1. Structural score (deterministic, no I/O)
 *   2. Infer target occupations via Haiku
 *   3. For each occupation, O*NET coverage (DB + optional Gemini embeddings)
 *   4. For each occupation, live market keyword coverage (Firecrawl, 24h cached)
 *   5. Synthesize narrative via Haiku with all signal as context
 *
 * Composite weighting:
 *   - structural: 0.4
 *   - O*NET coverage average: 0.35 (or 0.0 if no occupations resolved)
 *   - market coverage average: 0.25 (or 0.0 if firecrawl unavailable)
 *
 * Missing pillars redistribute weight to remaining pillars proportionally.
 */
export async function analyzeResume(
  resume: string,
  options: { coachContextBlock?: string } = {},
): Promise<ResumeAnalysisResult> {
  const t0 = Date.now();

  // 1. Structural (sync, ~1ms)
  const structural = scoreStructural(resume);
  const tStructural = Date.now() - t0;

  // 2. Inferred occupations (Haiku, ~1-2s)
  const tOccStart = Date.now();
  const occupations = await inferTargetOccupations(resume).catch((err) => {
    console.error('[resumeScore] inferTargetOccupations failed:', err instanceof Error ? err.message : err);
    return [] as TargetOccupation[];
  });
  const tOccupations = Date.now() - tOccStart;

  // 3. O*NET coverage per occupation (Gemini embed parallel)
  const tOnetStart = Date.now();
  const onetCoverage = await Promise.all(
    occupations.map((o) =>
      scoreOnetCoverage(structural.features, o.onetCode, o.title).catch((err) => {
        console.error('[resumeScore] scoreOnetCoverage failed:', err instanceof Error ? err.message : err);
        return null;
      }),
    ),
  ).then((rs) => rs.filter((x): x is OnetCoverageResult => x !== null));
  const tOnet = Date.now() - tOnetStart;

  // 4. Market signal per occupation (Firecrawl parallel)
  const tMarketStart = Date.now();
  const marketSignals = await Promise.all(
    occupations.map((o) =>
      getMarketSignal(o.onetCode, o.title).catch((err) => {
        console.error('[resumeScore] getMarketSignal failed:', err instanceof Error ? err.message : err);
        return null;
      }),
    ),
  );
  const marketCoverage: MarketCoverageResult[] = marketSignals
    .filter((s) => s !== null)
    .map((s) => scoreMarketCoverage(resume, s!));
  const tMarket = Date.now() - tMarketStart;

  // 5. Composite
  const structuralComp = structural.composite;
  const onetAvg = averageScore(onetCoverage);
  const marketAvg = marketCoverage.length > 0 && marketCoverage.some((m) => m.source !== 'unavailable')
    ? averageScore(marketCoverage)
    : null;

  let composite: number;
  const weights: Array<{ score: number; weight: number }> = [
    { score: structuralComp, weight: 0.4 },
  ];
  if (onetAvg !== null) weights.push({ score: onetAvg, weight: 0.35 });
  if (marketAvg !== null) weights.push({ score: marketAvg, weight: 0.25 });
  const totalW = weights.reduce((s, w) => s + w.weight, 0);
  composite = Math.round(weights.reduce((s, w) => s + w.score * (w.weight / totalW), 0));

  // 6. Synthesis narrative
  const tSynthStart = Date.now();
  const narrative = await synthesizeAnalysis(
    { structural, occupations, onetCoverage, marketCoverage },
    resume,
    options.coachContextBlock ?? '',
  ).catch((err) => {
    console.error('[resumeScore] synthesizeAnalysis failed:', err instanceof Error ? err.message : err);
    return null;
  });
  const tSynth = Date.now() - tSynthStart;

  return {
    composite,
    pillars: {
      structural: { score: structuralComp, label: 'Structure & ATS basics' },
      onetCoverage: onetAvg !== null ? { score: onetAvg, label: 'O*NET skill coverage' } : null,
      marketCoverage: marketAvg !== null ? { score: marketAvg, label: 'Live market keywords' } : null,
    },
    structural,
    occupations,
    onetCoverage,
    marketCoverage,
    narrative,
    diagnostics: {
      structuralMs: tStructural,
      occupationsMs: tOccupations,
      onetMs: tOnet,
      marketMs: tMarket,
      synthesisMs: tSynth,
    },
  };
}
