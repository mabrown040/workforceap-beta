import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadLabReview, reviewLabEvidence } from '@/lib/member/labWorkspace';
import { labReviewInputSchema } from '@/lib/member/labWorkspaceTypes';
import { labJson, labFailure, readLabJson, requireLabMutationOrigin } from '@/lib/member/labApi';

type Context = { params: Promise<{ submissionId: string }> };
export const GET = withApiGuc(async (request: Request, context: Context) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  if (new URL(request.url).search) return labJson({ error: 'Invalid query.' }, 400);
  const { submissionId } = await context.params;
  if (!z.string().uuid().safeParse(submissionId).success) return labJson({ error: 'Invalid submission.' }, 400);
  try {
    const review = await loadLabReview({ userId: user.id, submissionId });
    return review ? labJson({ review }) : labJson({ error: 'Submission not found.' }, 404);
  } catch (error) { return labFailure(error); }
});
export const POST = withApiGuc(async (request: Request, context: Context) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  const originError = requireLabMutationOrigin(request);
  if (originError) return originError;
  const raw = await readLabJson(request);
  if ('response' in raw) return raw.response;
  const parsed = labReviewInputSchema.safeParse(raw.body);
  if (!parsed.success) return labJson({ error: 'Check the review decision, feedback, and rubric scores.' }, 400);
  const { submissionId } = await context.params;
  if (!z.string().uuid().safeParse(submissionId).success) return labJson({ error: 'Invalid submission.' }, 400);
  try { return labJson({ review: await reviewLabEvidence(user.id, submissionId, parsed.data) }); }
  catch (error) { return labFailure(error); }
});
