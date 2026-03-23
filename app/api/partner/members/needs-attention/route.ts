import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';
import { PIPELINE_STAGE_LABELS } from '@/lib/pipeline/stage';

const STALE_DAYS = 7;

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const since = new Date();
  since.setDate(since.getDate() - STALE_DAYS);

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);

  const stale = pipelineMembers.filter((p) => {
    if (p.stage !== 'applied' && p.stage !== 'enrolled') return false;
    return p.member.updatedAt < since;
  });

  return NextResponse.json({
    members: stale.map((p) => ({
      id: p.member.id,
      fullName: p.member.fullName,
      stage: p.stage,
      stageLabel: PIPELINE_STAGE_LABELS[p.stage as keyof typeof PIPELINE_STAGE_LABELS] ?? p.stage,
      programTitle: p.programTitle,
      lastUpdatedAt: p.member.updatedAt.toISOString(),
      staleDays: Math.floor((Date.now() - p.member.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  });
}
