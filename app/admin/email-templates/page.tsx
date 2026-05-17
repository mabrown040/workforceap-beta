import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmailTemplatesClient from '@/components/admin/EmailTemplatesClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Email Templates',
    description: 'Preview and manage email templates.',
    path: '/admin/email-templates',
  });
}

export default async function AdminEmailTemplatesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/email-templates');
  try { await requireAdmin(user.id); } catch { redirect('/dashboard'); }

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
      />
      <EmailTemplatesClient
        templates={templates.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }))}
        adminEmail={user.email ?? ''}
      />
    </div>
  );
}
