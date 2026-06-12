import 'server-only';

import { claudeChat } from './anthropicChat';
import { saveAIToolResult } from '@/lib/ai/saveResult';

// ---------------------------------------------------------------------------
// Shared types (also exported so the route and other callers can reference them)
// ---------------------------------------------------------------------------

export type MissionResult = {
  verdict: 'passed' | 'needs_retry';
  coachingNote: string;
  starStory: string;
  resumeBullet: string;
  skillsUnlocked: string[];
};

export type MissionEvalRequest = {
  courseSlug: string;
  programSlug: string;
  missionKey: string;
  courseTitle: string;
  skillLabels: string[];
  scenarioPrompt: string;
  evidenceHint: string;
  quizAnswers: { questionIndex: number; selectedIndex: number; correct: boolean }[];
  scenarioResponse: string;
};

export type MissionEvalResponse =
  | {
      ok: true;
      verdict: 'passed' | 'needs_retry';
      coachingNote: string;
      starStory: string;
      resumeBullet: string;
      skillsUnlocked: string[];
      aiToolResultId: string | null;
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function quizSummary(answers: MissionEvalRequest['quizAnswers']): string {
  const correct = answers.filter((a) => a.correct).length;
  return `${correct}/${answers.length} correct`;
}

function buildSystemPrompt(): string {
  return `You are a career coach evaluating a student's skill demonstration on a workforce development platform.

You will receive:
- The course title and skill labels the course covers
- The scenario prompt the student was asked to respond to
- Evidence hints (what a strong response should mention)
- A quiz performance summary (e.g. "2/3 correct")
- The student's full scenario response

Your job is to evaluate the quality of their demonstration and return a JSON object with EXACTLY these fields:

{
  "verdict": "passed" | "needs_retry",
  "coachingNote": string,
  "starStory": string,
  "resumeBullet": string,
  "skillsUnlocked": string[]
}

VERDICT RULES:
- "passed" if: quiz score is 2/3 or higher AND the scenario response demonstrates at least 2 of the skill labels
- "needs_retry" otherwise

COACHING NOTE:
- 2–4 sentences, warm and specific to this student's actual response
- If "needs_retry": name exactly what to revisit and which course section covers it
- If "passed": acknowledge what they did well and offer one growth tip

STAR STORY:
- Situation-Task-Action-Result format
- First person, past tense — reads like something you'd say in a real job interview
- ~100 words, 4–6 sentences
- Grounded in the student's actual response text — do not invent details not present
- Employer-ready language

RESUME BULLET:
- Single line, starts with a strong action verb
- Employer-ready, quantified where possible
- ~15 words
- Example: "Diagnosed and resolved 15+ technical support tickets using systematic troubleshooting methodology"

SKILLS UNLOCKED:
- Array of strings drawn ONLY from the provided skillLabels list
- Include only skills that are clearly demonstrated in the student's response text

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation text, no preamble. The response must be valid JSON that can be parsed directly.`;
}

function buildUserContent(req: MissionEvalRequest): string {
  const correctCount = req.quizAnswers.filter((a) => a.correct).length;
  const lines = [
    `COURSE: ${req.courseTitle}`,
    `SKILL LABELS: ${req.skillLabels.join(', ')}`,
    '',
    `SCENARIO PROMPT:`,
    req.scenarioPrompt,
    '',
    `EVIDENCE HINTS (what a strong response should address):`,
    req.evidenceHint,
    '',
    `QUIZ PERFORMANCE: ${quizSummary(req.quizAnswers)} (${correctCount >= 2 ? 'meets threshold' : 'below threshold'})`,
    '',
    `STUDENT SCENARIO RESPONSE:`,
    '---',
    req.scenarioResponse,
    '---',
    '',
    'Evaluate this student and return the JSON object as described.',
  ];
  return lines.join('\n');
}

type RawEvalShape = {
  verdict: unknown;
  coachingNote: unknown;
  starStory: unknown;
  resumeBullet: unknown;
  skillsUnlocked: unknown;
};

function parseEvalJson(raw: string): MissionResult | null {
  let parsed: unknown;
  try {
    // Strip markdown fences if the model wrapped them despite instructions
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as RawEvalShape;

  if (
    (p.verdict !== 'passed' && p.verdict !== 'needs_retry') ||
    typeof p.coachingNote !== 'string' ||
    typeof p.starStory !== 'string' ||
    typeof p.resumeBullet !== 'string' ||
    !Array.isArray(p.skillsUnlocked)
  ) {
    return null;
  }

  return {
    verdict: p.verdict,
    coachingNote: p.coachingNote,
    starStory: p.starStory,
    resumeBullet: p.resumeBullet,
    skillsUnlocked: (p.skillsUnlocked as unknown[])
      .filter((s): s is string => typeof s === 'string'),
  };
}

function buildFallback(req: MissionEvalRequest): MissionResult {
  const correctCount = req.quizAnswers.filter((a) => a.correct).length;
  const verdict: 'passed' | 'needs_retry' = correctCount >= 2 ? 'passed' : 'needs_retry';
  return {
    verdict,
    coachingNote: 'Great effort! Keep building on your skills.',
    starStory: `In my ${req.courseTitle} training, I worked through scenarios involving ${req.skillLabels.slice(0, 2).join(' and ')}. I was tasked with demonstrating practical knowledge in these areas. I applied the concepts from the course to construct a thoughtful response. This experience deepened my understanding of workforce skills.`,
    resumeBullet: `Completed ${req.courseTitle} training demonstrating ${req.skillLabels[0] ?? 'core workforce skills'}`,
    skillsUnlocked: verdict === 'passed' ? req.skillLabels.slice(0, 2) : [],
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function evaluateSkillMission(
  args: MissionEvalRequest & { userId: string }
): Promise<MissionResult & { aiToolResultId: string | null }> {
  const systemPrompt = buildSystemPrompt();
  const userContent = buildUserContent(args);

  let result: MissionResult | null = null;

  // First attempt
  const raw = await claudeChat(systemPrompt, userContent, { maxTokens: 1200, temperature: 0.4 });
  if (raw) {
    result = parseEvalJson(raw);
  }

  // Retry with a stricter instruction if parsing failed
  if (!result) {
    const retryContent = `${userContent}\n\nCRITICAL: Your previous response could not be parsed as JSON. Return ONLY a valid JSON object matching the schema — no markdown, no explanation text, no code fences.`;
    const raw2 = await claudeChat(systemPrompt, retryContent, { maxTokens: 1200, temperature: 0.2 });
    if (raw2) {
      result = parseEvalJson(raw2);
    }
  }

  // Safe fallback if both attempts failed
  if (!result) {
    console.error('[skillMissionEval] AI parse failed after retry — using fallback for user', args.userId);
    result = buildFallback(args);
  }

  // Persist to AIToolResult if the student passed
  let aiToolResultId: string | null = null;
  if (result.verdict === 'passed') {
    try {
      aiToolResultId = await saveAIToolResult(
        args.userId,
        // skill_mission is added to the enum by a parallel agent; cast to
        // satisfy TypeScript until the Prisma client is regenerated.
        'skill_mission' as Parameters<typeof saveAIToolResult>[1],
        `${args.courseTitle} | ${args.programSlug} | ${args.skillLabels.slice(0, 3).join(', ')}`,
        `STAR Story:\n${result.starStory}\n\nResume Bullet:\n${result.resumeBullet}`,
      );
    } catch (saveErr) {
      console.error('[skillMissionEval] saveAIToolResult failed:', saveErr instanceof Error ? saveErr.message : saveErr);
      // Non-fatal — don't throw
    }
  }

  return { ...result, aiToolResultId };
}
