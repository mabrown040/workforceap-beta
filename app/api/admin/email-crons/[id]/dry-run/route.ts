import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { prisma } from '@/lib/db/prisma';
import { buildWeeklyRecapEmailSummary } from '@/lib/recap/buildWeeklyRecapEmailSummary';
import {
  weeklyRecapHtml,
  inactiveNudgeHtml,
  applicantFollowupHtml,
  adminWeeklyRecapHtml,
  partnerWeeklyDigestHtml,
  courseCompletedHtml,
} from '@/emails';
import { brandedEmailLayout } from '@/lib/email/template';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const { id } = await params;
    const cron = CRON_REGISTRY.find(c => c.id === id);
    if (!cron) return NextResponse.json({ error: 'Cron not found' }, { status: 404 });
  
    try {
      const result = await simulateCron(id);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Dry-run failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/email-crons/[id]/dry-run:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

type DryRunResult = {
  cronId: string;
  cronName: string;
  recipientCount: number;
  sampleRecipient: { email: string; name: string | null } | null;
  subject: string;
  htmlPreview: string;
  note?: string;
};

async function simulateCron(id: string): Promise<DryRunResult> {
  const cron = CRON_REGISTRY.find(c => c.id === id)!;

  switch (id) {
    case 'weekly-recap': {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
      weekStart.setHours(0, 0, 0, 0);
      // Mirror the production weekly-recap recipient filter: a user is
      // eligible if they have ANY course_enrollments row OR the legacy
      // `enrolledProgram` pointer is set (covers unmigrated users).
      const recipientWhere = {
        deletedAt: null,
        OR: [
          { courseEnrollments: { some: {} } },
          { enrolledProgram: { not: null } },
        ],
        weeklyRecaps: { none: { weekStartDate: { gte: weekStart } } },
      };
      const members = await prisma.$transaction((tx) => tx.user.findMany({
        where: recipientWhere,
        select: { email: true, fullName: true },
        take: 1,
      }));
      const sample = members[0] ?? null;
      const firstName = sample?.fullName?.split(' ')[0] ?? 'Alex';
      const sampleSummary = buildWeeklyRecapEmailSummary({
        weekInReview: {
          applicationsAdded: 2,
          resourcesCompleted: 1,
          aiToolsUsed: 2,
          pathwayStepsCompleted: 0,
          newLiveJobsThisWeek: 3,
        },
        readinessScoreSnapshot: 72,
        goalsSnapshot: [
          { title: 'Complete Module 3', status: 'in_progress', currentMetricValue: 2, targetMetricValue: 5 },
        ],
        upcomingCounselorSessions: [{ at: 'Mon, Jun 9, 2:00 PM EDT', topic: 'Resume review' }],
        recommendedActions: ['Build your resume with the Resume Rewriter', 'Practice interview questions'],
      });
      const body = weeklyRecapHtml({ firstName, recapSummary: sampleSummary });
      const html = brandedEmailLayout({ title: 'Your Weekly Recap', bodyHtml: body, ctaText: 'View Dashboard', ctaUrl: '/dashboard' });
      return {
        cronId: id, cronName: cron.name,
        recipientCount: await prisma.$transaction((tx) => tx.user.count({ where: recipientWhere })),
        sampleRecipient: sample ? { email: sample.email ?? '', name: sample.fullName } : null,
        subject: 'Your WorkforceAP Weekly Recap',
        htmlPreview: html,
      };
    }

    case 'inactive-nudge': {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentlyActive = await prisma.$transaction((tx) => tx.memberEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: sevenDaysAgo } } }));
      const activeUserIds = new Set(recentlyActive.map(r => r.userId));
      const members = await prisma.$transaction((tx) => tx.user.findMany({
        where: { deletedAt: null, notificationsReminders: true, id: { notIn: [...activeUserIds] } },
        select: { email: true, fullName: true },
        take: 1,
      }));
      const sample = members[0] ?? null;
      const firstName = sample?.fullName?.split(' ')[0] ?? 'Jordan';
      const body = inactiveNudgeHtml({ firstName });
      const html = brandedEmailLayout({ title: 'We Miss You', bodyHtml: body, ctaText: 'Resume Training', ctaUrl: '/dashboard' });
      return {
        cronId: id, cronName: cron.name,
        recipientCount: await prisma.$transaction((tx) => tx.user.count({ where: { deletedAt: null, notificationsReminders: true, id: { notIn: [...activeUserIds] } } })),
        sampleRecipient: sample ? { email: sample.email ?? '', name: sample.fullName } : null,
        subject: 'We Miss You at WorkforceAP',
        htmlPreview: html,
      };
    }

    case 'inactivity-nudge': {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const recentActiveIds = await prisma.$transaction((tx) => tx.memberEvent.findMany({ take: 500, where: { createdAt: { gte: fourteenDaysAgo } }, select: { userId: true }, distinct: ['userId'] }));
      const activeSet = new Set(recentActiveIds.map(r => r.userId));
      // Mirror the production inactivity-nudge recipient filter: a user
      // is eligible if they have ANY course_enrollments row OR the legacy
      // `enrolledProgram` pointer is set (covers unmigrated users).
      const recipientWhere = {
        deletedAt: null,
        OR: [
          { courseEnrollments: { some: {} } },
          { enrolledProgram: { not: null } },
        ],
        notificationsReminders: true,
        id: { notIn: [...activeSet] },
      };
      const members = await prisma.$transaction((tx) => tx.user.findMany({
        where: recipientWhere,
        select: { email: true, fullName: true },
        take: 1,
      }));
      const sample = members[0] ?? null;
      const firstName = sample?.fullName?.split(' ')[0] ?? 'Jordan';
      const body = inactiveNudgeHtml({ firstName });
      const html = brandedEmailLayout({ title: 'We Miss You', bodyHtml: body, ctaText: 'Resume Training', ctaUrl: '/dashboard' });
      return {
        cronId: id, cronName: cron.name,
        recipientCount: await prisma.$transaction((tx) => tx.user.count({ where: recipientWhere })),
        sampleRecipient: sample ? { email: sample.email ?? '', name: sample.fullName } : null,
        subject: 'We Miss You at WorkforceAP',
        htmlPreview: html,
      };
    }

    case 'applicant-followup': {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const staleApps = await prisma.$transaction((tx) => tx.application.findMany({
        where: { status: 'PENDING', submittedAt: { lte: threeDaysAgo }, user: { deletedAt: null, notificationsReminders: true } },
        include: { user: { select: { id: true, email: true, fullName: true } } },
        take: 1,
      }));
      const sample = staleApps[0]?.user ?? null;
      const firstName = sample?.fullName?.split(' ')[0] ?? 'Taylor';
      const body = applicantFollowupHtml({ firstName, expectedDate: 'May 9, 2026' });
      const html = brandedEmailLayout({ title: 'Application Update', bodyHtml: body, ctaText: 'Check Application Status', ctaUrl: '/dashboard' });
      const totalCount = await prisma.$transaction((tx) => tx.application.count({
        where: { status: 'PENDING', submittedAt: { lte: threeDaysAgo }, user: { deletedAt: null, notificationsReminders: true } },
      }));
      return {
        cronId: id, cronName: cron.name,
        recipientCount: totalCount,
        sampleRecipient: sample ? { email: sample.email ?? '', name: sample.fullName } : null,
        subject: 'Your WorkforceAP Application is Being Reviewed',
        htmlPreview: html,
      };
    }

    case 'weekly-recap-email': {
      const body = adminWeeklyRecapHtml({ newApplicants: 4, placements: 1, atRiskStudents: 2, pendingApplications: 3 });
      const html = brandedEmailLayout({ title: 'WorkforceAP Weekly Admin Recap', bodyHtml: body, ctaText: 'View Admin Dashboard', ctaUrl: '/admin' });
      return {
        cronId: id, cronName: cron.name,
        recipientCount: 1,
        sampleRecipient: { email: 'info@workforceap.org', name: 'WorkforceAP Admin' },
        subject: 'Weekly Recap: 4 new applicants, 1 placements',
        htmlPreview: html,
        note: 'Sends aggregated stats to the internal admin team.',
      };
    }

    case 'partner-outcome-digest': {
      const partners = await prisma.$transaction((tx) => tx.partner.findMany({ where: { active: true, notifyOnEnrollment: true }, select: { name: true, contactEmail: true }, take: 1 }));
      const sample = partners[0] ?? null;
      const body = partnerWeeklyDigestHtml({ partnerName: sample?.name ?? 'Workforce Solutions', weekLabel: 'May 5–9, 2026', stageLines: ['3 Applied', '2 In Training', '1 Placed'], successLines: ['Maria S. — IT Support Certificate earned'] });
      const html = brandedEmailLayout({ title: 'Your Weekly Partner Digest', bodyHtml: body, ctaText: 'View Partner Portal', ctaUrl: '/partner' });
      const totalCount = await prisma.$transaction((tx) => tx.partner.count({ where: { active: true, notifyOnEnrollment: true, contactEmail: { not: null } } }));
      return {
        cronId: id, cronName: cron.name,
        recipientCount: totalCount,
        sampleRecipient: sample?.contactEmail ? { email: sample.contactEmail, name: sample.name } : null,
        subject: `WorkforceAP weekly referral update — ${sample?.name ?? 'Partner'}`,
        htmlPreview: html,
      };
    }

    case 'milestone-celebration': {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const members = await prisma.$transaction((tx) => tx.user.findMany({
        where: { deletedAt: null, enrolledProgram: { not: null }, assessmentCompleted: true, assessmentCompletedAt: { gte: yesterday } },
        select: { email: true, fullName: true },
        take: 1,
      }));
      const sample = members[0] ?? null;
      const firstName = sample?.fullName?.split(' ')[0] ?? 'Casey';
      const body = courseCompletedHtml({ firstName, courseName: 'IT Support Professional (Google)' });
      const html = brandedEmailLayout({ title: 'Congratulations!', bodyHtml: body, ctaText: 'See Your Progress', ctaUrl: '/dashboard' });
      return {
        cronId: id, cronName: cron.name,
        recipientCount: await prisma.$transaction((tx) => tx.user.count({ where: { deletedAt: null, enrolledProgram: { not: null }, assessmentCompleted: true, assessmentCompletedAt: { gte: yesterday } } })),
        sampleRecipient: sample ? { email: sample.email ?? '', name: sample.fullName } : null,
        subject: 'Congratulations! You Completed IT Support Professional (Google)',
        htmlPreview: html,
      };
    }

    default:
      return { cronId: id, cronName: cron.name, recipientCount: 0, sampleRecipient: null, subject: '', htmlPreview: '', note: 'No dry-run available for this job.' };
  }
}
