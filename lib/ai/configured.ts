/**
 * Any LLM provider counts as "AI is configured". Member tools historically
 * gated on Groq only, which 503'd resume rewrite / cover letter / etc. when
 * Anthropic or Gemini was the live key (the fallback chain in claudeChat).
 */
export function isAIConfigured(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim(),
  );
}

export const AI_UNCONFIGURED_CODE = 'ai_unconfigured';

export const AI_UNCONFIGURED_MESSAGE =
  'Career writing tools are not configured yet. Ask your counselor if you need help now.';
