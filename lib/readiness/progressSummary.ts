import { sanitizeAIOutput } from '@/lib/ai/postProcess';
import type { ReadinessProgressView } from '@/lib/readiness/progressView';

export type ReadinessSummarySource = 'factual' | 'ai' | 'error';

export const READINESS_SCORE_LOAD_ERROR =
  "We couldn't load your readiness score just now. Refresh the page. If this keeps happening, message your counselor.";

export const READINESS_EMPTY_RECAP =
  'No scored activity yet. Your readiness score starts at 0 until profile, resume, training, applications, or recent activity show up in your account.';

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function incompleteReason(view: ReadinessProgressView): string {
  const gaps = view.categories.filter((cat) => cat.pct < 100);
  if (gaps.length === 0) return '';
  return gaps
    .map((cat) => {
      const unfinished = cat.items
        .filter((item) => !item.done)
        .map((item) => `${item.label} (${item.earned}/${item.max})`);
      if (unfinished.length === 0) {
        return `${cat.label} is ${cat.pct}%`;
      }
      return `${cat.label} is ${cat.pct}% because ${unfinished.join('; ')}`;
    })
    .join(' ');
}

/**
 * Deterministic recap from the same numbers the dashboard renders.
 * Used when AI is off, rate-limited, or the model output fails a grounding check.
 */
export function buildFactualReadinessRecap(view: ReadinessProgressView): string {
  if (view.overallEarned === 0) {
    const next = view.priorityAction ? ` Next: ${view.priorityAction.label}` : '';
    return `${READINESS_EMPTY_RECAP}${next}`;
  }

  const complete = view.categories.filter((cat) => cat.pct >= 100).map((cat) => cat.label);
  const completeBit =
    complete.length === 0
      ? ''
      : `${joinList(complete)} ${complete.length === 1 ? 'is' : 'are'} complete.`;
  const gapBit = incompleteReason(view);
  const next = view.priorityAction
    ? `Next: ${view.priorityAction.label}`
    : 'Every scored category is complete.';

  return [
    `Your readiness score is ${view.overallScore}% (${view.overallEarned} of ${view.overallMax} weighted points, capped at 100).`,
    completeBit,
    gapBit,
    next,
  ]
    .filter((part) => part.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildReadinessSummaryPrompt(view: ReadinessProgressView): {
  system: string;
  user: string;
} {
  const facts = {
    overallScorePct: view.overallScore,
    weightedPointsEarned: view.overallEarned,
    weightedPointsMax: view.overallMax,
    categories: view.categories.map((cat) => ({
      label: cat.label,
      pct: cat.pct,
      earned: cat.earned,
      max: cat.max,
      items: cat.items.map((item) => ({
        label: item.label,
        earned: item.earned,
        max: item.max,
        done: item.done,
      })),
    })),
    nextAction: view.priorityAction?.label ?? 'Every scored category is complete.',
  };

  return {
    system: `You write a short progress recap for a WorkforceAP member.
Use ONLY the supplied JSON facts. Do not invent applications, certificates, interviews, employers, dates, or scores.
Do not change any percentage or point total.
If a category is incomplete, explain it using the incomplete items listed.
Write 2-4 short sentences in second person.
Cover: what the overall score means, why the area percents look this way, and the concrete next action.
Plain language. No markdown, no bullets, no greeting, no sign-off.`,
    user: JSON.stringify(facts),
  };
}

/** Percents the model is allowed to mention — drawn from the same view the UI shows. */
export function allowedReadinessPercents(view: ReadinessProgressView): Set<number> {
  const allowed = new Set<number>([0, 100, view.overallScore]);
  for (const cat of view.categories) {
    allowed.add(cat.pct);
    for (const item of cat.items) {
      allowed.add(item.earned);
      allowed.add(item.max);
      if (item.max > 0) allowed.add(Math.round((item.earned / item.max) * 100));
    }
  }
  return allowed;
}

export function readinessSummaryLooksGrounded(text: string, view: ReadinessProgressView): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 40 || trimmed.length > 900) return false;
  const allowed = allowedReadinessPercents(view);
  const claimed = [...trimmed.matchAll(/(\d{1,3})\s*%/g)].map((match) => Number(match[1]));
  return claimed.every((n) => allowed.has(n));
}

export function cleanReadinessSummary(text: string): string {
  return sanitizeAIOutput(text).replace(/\s+/g, ' ').trim();
}
