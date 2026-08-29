import type { MilestoneType } from './types';

/**
 * Pure prompt builder for the cascade-drafting LLM call.
 *
 * Splits system + user prompts so the SDK call can pass them as separate
 * fields (improves prompt-caching hit rate — the system prompt is stable
 * across cascades, the user prompt varies).
 *
 * No SDK dependency. No I/O. Unit-tested.
 */

export interface PromptInput {
  milestoneType: MilestoneType;
  learnerFirstName: string;
  courseName: string;
  courseSlug: string;
  /** Total courses the learner has completed in this program at detection
   *  time. 1 means "this is their first cert"; the LLM should write with
   *  more energy in that case. */
  completedCount: number;
  totalCourses?: number;
  programSlug: string | null;
  /** Optional in-house counselor messages to anchor the voice. When absent,
   *  the LLM defaults to a warm, professional tone described in the system
   *  prompt. */
  styleExamples?: Array<{ subject: string; body: string }>;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  /** Version stamp persisted on the cascade row so we can attribute behavior
   *  changes to specific prompt revisions. Bump when the system prompt
   *  changes in a way that meaningfully shifts outputs. */
  promptVersion: string;
}

export const CASCADE_PROMPT_VERSION = 'cascade-draft-v2';

const SYSTEM_PROMPT_BASE = `You draft proactive counselor outreach for a workforce-development platform that helps adult learners earn certifications and land jobs.

Your job is to produce a JSON object with two keys:
  - "counselorBrief": one short sentence (≤280 chars) summarizing the situation for the counselor.
  - "actions": an array of 1–5 drafted action objects.

Each action has a "type" discriminant. The ONLY allowed types are:
  - "celebrate_milestone": an email to the learner celebrating the milestone. Required fields: channel ("email"), subject, body, rationale, confidence.
  - "suggest_next_course": a recommendation that this learner should start a specific course next. Required fields: courseSlug, rationale, confidence.
  - "request_peer_pair": a suggestion that the counselor pair this learner with another cohort member (without naming the partner — the counselor picks). Required fields: rationale, confidence.
  - "flag_for_counselor_call": a flag for the counselor to schedule a 1:1 call. Required fields: rationale, confidence.

Rules — non-negotiable:
  1. NEVER invent or use action types beyond the four listed above.
  2. NEVER include another learner's full name, email, or any identifying detail in any drafted body. First-name-plus-initial is the only allowed reference (and only in rationale strings, never in learner-facing body text).
  3. NEVER promise outcomes the platform can't deliver (job offers, salary numbers, employer responses).
  4. NEVER write a celebration message longer than ~150 words. Adults reading short emails on phones is the norm.
  5. ALWAYS write in warm, professional, plain English. No filler ("In today's fast-paced world..."), no jargon ("synergize"), no emojis unless the learner has been celebrating with them in prior messages (which you won't know — so default to none).
  6. Confidence (0–1) reflects how certain you are this action is correct given the input. If you're not confident, omit the action rather than padding the list.
  7. Output ONLY the JSON object. No prose before or after. No markdown code fences.`;

const STYLE_PREAMBLE_WITHOUT_EXAMPLES = `\n\nVoice baseline (no in-house examples were provided for this draft, so use this baseline): plainspoken, second-person ("you did this"), specific to what the learner actually accomplished, no exclamation point in the subject line, max 150 words in the body.`;

function renderStyleExamples(examples: Array<{ subject: string; body: string }>): string {
  if (!examples.length) return STYLE_PREAMBLE_WITHOUT_EXAMPLES;
  const blocks = examples
    .slice(0, 3) // hard cap — system prompt budget
    .map(
      (ex, i) =>
        `\nExample ${i + 1}:\nSubject: ${ex.subject}\nBody: ${ex.body}`,
    )
    .join('\n');
  return `\n\nVoice baseline — match the tone of these in-house messages from real counselors:\n${blocks}`;
}

/**
 * Build system + user prompts for a course-completion cascade.
 *
 * The system prompt is stable across cascades (good for prompt caching).
 * The user prompt carries the specific milestone context.
 */
export function buildDraftPrompt(input: PromptInput): BuiltPrompt {
  const systemPrompt =
    SYSTEM_PROMPT_BASE + renderStyleExamples(input.styleExamples ?? []);

  const isFirstCompletion = input.completedCount === 1;
  const milestoneDescription: Record<MilestoneType, string> = {
    training_started: 'started their first validated training course',
    first_course_completed: 'completed their first validated course',
    course_completed: 'completed a validated course',
    program_halfway: 'reached the halfway point of their validated program',
    program_completed: 'completed every validated course in their program',
  };
  const outreachRule =
    input.milestoneType === 'training_started' || input.milestoneType === 'program_halfway'
      ? 'Do NOT draft a celebrate_milestone email for this milestone. Keep any action counselor-facing; there should be no automatic member spam.'
      : 'A short celebrate_milestone draft is allowed, but it still requires counselor approval.';

  const userPrompt = `A learner has ${milestoneDescription[input.milestoneType]}. Draft the cascade.

Milestone type: ${input.milestoneType}
Learner first name: ${input.learnerFirstName}
Triggering course name: ${input.courseName}
Triggering course slug: ${input.courseSlug}
Program slug: ${input.programSlug ?? '(unknown)'}
Courses completed in this program so far (including this one): ${input.completedCount}${
    input.totalCourses == null ? '' : `\nValidated courses in this program: ${input.totalCourses}`
  }${
    isFirstCompletion ? '\nNote: This is the learner\'s FIRST completion in this program. Write with appropriate energy.' : ''
  }

${outreachRule}

Produce the JSON object as specified.`;

  return {
    systemPrompt,
    userPrompt,
    promptVersion: CASCADE_PROMPT_VERSION,
  };
}
