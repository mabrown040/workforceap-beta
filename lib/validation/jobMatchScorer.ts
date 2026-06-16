import { isIP } from 'node:net';
import { z } from 'zod';

const optionalNonEmptyString = (schema: z.ZodType<string, any>) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    schema.optional()
  );

const DISALLOWED_HOSTS = new Set(['localhost', '0.0.0.0']);

function isDisallowedIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isDisallowedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

function isSafePublicHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || DISALLOWED_HOSTS.has(hostname)) return false;

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return !isDisallowedIpv4(hostname);
  if (ipVersion === 6) return !isDisallowedIpv6(hostname);

  return true;
}

// ─── Prompt-injection sanitization ───
// Strips common prompt-control sequences that could hijack an AI context window.
const PROMPT_CONTROL_RE = /\n?\s*---\s*\n?|\n?\s*system\s*:\s*|\n?\s*user\s*:\s*|\n?\s*assistant\s*:\s*|\n?\s*instruction\s*:\s*/gi;

function stripPromptControls(value: string): string {
  return value.replace(PROMPT_CONTROL_RE, ' ').trim();
}

// ─── Content-type validation ───
// Rejects strings that look like binary blobs, SQL injection, or script tags.
// Allows normal printable text including newlines, tabs, and Unicode letters.
// NOTE: ES2017 target — avoid /s (dotAll) flag; use [\s\S] instead.
const SQL_INJECTION_RE = /select\s+.*from\s+|insert\s+into\s+|delete\s+from\s+|drop\s+table\s+|union\s+select\s+/i;
const SCRIPT_TAG_RE = /<script\b|<iframe\b|javascript:\s*/i;
const PRINTABLE_TEXT_RE = /^(?:[\p{L}\p{N}\p{P}\p{S}\s])*$/u;

function safeTextString(schema: z.ZodString): z.ZodType<string, any> {
  return schema
    .regex(PRINTABLE_TEXT_RE, 'Input must be plain text (no binary data)')
    .refine(
      (val) => !SQL_INJECTION_RE.test(val) && !SCRIPT_TAG_RE.test(val),
      'Input contains disallowed patterns (SQL or script tags)'
    );
}

export const jobMatchScorerSchema = z.object({
  resume: z.preprocess(
    (value) => (typeof value === 'string' ? stripPromptControls(value) : value),
    safeTextString(z.string().min(100, 'Resume must be at least 100 characters').max(15000)).optional()
  ),
  jobDescription: z.preprocess(
    (value) => (typeof value === 'string' ? stripPromptControls(value) : value),
    optionalNonEmptyString(
      safeTextString(z.string().min(50, 'Job description must be at least 50 characters').max(8000))
    )
  ),
  jobUrl: optionalNonEmptyString(
    z.string().url('Please enter a valid URL')
  ),
  prefill: z.boolean().optional(),
  subjectMemberId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  /** Sprint R2: thread this run back to a prior result. */
  parentToolResultId: z.string().uuid().optional(),
}).refine((data) => isSafePublicHttpUrl(data.jobUrl ?? ''), {
  message: 'Please enter a public HTTP(S) job posting URL',
  path: ['jobUrl'],
});

export type JobMatchScorerInput = z.infer<typeof jobMatchScorerSchema>;
