import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { buildPlacementsQuery } from '@/lib/counselor/placementsQuery';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { awardPoints } from '@/lib/member/points';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(request: Request) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const days = parseInt(searchParams.get('days') ?? '0', 10);

  if (memberId && !(await assertStaffCanAccessMemberRecord(user.id, memberId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { query, params } = buildPlacementsQuery({
    staffUserId: user.id,
    isAdmin: admin,
    memberId,
    days,
  });

  const placements = await prisma.$queryRawUnsafe(query, ...params);

  return NextResponse.json({ placements: placements as any[] });

  } catch (error) {
    console.error('/counselor/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const employerName = typeof body.employerName === 'string' ? body.employerName.trim() : '';
  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
  const startDate = typeof body.startDate === 'string' ? body.startDate : null;
  const salaryOffered = typeof body.salaryOffered === 'number' ? body.salaryOffered : null;
  const programSlug = typeof body.programSlug === 'string' ? body.programSlug : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

  if (!userId || !employerName || !jobTitle) {
    return NextResponse.json({ error: 'Member, employer, and job title are required' }, { status: 400 });
  }

  if (!(await assertStaffCanAccessMemberRecord(user.id, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Insert placement record
  const placement = await prisma.$queryRaw`
    INSERT INTO placement_records (
      id, user_id, employer_name, job_title, start_date, salary_offered,
      placed_at, placed_by, notes, program_slug, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      ${userId},
      ${employerName},
      ${jobTitle},
      ${startDate ? new Date(startDate) : null},
      ${salaryOffered},
      NOW(),
      ${user.id},
      ${notes},
      ${programSlug},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  // Log as member event
  await prisma.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${userId},
      'placement_recorded',
      'placement',
      ${JSON.stringify({ employerName, jobTitle, salaryOffered, placedBy: user.id })},
      NOW()
    )
  `;

  const row = (placement as any[])[0];

  // Idempotent per (userId, event, entityId) — safe on retry.
  void awardPoints(userId, 'placement_recorded', row.id).catch(() => {});

  auditLog({
    actorUserId: user.id,
    action: 'counselor_placement_recorded',
    targetType: 'User',
    targetId: userId,
    metadata: { employerName, jobTitle, salaryOffered: salaryOffered ?? null, programSlug },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'counselor' },
    verb: 'recorded',
    object: { type: 'PlacementRecord', id: row?.id ?? userId },
    result: { success: true, extensions: { employerName, jobTitle } },
  }).catch(() => {});

  return NextResponse.json({ ok: true, placement: row });

  } catch (error) {
    console.error('/counselor/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
