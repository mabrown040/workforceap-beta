import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY, CRON_CATEGORY_COLOR } from '@/lib/admin/cronRegistry';
import { getEmailTemplateDemoByCronId } from '@/lib/admin/emailTemplateDemoPreviews';
import PageHeader from '@/components/portal/PageHeader';
import EmailTemplatesClient from '@/components/admin/EmailTemplatesClient';
import { brandedEmailLayout } from '@/lib/email/template';

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
  return CRON_REGISTRY.map((cron) => {
    const demo = getEmailTemplateDemoByCronId(cron.id);
    if (!demo) return null;
    return {
      cronId: cron.id,
      cronName: cron.name,
      category: cron.category,
      icon: cron.icon,
      subject: demo.subject,
      html: brandedEmailLayout({
        title: demo.title,
        bodyHtml: demo.bodyHtml,
        ctaText: demo.ctaText,
        ctaUrl: demo.ctaUrl,
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
