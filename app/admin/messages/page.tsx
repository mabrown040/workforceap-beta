import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import AdminSuperMessagesClient from '@/components/admin/AdminSuperMessagesClient';
import { MessagesKit } from '@/components/portal/kit/pages/admin-subviews/MessagesKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Portal messages (super admin)',
  description: 'Member, employer, and partner message threads with WorkforceAP staff.',
  path: '/admin/messages',
});
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/messages');
  if (!(await isSuperAdmin(user.id))) redirect('/admin');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;
  if (requestedUi === 'kit') {
    return <MessagesKit />;
  }

  return <AdminSuperMessagesClient />;
}
