export const AI_RESPONSE_LANGUAGES = ['en', 'es'] as const;

export type AIResponseLanguage = (typeof AI_RESPONSE_LANGUAGES)[number];

export function normalizeAIResponseLanguage(value: unknown): AIResponseLanguage {
  return value === 'es' ? 'es' : 'en';
}

export function aiResponseLanguageInstruction(language: AIResponseLanguage): string {
  if (language === 'es') {
    return 'Response language: Spanish. Write all member-facing output in clear, natural Spanish for Spanish-speaking WorkforceAP members. Keep job titles, certification names, company names, and acronyms in their commonly used form when translating them would be confusing. Do not mix in English instructions or labels unless the user-provided source text requires it.';
  }

  return 'Response language: English. Write all member-facing output in clear, natural English.';
}
