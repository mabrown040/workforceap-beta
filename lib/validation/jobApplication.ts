import { z } from 'zod';

import { JOB_APPLICATION_SOURCES, JOB_APPLICATION_STAGES } from '@/lib/member/jobApplicationKanban';

const dateField = z.string().min(1).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date');

export const createJobApplicationSchema = z.object({
  jobTitle: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  applicationDate: dateField,
  source: z.enum(JOB_APPLICATION_SOURCES),
  status: z.enum(JOB_APPLICATION_STAGES).optional().default('APPLIED'),
  nextInterviewDate: dateField.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateJobApplicationSchema = z.object({
  jobTitle: z.string().trim().min(1).max(200).optional(),
  company: z.string().trim().min(1).max(200).optional(),
  applicationDate: dateField.optional().nullable(),
  source: z.enum(JOB_APPLICATION_SOURCES).optional(),
  status: z.enum(JOB_APPLICATION_STAGES).optional(),
  nextInterviewDate: dateField.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
