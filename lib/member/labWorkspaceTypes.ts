import { z } from 'zod';
import type { PracticeLab } from '@/lib/content/itSupportLabs';

export const LAB_MAX_ANSWER_LENGTH = 5000;
export const LAB_MAX_ARTIFACT_URL_LENGTH = 2000;
export const LAB_MAX_FEEDBACK_LENGTH = 4000;
export const LAB_MAX_CRITERION_FEEDBACK_LENGTH = 2000;
export const LAB_MAX_REQUEST_LENGTH = 80000;

const slug = z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const version = z.string().min(1).max(80);
const artifactUrl = z.string().trim().max(LAB_MAX_ARTIFACT_URL_LENGTH).url().refine((value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, 'Use an http or https link without embedded credentials.').nullable();

const draftFields = {
  programSlug: slug,
  curriculumVersion: version,
  contentVersion: version,
  expectedDraftRevision: z.number().int().min(0).max(2147483646),
  answers: z.record(z.string().min(1).max(100), z.string().max(LAB_MAX_ANSWER_LENGTH)).refine((value) => Object.keys(value).length <= 20),
  artifactUrl,
};
export const labDraftInputSchema = z.object(draftFields).strict();
export const labSubmitInputSchema = z.object({ ...draftFields, shareForReview: z.literal(true) }).strict();
export type LabDraftInput = z.infer<typeof labDraftInputSchema>;
export type LabSubmitInput = z.infer<typeof labSubmitInputSchema>;
export const labReviewInputSchema = z.object({
  expectedReviewVersion: z.literal(0),
  decision: z.enum(['revision_requested', 'reviewed']),
  feedback: z.string().trim().min(1).max(LAB_MAX_FEEDBACK_LENGTH),
  rubricResults: z.array(z.object({
    criterionId: z.string().min(1).max(100),
    score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    feedback: z.string().trim().max(LAB_MAX_CRITERION_FEEDBACK_LENGTH),
  }).strict()).min(1).max(20),
}).strict();
export type LabReviewInput = z.infer<typeof labReviewInputSchema>;
export type LabReviewStatus = 'submitted' | 'revision_requested' | 'reviewed';
export const labReviewStatusSchema = z.enum(['submitted', 'revision_requested', 'reviewed']);

export type LabEvidenceReview = {
  id: string;
  version: 1;
  decision: 'revision_requested' | 'reviewed';
  feedback: string;
  rubricVersion: string;
  rubricResults: LabReviewInput['rubricResults'];
  reviewer: { displayName: string; role: 'admin' | 'counselor' };
  reviewedAt: string;
};
export type LabEvidenceSubmission = {
  id: string;
  attempt: number;
  draftRevision: number;
  contentVersion: string;
  rubricVersion: string;
  labSnapshot: PracticeLab;
  answers: Record<string, string>;
  artifactUrl: string | null;
  submittedAt: string;
  status: LabReviewStatus;
  reviewVersion: 0 | 1;
  review: LabEvidenceReview | null;
};
export type LabReviewRouting = {
  assignedCounselor: boolean;
  counselorNames: string[];
  description: string;
};
export type LabWorkspace = {
  lab: PracticeLab;
  programSlug: string;
  curriculumVersion: string;
  draft: { revision: number; answers: Record<string, string>; artifactUrl: string | null; updatedAt: string | null };
  submissions: LabEvidenceSubmission[];
  reviewRouting: LabReviewRouting;
};
export type LabReviewQueueItem = {
  submissionId: string;
  member: { id: string; displayName: string; href: string };
  labId: string;
  labTitle: string;
  contentVersion: string;
  programSlug: string;
  curriculumVersion: string;
  attempt: number;
  status: LabReviewStatus;
  submittedAt: string;
  reviewRouting: LabReviewRouting;
};
export type LabReviewQueue = { items: LabReviewQueueItem[]; nextCursor: string | null };
export type LabStaffReviewWorkspace = {
  member: LabReviewQueueItem['member'];
  submission: LabEvidenceSubmission;
  history: LabEvidenceSubmission[];
  reviewRouting: LabReviewRouting;
  canReview: boolean;
};
export type LabApiError = { error: string; code?: string };
