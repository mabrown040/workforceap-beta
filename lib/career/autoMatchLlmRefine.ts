/**
 * LLM refinement layer for O*NET → WorkforceAP program matching.
 *
 * Takes the top N candidates from the structured multi-dimensional scorer and
 * calls Claude (with Groq/Gemini fallback) to adjust final ordering and generate
 * richer, human-readable reason text.
 *
 * This is intentionally admin-panel-only. It should NOT run on every member
 * page load — it's a heavier call that improves the admin UX and produces
 * better copy for compliance/audit conversations.
 *
 * Usage:
 *   const refined = await refineMatchesWithLlm(occ, topCandidates);
 */

import { claudeChat } from '@/lib/ai/anthropicChat';
import type { Program } from '@/lib/content/programs';
import type { OccupationForMatch, AutoMatchResult } from './autoMatch';

export type RefinedMatch = AutoMatchResult & {
  llmReason?: string;
  llmReordered?: boolean;
};

function buildPrompt(occ: OccupationForMatch, candidates: AutoMatchResult[], programs?: Program[]): {
  system: string;
  user: string;
} {
  const system = `You are a WorkforceAP career-mapping assistant. Your job is to review structured algorithmic matches between an O*NET occupation and WorkforceAP training programs, then:

1. Confirm or adjust the top-5 ordering. You may reorder if the structured scorer missed nuance (e.g., a "bridge" program is actually a better fit than a "primary" because of real-world hiring pipelines).
2. Rewrite each program's "reason" into 1-2 clear, member-facing sentences. Be specific. Mention actual skills, certifications, or job titles. Avoid generic fluff like "great opportunity" or "unlock your potential."
3. Keep the same program slugs, scores, recommendation types, and experience bands. Only modify ordering and reason text.

Output strict JSON:
{
  "matches": [
    {
      "programSlug": "...",
      "reason": "specific human-readable reason",
      "reordered": true/false
    }
  ]
}

Rules:
- Every slug in the input must appear in the output.
- Do not invent new slugs.
- Reason must be ≤ 160 characters.
- If you agree with the existing order, set reordered=false for all.`;

  const occDetails = [
    `Title: ${occ.title}`,
    `Description: ${occ.description ?? 'N/A'}`,
    `Job Zone: ${occ.jobZone ?? 'N/A'}`,
    `Job Family: ${occ.jobFamily ?? 'N/A'}`,
    `Skills: ${occ.skills.map((s) => s.skillName).join(', ') || 'N/A'}`,
    `Abilities: ${occ.abilities?.map((a) => a.name).join(', ') || 'N/A'}`,
    `Knowledge: ${occ.knowledge?.map((k) => k.name).join(', ') || 'N/A'}`,
    `Work Activities: ${occ.workActivities?.map((w) => w.name).join(', ') || 'N/A'}`,
    `Education: ${occ.education?.map((e) => e.title).join(', ') || 'N/A'}`,
    `Tasks: ${occ.tasks.map((t) => t.taskText).slice(0, 5).join('; ') || 'N/A'}`,
  ].join('\n');

  const candidateLines = candidates.map((c, i) => {
    const prog = programs?.find((p) => p.slug === c.programSlug);
    const progContext = prog
      ? `Program: ${prog.title} | Category: ${prog.category} | Skills: ${prog.skills.join(', ')} | Courses: ${prog.courses.map((co) => co.name).slice(0, 3).join(', ')}`
      : '';

    return `${i + 1}. slug=${c.programSlug} score=${c.score} type=${c.recommendationType} exp=${c.experienceBand}\n   structured_reason: ${c.reason}\n   ${progContext}`;
  }).join('\n\n');

  const user = `OCCUPATION PROFILE:\n${occDetails}\n\nSTRUCTURED CANDIDATES (top ${candidates.length}):\n${candidateLines}\n\nPlease return the JSON array of matches with improved reasons and any re-ordering you believe is warranted.`;

  return { system, user };
}

/** Attempt to parse the LLM response into a list of refined reasons / reorder flags. */
function parseLlmResponse(text: string): { programSlug: string; reason: string; reordered: boolean }[] {
  try {
    // Look for JSON block
    const jsonMatch = text.match(/\{[\s\S]*"matches"[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(cleaned) as { matches?: { programSlug: string; reason: string; reordered?: boolean }[] };
    if (!Array.isArray(parsed.matches)) return [];
    return parsed.matches.map((m) => ({
      programSlug: m.programSlug,
      reason: m.reason?.slice(0, 200) ?? '',
      reordered: Boolean(m.reordered),
    }));
  } catch {
    return [];
  }
}

/**
 * Refine top structured candidates with an LLM.
 *
 * @param occ         Full occupation profile (should include taxonomy fields).
 * @param candidates  Top candidates from `rankPrograms()` — typically 5.
 * @param programs    Full program catalog for extra context in the prompt.
 * @returns           Same candidates with possibly reordered and richer reasons.
 */
export async function refineMatchesWithLlm(
  occ: OccupationForMatch,
  candidates: AutoMatchResult[],
  programs?: Program[]
): Promise<RefinedMatch[]> {
  if (candidates.length === 0) return [];

  const { system, user } = buildPrompt(occ, candidates, programs);
  const response = await claudeChat(system, user, { maxTokens: 2500, temperature: 0.3 });
  if (!response) {
    // LLM unavailable — return originals untouched
    return candidates.map((c) => ({ ...c, llmReordered: false }));
  }

  const parsed = parseLlmResponse(response);
  if (parsed.length === 0) {
    return candidates.map((c) => ({ ...c, llmReordered: false }));
  }

  // Build lookup
  const lookup = new Map(parsed.map((p) => [p.programSlug, p]));

  // Merge LLM reasons into original candidates
  const merged: RefinedMatch[] = candidates.map((c) => {
    const llm = lookup.get(c.programSlug);
    return {
      ...c,
      reason: llm?.reason && llm.reason.length > 10 ? llm.reason : c.reason,
      llmReason: llm?.reason ?? undefined,
      llmReordered: llm?.reordered ?? false,
    };
  });

  // Re-sort if any reordered flag is true. We trust the LLM order by
  // looking at the parsed array order and moving those items to front.
  const reorderedSlugs = new Set(parsed.filter((p) => p.reordered).map((p) => p.programSlug));
  if (reorderedSlugs.size > 0) {
    const slugOrder = parsed.map((p) => p.programSlug);
    merged.sort((a, b) => {
      const ai = slugOrder.indexOf(a.programSlug);
      const bi = slugOrder.indexOf(b.programSlug);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return b.score - a.score;
    });
  }

  return merged.slice(0, candidates.length);
}
