import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { repairBrokenOccupationTitles, syncOccupation, syncTopMappedOccupations } from '@/lib/onet/sync';

const bodySchema = z.object({
  onetCodes: z.array(z.string().min(1)).optional(),
  allMapped: z.boolean().optional(),
  repairBrokenTitles: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
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

  const { onetCodes, allMapped, repairBrokenTitles } = parsed.data;

  if (allMapped) {
    const { synced, errors } = await syncTopMappedOccupations();
    return NextResponse.json({ ok: true, synced, errors });
  }

  if (repairBrokenTitles) {
    const { checked, synced, errors } = await repairBrokenOccupationTitles();
    return NextResponse.json({ ok: true, checked, synced, errors });
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

  return NextResponse.json({ error: 'Provide onetCodes, allMapped: true, or repairBrokenTitles: true' }, { status: 400 });
}
