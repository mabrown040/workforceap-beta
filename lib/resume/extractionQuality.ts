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

const UNSAFE_CONTROL_OR_REPLACEMENT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g;
const PDF_OBJECT = /(?:^|\n)\s*\d+\s+\d+\s+obj\b/m;
const PDF_END_OBJECT = /(?:^|\n)\s*endobj\b/m;
const PDF_STREAM = /(?:^|\n)\s*stream\b/m;
const PDF_END_STREAM = /(?:^|\n)\s*endstream\b/m;
const PDF_XREF_EOF = /(?:^|\n)\s*xref\b[\s\S]*%%EOF\b/m;
const ZIP_CONTAINER_ENTRY = /(?:\[Content_Types\]\.xml|word\/document\.xml|_rels\/\.rels)/i;
const PARSER_DIAGNOSTIC =
  /(?:InvalidPDFException|Invalid PDF structure|FormatError:\s|bad XRef entry|Mammoth does not support|webpack:\/\/\/src\/pdf\.js)/i;
const STACK_FRAME = /(?:^|\n)\s*at\s+\S+.*:\d+:\d+\)?\s*$/m;
const KNOWN_CONTEXT_PLACEHOLDER =
  /\{\{\s*(?:member_(?:first_name|full_name)|resume_(?:text|draft|context)|live_resume_draft|program_name)\s*\}\}/i;

export const RESUME_TEXT_UPLOAD_ERROR =
  'We could not read resume text from that file. Try a text-based PDF, DOCX, or TXT file. Your previous resume was kept.';

export const RESUME_TEXT_SAVE_ERROR =
  'We could not save that resume draft because it contains unreadable file data. Your previous resume was kept.';

function escaped(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

/**
 * Detect file-container bytes, parser diagnostics, and unresolved agent placeholders.
 *
 * This is intentionally shared by server extraction and client resume-coach paths so
 * failed extraction output cannot be persisted or forwarded to a voice agent.
 */
export function isUnsafeResumePlainText(text: string): boolean {
  if (!text) return false;

  const normalized = text.replace(/\r\n?/g, '\n');
  const trimmed = normalized.trim();
  if (!trimmed) return false;

  const unsafeCharacters = normalized.match(UNSAFE_CONTROL_OR_REPLACEMENT)?.length ?? 0;
  if (unsafeCharacters > Math.max(2, Math.ceil(normalized.length * 0.01))) return true;

  if (/^%PDF-\d(?:\.\d)?/i.test(trimmed)) return true;
  if ((PDF_OBJECT.test(normalized) && PDF_END_OBJECT.test(normalized))
    || (PDF_STREAM.test(normalized) && PDF_END_STREAM.test(normalized))
    || PDF_XREF_EOF.test(normalized)) {
    return true;
  }

  if (/^PK(?:\u0003\u0004)?/.test(trimmed) && ZIP_CONTAINER_ENTRY.test(normalized)) return true;
  if (PARSER_DIAGNOSTIC.test(normalized) && (STACK_FRAME.test(normalized) || /\bError:\s/i.test(normalized))) {
    return true;
  }
  if (KNOWN_CONTEXT_PLACEHOLDER.test(normalized)) return true;

  return false;
}

/** Return normalized resume prose, or an empty string when the payload is unsafe. */
export function sanitizeResumePlainText(text: string): string {
  if (!text || isUnsafeResumePlainText(text)) return '';
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
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
