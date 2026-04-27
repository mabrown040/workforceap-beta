import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Email Templates',
  description: 'Preview automated email templates.',
  path: '/admin/email-templates',
});

export default async function AdminEmailTemplatesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/email-templates');
  try { await requireAdmin(user.id); } catch { redirect('/dashboard'); }

  return (
    <div className="portal-page">
      <PageHeader
        title="Email Templates"
        description="Preview automated email templates."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Email Templates', href: '/admin/email-templates' },
        ]}
      />
      <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
        <p>Coming soon.</p>
      </div>
    </div>
  );
}
