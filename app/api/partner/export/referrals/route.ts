import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const preset = request.nextUrl.searchParams.get('preset');

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const rows = toPartnerMembersListRows(pipelineMembers);

  const emails = await prisma.user.findMany({
    where: { id: { in: pipelineMembers.map((p) => p.member.id) } },
    select: { id: true, email: true },
  });
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

  const headers = preset === 'outcomes' ? outcomesHeaders : baseHeaders;

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
      return base.join(',');
    }),
  ];

  const csv = lines.join('\r\n');
  const suffix = preset === 'outcomes' ? 'outcomes' : 'referrals';

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="workforceap-${suffix}-${ctx.partner.slug}.csv"`,
    },
  });
}
