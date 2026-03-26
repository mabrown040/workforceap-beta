import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import AdminSuperMessagesClient from '@/components/admin/AdminSuperMessagesClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Counselor messages (super admin)',
  description: 'Read-only oversight of member–counselor message threads and SLA alerts.',
  path: '/admin/messages',
});

export default async function AdminMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/messages');
  if (!(await isSuperAdmin(user.id))) redirect('/admin');

  return <AdminSuperMessagesClient />;
}
