import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadLabWorkspace, saveLabDraft } from '@/lib/member/labWorkspace';
import { labDraftInputSchema } from '@/lib/member/labWorkspaceTypes';
import { labJson, labFailure, readLabJson, requireLabMutationOrigin } from '@/lib/member/labApi';

type Context = { params: Promise<{ labId: string }> };
export const GET = withApiGuc(async (request: Request, context: Context) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  if (new URL(request.url).search) return labJson({ error: 'Invalid query.' }, 400);
  const { labId } = await context.params;
  if (!/^[a-z0-9-]{1,180}$/.test(labId)) return labJson({ error: 'Invalid lab.' }, 400);
  try { return labJson({ workspace: await loadLabWorkspace({ userId: user.id, labId }) }); }
  catch (error) { return labFailure(error); }
});
export const PUT = withApiGuc(async (request: Request, context: Context) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  const originError = requireLabMutationOrigin(request);
  if (originError) return originError;
  const raw = await readLabJson(request);
  if ('response' in raw) return raw.response;
  const parsed = labDraftInputSchema.safeParse(raw.body);
  if (!parsed.success) return labJson({ error: 'Check the draft fields, answer lengths, and evidence link.' }, 400);
  const { labId } = await context.params;
  try { return labJson({ workspace: await saveLabDraft(user.id, labId, parsed.data) }); }
  catch (error) { return labFailure(error); }
});
