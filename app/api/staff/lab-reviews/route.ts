import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadLabReviewQueue } from '@/lib/member/labWorkspace';
import { labReviewStatusSchema } from '@/lib/member/labWorkspaceTypes';
import { labJson, labFailure } from '@/lib/member/labApi';

export const GET = withApiGuc(async (request: Request) => {
  const user = await getUser();
  if (!user) return labJson({ error: 'Unauthorized' }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => !['status', 'cursor'].includes(key)) || params.getAll('status').length > 1 || params.getAll('cursor').length > 1) return labJson({ error: 'Invalid query.' }, 400);
  const parsed = z.object({ status: labReviewStatusSchema, cursor: z.string().uuid().nullable() }).safeParse({ status: params.get('status') ?? 'submitted', cursor: params.get('cursor') });
  if (!parsed.success) return labJson({ error: 'Invalid queue filter.' }, 400);
  try { return labJson(await loadLabReviewQueue({ userId: user.id, ...parsed.data })); }
  catch (error) { return labFailure(error); }
});
