import { claudeChat } from '@/lib/ai/anthropicChat';
import { prisma } from '@/lib/db/prisma';

export interface TargetOccupation {
  onetCode: string;
  title: string;
  confidence: number; // 0-1
}

const SYSTEM_PROMPT = `You map resumes to O*NET-SOC occupation codes.

Read the resume. Return up to 3 most-likely target occupations the candidate is qualified for and likely targeting next. Bias to roles they could realistically apply to today, not aspirational future roles.

OUTPUT FORMAT (strict JSON, no prose):
{"occupations":[{"onetCode":"NN-NNNN.NN","title":"...","confidence":0.0-1.0}]}

Use real O*NET-SOC 2019 codes. Example codes:
- 41-3091.00 Sales Representatives, Services, All Other
- 41-4012.00 Sales Reps, Wholesale & Manufacturing (Tech & Scientific)
- 13-1161.00 Market Research Analysts
- 15-1252.00 Software Developers
- 15-1232.00 Computer User Support Specialists
- 11-2022.00 Sales Managers
- 11-2021.00 Marketing Managers

Return ONLY the JSON. No markdown fences, no commentary.`;

interface OccLLMResponse {
  occupations?: Array<{ onetCode?: unknown; title?: unknown; confidence?: unknown }>;
}

function parseOccupations(raw: string): TargetOccupation[] {
  // Strip code fences if model added them
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: OccLLMResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.occupations)) return [];
  return parsed.occupations
    .map((o) => {
      const code = typeof o.onetCode === 'string' ? o.onetCode.trim() : '';
      const title = typeof o.title === 'string' ? o.title.trim() : '';
      const conf = typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0;
      if (!/^\d{2}-\d{4}\.\d{2}$/.test(code)) return null;
      if (!title) return null;
      return { onetCode: code, title, confidence: conf };
    })
    .filter((x): x is TargetOccupation => x !== null)
    .slice(0, 3);
}

/**
 * Extract target O*NET occupations from a resume.
 * Returns empty array if LLM unavailable or parse fails.
 */
export async function inferTargetOccupations(resume: string): Promise<TargetOccupation[]> {
  const text = await claudeChat(SYSTEM_PROMPT, `Resume:\n---\n${resume}\n---`, {
    maxTokens: 400,
    temperature: 0.1,
  });
  if (!text) return [];
  const parsed = parseOccupations(text);
  if (parsed.length === 0) return [];

  // Filter to occupations actually present in our local O*NET cache
  const codes = parsed.map((p) => p.onetCode);
  const known = await prisma.onetOccupation.findMany({
    where: { onetCode: { in: codes } },
    select: { onetCode: true, title: true },
  });
  const knownSet = new Map(known.map((k) => [k.onetCode, k.title]));
  return parsed
    .filter((p) => knownSet.has(p.onetCode))
    .map((p) => ({ ...p, title: knownSet.get(p.onetCode) ?? p.title }));
}

export { parseOccupations as _parseOccupationsForTests };
