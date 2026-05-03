import { weeklyRecapHtml } from '@/emails/weekly-recap';
import { inactiveNudgeHtml } from '@/emails/inactive-nudge';
import { applicantFollowupHtml } from '@/emails/applicant-followup';
import { adminWeeklyRecapHtml } from '@/emails/admin-weekly-recap';
import { partnerWeeklyDigestHtml } from '@/emails/partner-weekly-digest';
import { courseCompletedHtml } from '@/emails/course-completed';

/** Demo/sample props for branded email previews (admin UI and API). */
export type EmailTemplateDemoParts = {
  title: string;
  subject: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
};

/**
 * Returns fixed demo content for a scheduled email cron id.
 * Single source of truth for template preview sample data.
 */
export function getEmailTemplateDemoByCronId(cronId: string): EmailTemplateDemoParts | null {
  switch (cronId) {
    case 'weekly-recap': {
      const bodyHtml = weeklyRecapHtml({
        firstName: 'Alex',
        recapSummary:
          'You completed 2 lessons this week. Your next step is Module 3: Networking Fundamentals. Keep it up!',
      });
      return {
        title: 'Your Weekly Recap',
        subject: 'Your WorkforceAP Weekly Recap',
        bodyHtml,
        ctaText: 'View Dashboard',
        ctaUrl: '/dashboard',
      };
    }

    case 'inactive-nudge': {
      const bodyHtml = inactiveNudgeHtml({ firstName: 'Jordan' });
      return {
        title: 'We Miss You',
        subject: 'We Miss You at WorkforceAP',
        bodyHtml,
        ctaText: 'Resume Training',
        ctaUrl: '/dashboard',
      };
    }

    case 'inactivity-nudge': {
      const bodyHtml = inactiveNudgeHtml({ firstName: 'Jordan' });
      return {
        title: 'We Miss You',
        subject: 'We Miss You at WorkforceAP',
        bodyHtml,
        ctaText: 'Resume Training',
        ctaUrl: '/dashboard',
      };
    }

    case 'applicant-followup': {
      const bodyHtml = applicantFollowupHtml({
        firstName: 'Taylor',
        expectedDate: 'May 9, 2026',
      });
      return {
        title: 'Application Update',
        subject: 'Your WorkforceAP Application is Being Reviewed',
        bodyHtml,
        ctaText: 'Check Application Status',
        ctaUrl: '/dashboard',
      };
    }

    case 'weekly-recap-email': {
      const bodyHtml = adminWeeklyRecapHtml({
        newApplicants: 4,
        placements: 1,
        atRiskStudents: 2,
        pendingApplications: 3,
      });
      return {
        title: 'WorkforceAP Weekly Admin Recap',
        subject: 'Weekly Recap: 4 new applicants, 1 placements',
        bodyHtml,
        ctaText: 'View Admin Dashboard',
        ctaUrl: '/admin',
      };
    }

    case 'partner-outcome-digest': {
      const bodyHtml = partnerWeeklyDigestHtml({
        partnerName: 'Workforce Solutions',
        weekLabel: 'May 5–9, 2026',
        stageLines: ['3 Applied', '2 In Training', '1 Placed'],
        successLines: [
          'Maria S. — IT Support Certificate earned',
          'James R. — Job placement confirmed',
        ],
      });
      return {
        title: 'Your Weekly Partner Digest',
        subject: 'WorkforceAP weekly referral update — Workforce Solutions',
        bodyHtml,
        ctaText: 'View Partner Portal',
        ctaUrl: '/partner',
      };
    }

    case 'milestone-celebration': {
      const bodyHtml = courseCompletedHtml({
        firstName: 'Casey',
        courseName: 'IT Support Professional (Google)',
      });
      return {
        title: 'Congratulations!',
        subject: 'Congratulations! You Completed IT Support Professional (Google)',
        bodyHtml,
        ctaText: 'See Your Progress',
        ctaUrl: '/dashboard',
      };
    }

    default:
      return null;
  }
}
