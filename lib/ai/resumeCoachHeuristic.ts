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
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      suggestions.push({
        original: m[1],
        suggested: m[2],
        context: 'Suggested by resume coach',
      });
    }
  }
  return suggestions.slice(0, 10);
}
