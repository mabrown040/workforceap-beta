import { z } from 'zod';

// ─── AI Coach Text Output (cover letter, gap analyzer, linkedin about, salary negotiation, resume rewriter) ───
export const aiTextOutputResponseSchema = z.object({
  output: z.string().min(1),
});

export type AiTextOutputResponse = z.infer<typeof aiTextOutputResponseSchema>;

// ─── Elevator Pitch ───
export const elevatorPitchResponseSchema = z.object({
  pitch: z.string().min(1),
  emailSent: z.boolean().optional(),
  emailError: z.string().optional(),
});

export type ElevatorPitchResponse = z.infer<typeof elevatorPitchResponseSchema>;

// ─── Interview Practice ───
export const interviewPracticeResponseSchema = z.object({
  questions: z.array(z.string().min(1)),
});

export type InterviewPracticeResponse = z.infer<typeof interviewPracticeResponseSchema>;

// ─── LinkedIn Headlines ───
export const linkedinHeadlinesResponseSchema = z.object({
  headlines: z.array(z.string().min(1)),
});

export type LinkedinHeadlinesResponse = z.infer<typeof linkedinHeadlinesResponseSchema>;

// ─── Job Match Scorer ───
export const jobMatchScorerParsedSchema = z.object({
  matchScore: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  gaps: z.array(z.string()).optional(),
  quickWins: z.array(z.string()).optional(),
});

export const jobMatchScorerResponseSchema = z.object({
  output: z.string().min(1),
  parsed: jobMatchScorerParsedSchema.optional(),
  scrapedFromUrl: z.boolean().optional(),
  scrapeSource: z.string().optional(),
});

export type JobMatchScorerResponse = z.infer<typeof jobMatchScorerResponseSchema>;

// ─── Skill Mapper (search by occupation) ───
export const skillMapperOccupationResultSchema = z.object({
  occupations: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
    })
  ),
  demo: z.boolean().optional(),
});

export const skillMapperDetailSchema = z.object({
  occupationTitle: z.string(),
  occupationCode: z.string(),
  skills: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string().optional(),
      importance: z.number().optional(),
      level: z.number().optional(),
    })
  ),
  radarAxes: z.array(
    z.object({
      axis: z.string(),
      value: z.number(),
      hasData: z.boolean().optional(),
    })
  ),
  totalSkills: z.number(),
  matchedPrograms: z.array(z.string()).optional(),
  demo: z.boolean().optional(),
});

export type SkillMapperOccupationResult = z.infer<typeof skillMapperOccupationResultSchema>;
export type SkillMapperDetail = z.infer<typeof skillMapperDetailSchema>;

// ─── Coach Chat ───
export const coachChatResponseSchema = z.object({
  reply: z.string().min(1),
});

export type CoachChatResponse = z.infer<typeof coachChatResponseSchema>;

// ─── Career Business Coach Completion ───
export const careerBusinessCoachCompletionResponseSchema = z.object({
  ok: z.boolean(),
  skipped: z.boolean().optional(),
});

export type CareerBusinessCoachCompletionResponse = z.infer<typeof careerBusinessCoachCompletionResponseSchema>;

// ─── Career Business Coach Voice Session ───
export const careerBusinessCoachVoiceSessionResponseSchema = z.object({
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

export type CareerBusinessCoachVoiceSessionResponse = z.infer<typeof careerBusinessCoachVoiceSessionResponseSchema>;

// ─── Resume Coach Live Suggestions ───
export const resumeCoachLiveSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export type ResumeCoachLiveSuggestionsResponse = z.infer<typeof resumeCoachLiveSuggestionsResponseSchema>;

// ─── Resume Coach Session ───
export const resumeCoachSessionResponseSchema = z.object({
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  dynamicVariables: z.record(z.unknown()).optional(),
});

export type ResumeCoachSessionResponse = z.infer<typeof resumeCoachSessionResponseSchema>;
