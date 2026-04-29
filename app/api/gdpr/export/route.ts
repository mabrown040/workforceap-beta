import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { checkInterestProfilerRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * GET /api/gdpr/export
 * Returns all personal data for the authenticated user.
 * Implements GDPR Article 20 — Right to data portability.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting for GDPR export - resource intensive operation
  const { success: rateOk } = await checkInterestProfilerRateLimit(user.id);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Export requests are rate limited. Please wait before requesting another export.' },
      { status: 429 }
    );
  }

  const userId = user.id;

  // Fetch all data in parallel
  const [
    profile,
    applications,
    enrollments,
    events,
    messages,
    mentorSessions,
    jobApplications,
    toolResults,
    aiJobMatches,
    learningProgress,
    readinessChecklist,
    goals,
    weeklyRecaps,
    counselorNotes,
    preScreeningResponses,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.$queryRaw`SELECT * FROM applications WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM course_enrollments WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM member_events WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT m.* FROM messages m JOIN message_threads mt ON m.thread_id = mt.id WHERE mt.member_id = ${userId} ORDER BY m.created_at DESC`,
    prisma.$queryRaw`SELECT * FROM mentor_sessions WHERE member_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM job_applications WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM ai_tool_results WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM ai_job_matches WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM learning_progress WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM readiness_checklist WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM goals WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM weekly_recaps WHERE user_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM counselor_notes WHERE member_id = ${userId} ORDER BY created_at DESC`,
    prisma.$queryRaw`SELECT * FROM pre_screening_responses WHERE user_id = ${userId} ORDER BY created_at DESC`,
  ]);

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      id: userId,
      email: user.email,
      createdAt: user.created_at,
    },
    profile,
    applications,
    courseEnrollments: enrollments,
    memberEvents: events,
    messages,
    mentorSessions,
    jobApplications,
    aiToolResults: toolResults,
    aiJobMatches,
    learningProgress,
    readinessChecklist,
    goals,
    weeklyRecaps,
    counselorNotes,
    preScreeningResponses,
  };

  return NextResponse.json(exportData);
}
