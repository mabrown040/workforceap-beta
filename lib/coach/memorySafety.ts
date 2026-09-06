export type CoachMemoryFields = {
  summary: string | null;
  lastTopic: string | null;
  lastAction: string | null;
};

export const MAX_COACH_MEMORY_SUMMARY_CHARS = 1200;
const MAX_INPUT_CHARS = 4000;

// Defense in depth, not a general-purpose PII detector. Prefer dropping a
// memory fact over retaining a sensitive disclosure. The summarizer must also
// obey the career-only policy; no pattern list can identify every disclosure.
const PRIVATE_CONTENT = [
  /\b(?:passwords?|passcodes?|passphrases?|pin|api[ _-]?keys?|secrets?|bearer|credentials?|tokens?|one[ -]time code|verification code|private key|seed phrase)\b/i,
  /\b(?:social security|ssn|national id|passport|driver'?s? licen[cs]e|government id|tax id|routing number|account number|bank account|credit card|debit card|date of birth|dob|born on|zip code|postcode)\b/i,
  /\b(?:my|their|his|her|member'?s?)\s+(?:email|e-mail|phone|mobile|address|full name)\b/i,
  /\b(?:my name is|name\s*:|can be reached at|lives at|member named)\b/i,
  /[\w.+-]+\s*@\s*[\w.-]+\s*\.\s*[a-z]{2,}/i,
  /(?:https?:\/\/|www\.)\S+/i,
  /(?:\+?\d[\s().-]*){7,}/,
  /\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/,
  /\b\d{1,6}\s+(?:[a-z0-9]+\s+){1,5}(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd|court|ct|way|place|pl)\b/i,
  /\b[a-z0-9_+/=-]{28,}\b/i,
  /\b(?:diagnos\w*|medical condition|mental health|depress\w*|bipolar|schizophren\w*|anxiety|ptsd|adhd|autis\w*|cancer|hiv|pregnan\w*|disabilit\w*|disabled|medication|therapy|addiction|sobriety)\b/i,
  /\b(?:immigra\w*|undocumented|asylum|citizenship|green card|work authorization|work permit|visa status|visa number|criminal|felony|arrested|incarcerat\w*|conviction)\b/i,
  /\b(?:religio\w*|muslim|christian|jewish|catholic|political|democrat|republican|sexual orientation|gay|lesbian|bisexual|transgender|race|ethnicity)\b/i,
  /\b(?:domestic abuse|domestic violence|trauma|abused|suicid\w*|kill myself|self[ -]harm|divorce\w*|custody|single parent|child support|bank balance|bankruptcy|debt|evict\w*|homeless\w*)\b/i,
];

const INSTRUCTION_CONTENT = [
  /\b(?:ignore|disregard|override|bypass|forget)\b.{0,80}\b(?:instructions?|rules?|prompts?|polic(?:y|ies)|guardrails?|safety)\b/i,
  /\b(?:system|developer|assistant)\s*:/i,
  /\b(?:system|developer) (?:message|prompt|instructions?)\b/i,
  /\b(?:you (?:are|must|should|will)|new instructions?|jailbreak|exfiltrat\w*|base64)\b/i,
  /\b(?:call|invoke|execute)\b.{0,60}\b(?:tool|function|command|api)\b/i,
  /[<>{}`]/,
  /\\(?:u[0-9a-f]{4}|x[0-9a-f]{2})/i,
];

function normalizedText(value: string): string {
  return value.normalize('NFKC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Null means withhold the entire field, rather than echoing a partial secret. */
export function sanitizeCoachMemoryText(value: string | null | undefined, maxChars = MAX_COACH_MEMORY_SUMMARY_CHARS): string | null {
  if (!value || value.length > MAX_INPUT_CHARS) return null;
  const normalized = normalizedText(value);
  if (!normalized || [...PRIVATE_CONTENT, ...INSTRUCTION_CONTENT].some((pattern) => pattern.test(normalized))) {
    return null;
  }
  return normalized.replace(/\s+/g, ' ').slice(0, maxChars);
}

/** A contaminated prior record is not a safe foundation for new memory. */
export function sanitizeCoachMemoryFields(value: CoachMemoryFields): CoachMemoryFields {
  const summary = sanitizeCoachMemoryText(value.summary);
  const lastTopic = sanitizeCoachMemoryText(value.lastTopic, 200);
  const lastAction = sanitizeCoachMemoryText(value.lastAction, 500);
  if ((value.summary?.trim() && !summary) || (value.lastTopic?.trim() && !lastTopic) || (value.lastAction?.trim() && !lastAction)) {
    return { summary: null, lastTopic: null, lastAction: null };
  }
  return { summary, lastTopic, lastAction };
}

const CAREER_TOPICS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'resume preparation', pattern: /\b(?:resume|cv|cover letter|experience bullets?)\b/i },
  { label: 'interview preparation', pattern: /\b(?:interview|elevator (?:pitch|introduction))\b/i },
  { label: 'job search', pattern: /\b(?:job|applications?|recruiter|hiring|networking|linkedin)\b/i },
  { label: 'training progress', pattern: /\b(?:training|course|coursera|lesson|certification|certificate|study|program|learning)\b/i },
  { label: 'career planning', pattern: /\b(?:career|role|skills?|portfolio|project|business|marketing|sales|management|manager)\b/i },
];

export function getSafeCoachMemoryTopic(text: string): string | null {
  const safe = sanitizeCoachMemoryText(text, MAX_INPUT_CHARS);
  if (!safe) return null;
  return CAREER_TOPICS.find(({ pattern }) => pattern.test(safe))?.label ?? null;
}

/**
 * Only bounded career-related turns and short confirmations reach the memory
 * summarizer. Omit whole risky turns, including coach echoes of member details.
 * This does not change the live conversation or its separate transcript store.
 */
export function minimizeCoachMemoryTurns<T extends { role: 'agent' | 'user'; text: string }>(turns: T[]): T[] {
  return turns.flatMap((turn) => {
    const text = sanitizeCoachMemoryText(turn.text, MAX_INPUT_CHARS);
    if (!text) return [];
    const isConfirmation = /^(?:yes|no|okay|ok|agreed|i agree|i will|i'?ll do that|that works|sounds good)[.!]?$/i.test(text);
    return getSafeCoachMemoryTopic(text) || isConfirmation ? [{ ...turn, text }] : [];
  });
}
