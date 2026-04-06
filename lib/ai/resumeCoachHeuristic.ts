/**
 * Heuristic extraction of resume edit hints from coach speech (voice or post-session text).
 * Kept in sync with patterns assumed by `/api/member/resume-coach/parse-suggestions` fallback.
 */
export type ResumeCoachHeuristicSuggestion = {
  original?: string;
  suggested: string;
  context: string;
};

export function extractResumeCoachSuggestionsFromText(text: string): ResumeCoachHeuristicSuggestion[] {
  const suggestions: ResumeCoachHeuristicSuggestion[] = [];
  const patterns = [
    /instead of ["']([^"']+)["'],?\s*(?:try|use|say)\s+["']([^"']+)["']/gi,
    /change\s+["']([^"']+)["']\s+to\s+["']([^"']+)["']/gi,
    /replace\s+["']([^"']+)["']\s+with\s+["']([^"']+)["']/gi,
    /try\s+["']([^"']+)["']\s+instead\s+of\s+["']([^"']+)["']/gi,
    /use\s+["']([^"']+)["']\s+rather\s+than\s+["']([^"']+)["']/gi,
    /swap\s+["']([^"']+)["']\s+for\s+["']([^"']+)["']/gi,
    /from\s+["']([^"']+)["']\s+to\s+["']([^"']+)["']/gi,
  ];
  for (let pi = 0; pi < patterns.length; pi++) {
    const pat = patterns[pi];
    let m;
    while ((m = pat.exec(text)) !== null) {
      // Patterns 3–4: "try/use [new] instead of/rather than [old]" → original is second group
      const swapOrder = pi >= 3 && pi <= 4;
      suggestions.push({
        original: swapOrder ? m[2] : m[1],
        suggested: swapOrder ? m[1] : m[2],
        context: 'Suggested by resume coach',
      });
    }
  }
  return suggestions.slice(0, 10);
}
