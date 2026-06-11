import { getAICoachContext, renderCoachContextForPrompt } from './aiCoachContext';

/**
 * Convenience wrapper used by AI tool routes that want to personalize their
 * system prompt with the member's coach context (barriers, goals, recommended
 * careers, prior tool runs, etc.).
 *
 * Returns a prompt-ready suffix string (already prefixed with two newlines) or
 * an empty string if context could not be loaded. Always safe to call — never
 * throws — so routes can append the result unconditionally without changing
 * their control flow.
 */
export async function loadCoachContextBlock(userId: string): Promise<string> {
  try {
    const ctx = await getAICoachContext(userId);
    return `\n\n${renderCoachContextForPrompt(ctx)}`;
  } catch (err) {
    console.error('[coachContextBlock] failed to load coach context', err);
    return '';
  }
}
