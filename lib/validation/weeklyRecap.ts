import { z } from 'zod';

export const recapWinSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1),
  value: z.number().optional(),
  icon: z.string().optional(),
});

export const recapGoalProgressSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  status: z.string().min(1),
  stepsDone: z.number().optional(),
  stepsTotal: z.number().optional(),
  currentMetricValue: z.number().nullable().optional(),
  targetMetricValue: z.number().nullable().optional(),
  percent: z.number().nullable().optional(),
});

export const recapPlanItemSchema = z.object({
  key: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  href: z.string().optional(),
  cta: z.string().optional(),
  source: z.enum(['goal', 'action']).optional(),
  icon: z.string().optional(),
});

export const motivatingRecapDataSchema = z.object({
  headline: z.string().optional(),
  wins: z.array(recapWinSchema).optional(),
  pointsThisWeek: z.number().optional(),
  pointsTotal: z.number().optional(),
  level: z.string().optional(),
  goalProgress: z.array(recapGoalProgressSchema).optional(),
  nextWeekPlan: z.array(recapPlanItemSchema).optional(),
  weekInReview: z.object({
    applicationsAdded: z.number().optional(),
    resourcesCompleted: z.number().optional(),
    aiToolsUsed: z.number().optional(),
    pathwayStepsCompleted: z.number().optional(),
    newLiveJobsThisWeek: z.number().optional(),
  }).optional(),
  recommendedActions: z.array(z.string()).optional(),
}).nullable();

export type MotivatingRecapData = z.infer<typeof motivatingRecapDataSchema>;
