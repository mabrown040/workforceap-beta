const SECTION_HEADERS = [
  'professional summary',
  'summary',
  'experience',
  'work experience',
  'education',
  'skills',
  'certifications',
  'projects',
];

function escaped(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

export function getResumeExtractionWarning(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const hasBulletMarkers = /(^|\n)\s*(?:[-*•])\s+\S/m.test(normalized);
  const longSingleLineCount = lines.filter((line) => line.length >= 140).length;
  const mergedHeader = SECTION_HEADERS.some((header) =>
    new RegExp(`\\b${escaped(header)}\\b[ \\t]+[A-Z][^\\n]{18,}`, 'i').test(normalized),
  );
  const lowLineBreakDensity = normalized.length >= 500 && lines.length <= Math.max(6, Math.floor(normalized.length / 220));
  const bulletLoss = /\b(experience|work history|education|skills)\b/i.test(normalized) && !hasBulletMarkers;

  if (mergedHeader || lowLineBreakDensity || bulletLoss || longSingleLineCount >= 3) {
    return 'This upload may have flattened headings or bullets during text extraction. If the preview looks collapsed, paste plain text for a more reliable score.';
  }

  return null;
}
