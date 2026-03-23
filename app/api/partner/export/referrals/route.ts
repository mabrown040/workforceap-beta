import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const rows = toPartnerMembersListRows(pipelineMembers);

  const emails = await prisma.user.findMany({
    where: { id: { in: pipelineMembers.map((p) => p.member.id) } },
    select: { id: true, email: true },
  });
  const emailById = new Map(emails.map((e) => [e.id, e.email]));

  const headers = [
    'Member name',
    'Email',
    'Stage',
    'Program',
    'Progress pct',
    'Story',
    'Last updated',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.fullName),
        csvEscape(emailById.get(r.id) ?? ''),
        csvEscape(r.stageLabel),
        csvEscape(r.programTitle),
        String(r.progress),
        csvEscape(r.story),
        csvEscape(r.updatedAtLabel),
      ].join(',')
    ),
  ];

  const csv = lines.join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="workforceap-referrals-${ctx.partner.slug}.csv"`,
    },
  });
}
