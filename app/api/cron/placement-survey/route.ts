import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPlacementSurveyEmail } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { getProgramBySlug, getProgramDisplayTitle } from '@/lib/content/programs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

/**
 * Daily cron: emails post-placement survey link to members placed ~30 days ago
 * who have not received a survey yet.
 *
 * Deploy: `placement-survey` in vercel.json. Vercel invokes GET.
 */
async function handle(_request: Request) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const windowStart = new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000);

  const surveyUrl = `${SITE_URL}/dashboard/survey`;

  const users = await prisma.user.findMany({
    where: {
      placementRecord: {
        placedAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      placementSurvey: null,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      enrolledProgram: true,
      placementRecord: {
        select: {
          id: true,
          placedAt: true,
        },
      },
    },
  });

  const sent: Array<{ userId: string; email: string }> = [];
  const skipped: Array<{ userId: string; reason: string }> = [];

  for (const user of users) {
    if (!user.email) {
      skipped.push({ userId: user.id, reason: 'No email' });
      continue;
    }
    if (!user.placementRecord) {
      skipped.push({ userId: user.id, reason: 'No placement record' });
      continue;
    }

    const slug = user.enrolledProgram ?? undefined;
    const program = slug ? getProgramBySlug(slug) : undefined;
    const programName = program ? getProgramDisplayTitle(program) : slug ? slug : '';

    const mail = await sendPlacementSurveyEmail({
      to: user.email,
      fullName: user.fullName ?? user.email,
      programName,
      surveyUrl,
    });

    if (!mail.ok) {
      skipped.push({ userId: user.id, reason: mail.error ?? 'Email send failed' });
      continue;
    }

    await prisma.placementSurvey.create({
      data: {
        userId: user.id,
        placementId: user.placementRecord.id,
        sentAt: new Date(),
      },
    });

    sent.push({ userId: user.id, email: user.email });
  }

  const runResult = {
    ok: true,
    sent: sent.length,
    skipped: skipped.length,
    sentList: sent,
    skippedList: skipped,
    checkedAt: new Date().toISOString(),
  };
  await logCronRun('cron_placement_survey', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_placement_survey', handle);
export const POST = withCronLogging('cron_placement_survey', handle);
