import {
  CASCADE_DRAFT_RESPONSE_SCHEMA,
  type CascadeDraftResponse,
} from './types';

/**
 * Pure parser for the LLM's structured output.
 *
 * Handles two real-world quirks:
 *   1. Models sometimes wrap their JSON in ```json fences despite being asked
 *      not to. We strip them before parsing.
 *   2. Models sometimes emit trailing prose ("Here's your JSON: { ... }").
 *      We slice to the first `{` and last `}` if the raw string isn't pure.
 *
 * Returns a discriminated result so callers can decide how to respond:
 *   - Validation errors → log + leave the cascade in `pending_draft` for
 *     retry on the next cron tick.
 *   - JSON parse errors → same.
 *   - Schema errors → same, but with the specific field path so we can tune
 *     the prompt.
 */

export type ParseResult =
  | { ok: true; value: CascadeDraftResponse }
  | { ok: false; reason: string; rawSample: string };

/** Trim text outside the outermost {…} block. Defensive against trailing
 *  prose / markdown fences. Returns the original string if no braces found. */
function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();

  // Strip ```json … ``` and ``` … ``` fences if present.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fenced) return fenced[1].trim();

  // Slice to outermost braces if there's surrounding prose.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return trimmed;
  return trimmed.slice(first, last + 1);
}

/** Truncated sample of the raw output, safe to put in error logs. */
function rawSample(raw: string): string {
  return raw.length > 400 ? raw.slice(0, 397) + '...' : raw;
}

export function parseDraftResponse(raw: string): ParseResult {
  const block = extractJsonBlock(raw);

  let json: unknown;
  try {
    json = JSON.parse(block);
  } catch (err) {
    return {
      ok: false,
      reason: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      rawSample: rawSample(raw),
    };
  }

  const parsed = CASCADE_DRAFT_RESPONSE_SCHEMA.safeParse(json);
  if (!parsed.success) {
    // Surface the first issue path — most useful for prompt tuning.
    const first = parsed.error.issues[0];
    const path = first.path.length ? first.path.join('.') : '(root)';
    return {
      ok: false,
      reason: `Schema validation failed at "${path}": ${first.message}`,
      rawSample: rawSample(raw),
    };
  }

  return { ok: true, value: parsed.data };
}
