import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

/**
 * GET /api/counselor/placements
 * Returns all placement records. Counselor/admin only.
 * Query params: memberId, employerName, days (recent N days)
 * 
 * POST /api/counselor/placements
 * Creates a new placement record. Counselor/admin only.
 * Body: { userId, employerName, jobTitle, startDate, salaryOffered, programSlug, notes }
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  const isStaff = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'counselor';
  if (!isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const days = parseInt(searchParams.get('days') ?? '0', 10);

  let query = `
    SELECT 
      pr.*,
      u.email as member_email
    FROM placement_records pr
    JOIN users u ON u.id = pr.user_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (memberId) {
    query += ` AND pr.user_id = $${params.length + 1}`;
    params.push(memberId);
  }
  
  if (days > 0) {
    query += ` AND pr.placed_at >= $${params.length + 1}`;
    params.push(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  }
  
  query += ` ORDER BY pr.placed_at DESC`;

  const placements = await prisma.$queryRawUnsafe(query, ...params);

  return NextResponse.json({ placements: placements as any[] });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  const isStaff = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'counselor';
  if (!isStaff) {
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

  return NextResponse.json({ ok: true, placement: (placement as any[])[0] });
}
