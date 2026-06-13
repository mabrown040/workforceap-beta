import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const preset = request.nextUrl.searchParams.get('preset');
  
    try {
    const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId, ctx.partner.organizationId);
    const rows = toPartnerMembersListRows(pipelineMembers);
  
    const emails = await prisma.$transaction((tx) => tx.user.findMany({
      where: {
        id: { in: pipelineMembers.map((p) => p.member.id) },
        organizationId: ctx.partner.organizationId,
      },
      select: { id: true, email: true },
      take: 100,
    }));
    const emailById = new Map(emails.map((e) => [e.id, e.email]));
  
    const baseHeaders = [
      'Member name',
      'Email',
      'Stage',
      'Program',
      'Progress pct',
      'Story',
      'Referred date',
    ];
  
    const outcomesHeaders = [...baseHeaders, 'Placed employer', 'Job title', 'Placed date'];
    const demographicsHeaders = [
      ...baseHeaders,
      'City',
      'State',
      'ZIP',
      'Ethnicity',
      'Veteran status',
      'Employment status',
      'Education level',
      'Placed employer',
      'Job title',
      'Placed date',
      'Onboarding window end',
      'Retention decision',
    ];
  
    const headers =
      preset === 'outcomes' ? outcomesHeaders : preset === 'demographics' ? demographicsHeaders : baseHeaders;
  
    const lines = [
      headers.join(','),
      ...pipelineMembers.map((p, i) => {
        const r = rows[i];
        const pr = p.member.placementRecord;
        const base = [
          csvEscape(r.fullName),
          csvEscape(emailById.get(r.id) ?? ''),
          csvEscape(r.stageLabel),
          csvEscape(r.programTitle),
          String(r.progress),
          csvEscape(r.story),
          csvEscape(r.referredAtLabel),
        ];
        if (preset === 'outcomes') {
          base.push(
            csvEscape(pr?.employerName ?? ''),
            csvEscape(pr?.jobTitle ?? ''),
            pr?.placedAt ? csvEscape(pr.placedAt.toISOString()) : ''
          );
        }
        if (preset === 'demographics') {
          const prof = p.member.profile;
          base.push(
            csvEscape(prof?.city ?? ''),
            csvEscape(prof?.state ?? ''),
            csvEscape(prof?.zip ?? ''),
            csvEscape(prof?.ethnicity ?? ''),
            csvEscape(prof?.veteranStatus ?? ''),
            csvEscape(prof?.employmentStatus ?? ''),
            csvEscape(prof?.educationLevel ?? ''),
            csvEscape(pr?.employerName ?? ''),
            csvEscape(pr?.jobTitle ?? ''),
            pr?.placedAt ? csvEscape(pr.placedAt.toISOString()) : '',
            pr?.onboardingWindowEnd ? csvEscape(pr.onboardingWindowEnd.toISOString()) : '',
            csvEscape(pr?.retentionDecision ?? '')
          );
        }
        return base.join(',');
      }),
    ];
  
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const brandingLines = [
      `# Workforce Advancement Project — Partner ${
        preset === 'outcomes' ? 'Outcomes' : preset === 'demographics' ? 'Demographics' : 'Referrals'
      } Export`,
      `# Partner: ${ctx.partner.name}`,
    ];
    if (ctx.partner.logoUrl) brandingLines.push(`# Logo: ${ctx.partner.logoUrl}`);
    brandingLines.push(
      `# Generated: ${date}`,
      '# Powered by WorkforceAP — workforceap.org',
      '#',
    );
    const brandingHeader = brandingLines.join('\r\n');
    const csv = `${brandingHeader}\r\n${lines.join('\r\n')}`;
    const suffix = preset === 'outcomes' ? 'outcomes' : preset === 'demographics' ? 'demographics' : 'referrals';
  
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="workforceap-${suffix}-${ctx.partner.slug}.csv"`,
      },
    });
    } catch (err) {
      console.error('[partner/export/referrals] error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/partner/export/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
