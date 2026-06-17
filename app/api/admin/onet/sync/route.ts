import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { syncOccupation, syncTopMappedOccupations } from '@/lib/onet/sync';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  onetCodes: z.array(z.string().min(1)).optional(),
  allMapped: z.boolean().optional(),
});

async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { onetCodes, allMapped } = parsed.data;

  if (allMapped) {
    const { synced, errors } = await syncTopMappedOccupations();
    return NextResponse.json({ ok: true, synced, errors });
  }

  if (onetCodes?.length) {
    const errors: string[] = [];
    let ok = 0;
    for (const code of onetCodes) {
      const r = await syncOccupation(code);
      if (r.ok) ok++;
      else if (r.error) errors.push(`${code}: ${r.error}`);
    }
    return NextResponse.json({ ok: true, synced: ok, errors });
  }

  return NextResponse.json({ error: 'Provide onetCodes or allMapped: true' }, { status: 400 });

  } catch (error) {
    console.error('/admin/onet/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
