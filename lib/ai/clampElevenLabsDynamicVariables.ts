import {
  hasSubstantiveResumeText,
  sanitizeResumePlainText,
} from '@/lib/resume/extractionQuality';
import { RESUME_COACH_INITIAL_TEXT_MAX_CHARS } from '@/lib/ai/resumeCoachDataContract';

/**
 * ElevenLabs ConvAI dynamic variables must be strings with bounded size.
 * Oversized program_skill lists or unusual DB values can break the JS SDK or agent handshake.
 */
const MAX_KEY_LEN = 120;
const MAX_VALUE_LEN = RESUME_COACH_INITIAL_TEXT_MAX_CHARS;
const RESUME_TEXT_KEYS = new Set(['resume_text', 'resume_draft', 'resume_context', 'live_resume_draft']);

export function clampElevenLabsDynamicVariables(
  vars: Record<string, string | number | boolean>
): Record<string, string> {
  const out: Record<string, string> = {};
  let sawResumeTextKey = false;
  for (const [k, v] of Object.entries(vars)) {
    if (!k) continue;
    const key = k.length > MAX_KEY_LEN ? k.slice(0, MAX_KEY_LEN) : k;
    const raw = typeof v === 'string' ? v : String(v ?? '');
    const isResumeText = RESUME_TEXT_KEYS.has(k.toLowerCase());
    if (isResumeText) sawResumeTextKey = true;
    const safeValue = isResumeText ? sanitizeResumePlainText(raw) : raw.replace(/\0/g, '');
    const s = safeValue.slice(0, MAX_VALUE_LEN);
    out[key] = s;
  }

  if (sawResumeTextKey && out.has_resume === 'true') {
    const hasUsableResume = [...RESUME_TEXT_KEYS].some(
      (key) => hasSubstantiveResumeText(out[key] ?? ''),
    );
    if (!hasUsableResume) out.has_resume = 'false';
  }

  return out;
}
