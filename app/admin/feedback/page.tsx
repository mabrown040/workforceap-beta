import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import AdminFeedbackClient from '@/components/admin/AdminFeedbackClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Member Feedback',
    description: 'View and analyze member feedback submissions.',
    path: '/admin/feedback',
  });
}

export default async function AdminFeedbackPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/feedback');

  if (!(await isAdmin(user.id))) redirect('/dashboard');

  return (
    <div className="admin-main-content">
      <PageHeader
        title="Member Feedback"
        subtitle="Review feedback from members on training, counselors, and the platform."
      />
      <AdminFeedbackClient />
    </div>
  );
}
