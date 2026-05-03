import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY, CRON_CATEGORY_COLOR } from '@/lib/admin/cronRegistry';
import PageHeader from '@/components/portal/PageHeader';
import EmailTemplatesClient from '@/components/admin/EmailTemplatesClient';
import { brandedEmailLayout } from '@/lib/email/template';
import { weeklyRecapHtml } from '@/emails/weekly-recap';
import { inactiveNudgeHtml } from '@/emails/inactive-nudge';
import { applicantFollowupHtml } from '@/emails/applicant-followup';
import { adminWeeklyRecapHtml } from '@/emails/admin-weekly-recap';
import { partnerWeeklyDigestHtml } from '@/emails/partner-weekly-digest';
import { courseCompletedHtml } from '@/emails/course-completed';

export const metadata: Metadata = buildPageMetadata({
  title: 'Email Template Previews',
  description: 'Preview the subject line and HTML body for each scheduled email.',
  path: '/admin/email-templates',
});

export type TemplateSample = {
  cronId: string;
  cronName: string;
  category: string;
  icon: string;
  subject: string;
  html: string;
};

function buildSamples(): TemplateSample[] {
  const weeklyRecapBody = weeklyRecapHtml({
    firstName: 'Alex',
    recapSummary: 'You completed 2 lessons this week. Your next step is Module 3: Networking Fundamentals. Keep it up!',
  });

  const inactiveBody = inactiveNudgeHtml({ firstName: 'Jordan' });

  const applicantBody = applicantFollowupHtml({
    firstName: 'Taylor',
    expectedDate: 'May 9, 2026',
  });

  const adminRecapBody = adminWeeklyRecapHtml({
    newApplicants: 4,
    placements: 1,
    atRiskStudents: 2,
    pendingApplications: 3,
  });

  const partnerDigestBody = partnerWeeklyDigestHtml({
    partnerName: 'Workforce Solutions',
    weekLabel: 'May 5–9, 2026',
    stageLines: ['3 Applied', '2 In Training', '1 Placed'],
    successLines: [
      'Maria S. — IT Support Certificate earned',
      'James R. — Job placement confirmed',
    ],
  });

  const milestoneBody = courseCompletedHtml({
    firstName: 'Casey',
    courseName: 'IT Support Professional (Google)',
  });

  const cMap: Record<string, { subject: string; body: string; ctaText?: string; ctaUrl?: string; title: string }> = {
    'weekly-recap': {
      title: 'Your Weekly Recap',
      subject: 'Your WorkforceAP Weekly Recap',
      body: weeklyRecapBody,
      ctaText: 'View Dashboard',
      ctaUrl: '/dashboard',
    },
    'inactive-nudge': {
      title: 'We Miss You',
      subject: 'We Miss You at WorkforceAP',
      body: inactiveBody,
      ctaText: 'Resume Training',
      ctaUrl: '/dashboard',
    },
    'inactivity-nudge': {
      title: 'We Miss You',
      subject: 'We Miss You at WorkforceAP',
      body: inactiveBody,
      ctaText: 'Resume Training',
      ctaUrl: '/dashboard',
    },
    'applicant-followup': {
      title: 'Application Update',
      subject: 'Your WorkforceAP Application is Being Reviewed',
      body: applicantBody,
      ctaText: 'Check Application Status',
      ctaUrl: '/dashboard',
    },
    'weekly-recap-email': {
      title: 'WorkforceAP Weekly Admin Recap',
      subject: 'Weekly Recap: 4 new applicants, 1 placements',
      body: adminRecapBody,
      ctaText: 'View Admin Dashboard',
      ctaUrl: '/admin',
    },
    'partner-outcome-digest': {
      title: 'Your Weekly Partner Digest',
      subject: 'WorkforceAP weekly referral update — Workforce Solutions',
      body: partnerDigestBody,
      ctaText: 'View Partner Portal',
      ctaUrl: '/partner',
    },
    'milestone-celebration': {
      title: 'Congratulations!',
      subject: 'Congratulations! You Completed IT Support Professional (Google)',
      body: milestoneBody,
      ctaText: 'See Your Progress',
      ctaUrl: '/dashboard',
    },
  };

  return CRON_REGISTRY.map(cron => {
    const s = cMap[cron.id];
    if (!s) return null;
    return {
      cronId: cron.id,
      cronName: cron.name,
      category: cron.category,
      icon: cron.icon,
      subject: s.subject,
      html: brandedEmailLayout({
        title: s.title,
        bodyHtml: s.body,
        ctaText: s.ctaText,
        ctaUrl: s.ctaUrl,
      }),
    };
  }).filter((s): s is TemplateSample => s !== null);
}

export default async function AdminEmailTemplatesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/email-templates');
  try { await requireAdmin(user.id); } catch { redirect('/dashboard'); }

  const samples = buildSamples();

  return (
    <div>
      <PageHeader
        title="Email Template Previews"
        subtitle="Sample HTML and subject lines for all scheduled email jobs. Uses hardcoded demo data — no live DB reads."
        breadcrumbs={[
          { label: 'Email & Cron Management', href: '/admin/email-crons' },
          { label: 'Template Previews' },
        ]}
      />

      <div style={{ padding: '0.875rem 1rem', background: 'rgba(43,123,185,0.07)', border: '1px solid rgba(43,123,185,0.15)', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--color-blue, #2b7bb9)' }}>Demo data only.</strong>{' '}
        These previews use hardcoded sample values (e.g. &ldquo;Alex&rdquo;, &ldquo;Workforce Solutions&rdquo;). Actual emails
        are rendered per-recipient with live data at send time. Subject lines reflect the real templates.
      </div>

      <EmailTemplatesClient samples={samples} categoryColors={CRON_CATEGORY_COLOR} />
    </div>
  );
}
