export const AI_RESPONSE_LANGUAGES = ['en', 'es', 'fr', 'pt'] as const;

export type AIResponseLanguage = (typeof AI_RESPONSE_LANGUAGES)[number];

export function normalizeAIResponseLanguage(value: unknown): AIResponseLanguage {
  return AI_RESPONSE_LANGUAGES.includes(value as AIResponseLanguage) ? (value as AIResponseLanguage) : 'en';
}

export function aiResponseLanguageInstruction(language: AIResponseLanguage): string {
  if (language === 'es') {
    return 'Response language: Spanish. Write all member-facing output in clear, natural Spanish for Spanish-speaking WorkforceAP members. Keep job titles, certification names, company names, and acronyms in their commonly used form when translating them would be confusing. Do not mix in English instructions or labels unless the user-provided source text requires it.';
  }

  if (language === 'fr') {
    return 'Response language: French. Write all member-facing output in clear, natural French for French-speaking WorkforceAP members. Keep job titles, certification names, company names, and acronyms in their commonly used form when translating them would be confusing. Do not mix in English instructions or labels unless the user-provided source text requires it.';
  }

  if (language === 'pt') {
    return 'Response language: Portuguese. Write all member-facing output in clear, natural Portuguese for Portuguese-speaking WorkforceAP members. Keep job titles, certification names, company names, and acronyms in their commonly used form when translating them would be confusing. Do not mix in English instructions or labels unless the user-provided source text requires it.';
  }

  return 'Response language: English. Write all member-facing output in clear, natural English.';
}

export function nextInterviewPromptForLanguage(language: AIResponseLanguage): string {
  if (language === 'es') return 'Siguiente pregunta, por favor.';
  if (language === 'fr') return 'Question suivante, s’il vous plaît.';
  if (language === 'pt') return 'Próxima pergunta, por favor.';
  return 'Next question please.';
}

export function firstInterviewPromptForLanguage(language: AIResponseLanguage): string {
  if (language === 'es') return 'Haz la primera pregunta de entrevista, por favor.';
  if (language === 'fr') return 'Posez la première question d’entretien, s’il vous plaît.';
  if (language === 'pt') return 'Faça a primeira pergunta da entrevista, por favor.';
  return 'Please ask your first interview question.';
}
