import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import ProgramChangeRequestsAdminClient from './ProgramChangeRequestsAdminClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin — Program change requests',
  description: 'Review member requests to switch enrolled program.',
  path: '/admin/program-change-requests',
});
}

export default async function AdminProgramChangeRequestsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/program-change-requests');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const rows = await prisma.programChangeRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, fullName: true, enrolledProgram: true } },
    },
  });

  return (
    <>
      <PageHeader title="Program change requests" subtitle="Approve or deny enrollment changes requested by members." />
      <ProgramChangeRequestsAdminClient initialRows={JSON.parse(JSON.stringify(rows))} />
    </>
  );
}
