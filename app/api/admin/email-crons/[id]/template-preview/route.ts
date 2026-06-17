import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { brandedEmailLayout } from '@/lib/email/template';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { weeklyRecapHtml } from '@/emails/weekly-recap';
import { inactiveNudgeHtml } from '@/emails/inactive-nudge';
import { applicantFollowupHtml } from '@/emails/applicant-followup';
import { adminWeeklyRecapHtml } from '@/emails/admin-weekly-recap';
import { partnerWeeklyDigestHtml } from '@/emails/partner-weekly-digest';
import { courseCompletedHtml } from '@/emails/course-completed';

export type TemplatePreviewResponse = {
  cronId: string;
  cronName: string;
  subject: string;
  html: string;
};

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiGuc(async (req: NextRequest, ctx: RouteContext) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  const { id } = await ctx.params;

  const preview = buildPreview(id);
  if (!preview) return NextResponse.json({ error: 'Unknown cron id' }, { status: 404 });

  return NextResponse.json(preview);

  } catch (error) {
    console.error('/admin/email-crons/[id]/template-preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


function buildPreview(id: string): TemplatePreviewResponse | null {
  switch (id) {
    case 'weekly-recap': {
      const body = weeklyRecapHtml({
        firstName: 'Alex',
        recapSummary: 'You completed 2 lessons this week. Your next step is Module 3: Networking Fundamentals. Keep it up!',
      });
      return {
        cronId: id,
        cronName: 'Weekly Recap Email',
        subject: 'Your WorkforceAP Weekly Recap',
        html: brandedEmailLayout({
          title: 'Your Weekly Recap',
          bodyHtml: body,
          ctaText: 'View Dashboard',
          ctaUrl: '/dashboard',
        }),
      };
    }

    case 'inactive-nudge': {
      const body = inactiveNudgeHtml({ firstName: 'Jordan' });
      return {
        cronId: id,
        cronName: 'Inactive Nudge (All Members)',
        subject: 'We Miss You at WorkforceAP',
        html: brandedEmailLayout({
          title: 'We Miss You',
          bodyHtml: body,
          ctaText: 'Resume Training',
          ctaUrl: '/dashboard',
        }),
      };
    }

    case 'inactivity-nudge': {
      const body = inactiveNudgeHtml({ firstName: 'Jordan' });
      return {
        cronId: id,
        cronName: 'Inactivity Nudge (14-Day)',
        subject: 'We Miss You at WorkforceAP',
        html: brandedEmailLayout({
          title: 'We Miss You',
          bodyHtml: body,
          ctaText: 'Resume Training',
          ctaUrl: '/dashboard',
        }),
      };
    }

    case 'applicant-followup': {
      const body = applicantFollowupHtml({
        firstName: 'Taylor',
        expectedDate: 'May 9, 2026',
      });
      return {
        cronId: id,
        cronName: 'Applicant Day-3 Follow-up',
        subject: 'Your WorkforceAP Application is Being Reviewed',
        html: brandedEmailLayout({
          title: 'Application Update',
          bodyHtml: body,
          ctaText: 'Check Application Status',
          ctaUrl: '/dashboard',
        }),
      };
    }

    case 'weekly-recap-email': {
      const body = adminWeeklyRecapHtml({
        newApplicants: 4,
        placements: 1,
        atRiskStudents: 2,
        pendingApplications: 3,
      });
      return {
        cronId: id,
        cronName: 'Admin Weekly Recap',
        subject: 'Weekly Recap: 4 new applicants, 1 placements',
        html: brandedEmailLayout({
          title: 'WorkforceAP Weekly Admin Recap',
          bodyHtml: body,
          ctaText: 'View Admin Dashboard',
          ctaUrl: '/admin',
        }),
      };
    }

    case 'partner-outcome-digest': {
      const body = partnerWeeklyDigestHtml({
        partnerName: 'Workforce Solutions',
        weekLabel: 'May 5–9, 2026',
        stageLines: ['3 Applied', '2 In Training', '1 Placed'],
        successLines: [
          'Maria S. — IT Support Certificate earned',
          'James R. — Job placement confirmed',
        ],
      });
      return {
        cronId: id,
        cronName: 'Partner Weekly Digest',
        subject: 'WorkforceAP weekly referral update — Workforce Solutions',
        html: brandedEmailLayout({
          title: 'Your Weekly Partner Digest',
          bodyHtml: body,
          ctaText: 'View Partner Portal',
          ctaUrl: '/partner',
        }),
      };
    }

    case 'milestone-celebration': {
      const body = courseCompletedHtml({
        firstName: 'Casey',
        courseName: 'IT Support Professional (Google)',
      });
      return {
        cronId: id,
        cronName: 'Milestone Celebration',
        subject: 'Congratulations! You Completed IT Support Professional (Google)',
        html: brandedEmailLayout({
          title: 'Congratulations!',
          bodyHtml: body,
          ctaText: 'See Your Progress',
          ctaUrl: '/dashboard',
        }),
      };
    }

    default:
      return null;
  }
}
