import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import AdminCounselorsClient from '@/components/admin/AdminCounselorsClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Counselors',
  description: 'Manage WorkforceAP and partner counselors.',
  path: '/admin/counselors',
});
}

export default async function AdminCounselorsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/counselors');

  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const partners = await prisma.partner.findMany({
    take: 5000,
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="admin-main-content">
      <PageHeader title="Counselors" subtitle="Add organization counselors or partner-affiliated counselors." />
      <AdminCounselorsClient partners={partners} />
    </div>
  );
}
