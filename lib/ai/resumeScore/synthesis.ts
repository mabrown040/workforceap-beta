import { claudeChat } from '@/lib/ai/anthropicChat';
import type { StructuralScore } from './types';
import type { OnetCoverageResult } from './onetCoverage';
import type { MarketCoverageResult } from './marketScrape';
import type { TargetOccupation } from './occupations';

export interface SynthesisInput {
  structural: StructuralScore;
  occupations: TargetOccupation[];
  onetCoverage: OnetCoverageResult[];
  marketCoverage: MarketCoverageResult[];
}

const SYSTEM_PROMPT = `You are a no-nonsense resume coach.

You will receive structured scoring data and the candidate's resume. Your job: produce a tight, evidence-backed analysis. NEVER invent strengths or fabricate experience. Use ONLY the data and resume provided.

OUTPUT FORMAT (strict, no markdown fences, no preamble):

OVERALL SCORE: <composite>%

STRENGTHS:
• <2-4 specific bullets — cite line numbers or quoted phrases from the resume>

PRIORITY IMPROVEMENTS:
• <3-6 bullets — each one names a SPECIFIC bullet line or missing keyword. Concrete fixes only.>

QUICK WINS:
• <2-3 bullets — easiest changes with highest impact>

TARGET-OCCUPATION FIT:
• <1-2 lines per inferred target occupation — coverage score + top 2 gaps from O*NET data>

LIVE MARKET KEYWORDS:
• <If market data present: list 3-5 must-have keywords the candidate is MISSING (from top postings). If no market data, write "Live market data unavailable.">

Be terse. No fluff. No generic advice ("add metrics" alone is useless — cite WHICH bullet).`;

function renderInput(input: SynthesisInput, resume: string): string {
  const lines: string[] = [];
  lines.push(`STRUCTURAL COMPOSITE: ${input.structural.composite}/100`);
  lines.push(`Structural breakdown:`);
  for (const [name, sub] of Object.entries(input.structural.breakdown)) {
    lines.push(`  ${name}: ${sub.score}/100`);
    for (const note of sub.notes.slice(0, 3)) lines.push(`    - ${note}`);
  }
  if (input.occupations.length > 0) {
    lines.push('');
    lines.push('TARGET OCCUPATIONS (inferred):');
    input.occupations.forEach((o) => {
      lines.push(`  ${o.onetCode} ${o.title} (confidence ${Math.round(o.confidence * 100)}%)`);
    });
  }
  if (input.onetCoverage.length > 0) {
    lines.push('');
    lines.push('O*NET SKILL COVERAGE:');
    input.onetCoverage.forEach((c) => {
      lines.push(`  ${c.onetCode} ${c.title}: ${c.coverageScore}/100`);
      const gaps = c.topGaps.slice(0, 4);
      if (gaps.length > 0) {
        lines.push('    Top gaps (high-importance skills not surfaced in resume):');
        gaps.forEach((g) => lines.push(`      - ${g.skill.name} (importance ${g.skill.importance})`));
      }
    });
  }
  if (input.marketCoverage.length > 0) {
    lines.push('');
    lines.push('LIVE MARKET KEYWORD COVERAGE:');
    input.marketCoverage.forEach((m, i) => {
      const occ = input.occupations[i];
      lines.push(`  ${occ?.title ?? '?'}: ${m.coverageScore}/100 (${m.postingCount} postings scanned, source=${m.source})`);
      if (m.mustHaveMissing.length > 0) {
        lines.push('    Must-have keywords MISSING from resume (>=70% of postings):');
        m.mustHaveMissing.slice(0, 6).forEach((k) =>
          lines.push(`      - ${k.phrase} (in ${Math.round(k.frequency * 100)}% of postings)`),
        );
      }
      if (m.mustHavePresent.length > 0) {
        lines.push('    Must-have keywords PRESENT:');
        m.mustHavePresent.slice(0, 6).forEach((k) =>
          lines.push(`      - ${k.phrase} (in ${Math.round(k.frequency * 100)}% of postings)`),
        );
      }
    });
  }
  lines.push('');
  lines.push('RESUME TEXT:');
  lines.push('---');
  lines.push(resume);
  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate final personalized analysis using all gathered structural + O*NET + market signal.
 * Falls back gracefully to structural-only if LLM call fails.
 *
 * `coachContextBlock` is additive (Sprint R2 coach-context pattern) — pass the
 * output of `loadCoachContextBlock(userId)` so the narrative can reference
 * prior tool runs/goals/barriers without changing the scoring output format.
 */
export async function synthesizeAnalysis(
  input: SynthesisInput,
  resume: string,
  coachContextBlock = '',
): Promise<string | null> {
  const userContent = renderInput(input, resume);
  return await claudeChat(`${SYSTEM_PROMPT}${coachContextBlock}`, userContent, { maxTokens: 1400, temperature: 0.3 });
}

export { renderInput as _renderInputForTests };
