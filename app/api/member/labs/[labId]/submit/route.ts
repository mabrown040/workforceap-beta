import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { submitLabEvidence } from '@/lib/member/labWorkspace';
import { labSubmitInputSchema } from '@/lib/member/labWorkspaceTypes';
import { labJson, labFailure, readLabJson, requireLabMutationOrigin } from '@/lib/member/labApi';

export const POST = withApiGuc(async (request: Request, context: { params: Promise<{ labId: string }> }) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  const originError = requireLabMutationOrigin(request);
  if (originError) return originError;
  const raw = await readLabJson(request);
  if ('response' in raw) return raw.response;
  const parsed = labSubmitInputSchema.safeParse(raw.body);
  if (!parsed.success) return labJson({ error: 'Complete the evidence fields and explicitly choose to share this submission for review.' }, 400);
  const { labId } = await context.params;
  try { return labJson({ workspace: await submitLabEvidence(user.id, labId, parsed.data) }); }
  catch (error) { return labFailure(error); }
});
