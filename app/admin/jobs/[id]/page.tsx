import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AdminJobReview from '@/components/admin/AdminJobReview';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PageHeader from '@/components/portal/PageHeader';
import { DesignSurface } from '@/components/portal/kit';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const job = await prisma.job.findUnique({
      where: { id },
      select: { title: true },
    });
    return buildPageMetadataAsync({
      title: job ? `Review: ${job.title}` : 'Review Job',
      description: 'Review and approve job posting.',
      path: `/admin/jobs/${id}`,
    });
  } catch {
    return buildPageMetadataAsync({
      title: 'Review Job',
      description: 'Review and approve job posting.',
      path: `/admin/jobs/${id}`,
    });
  }
}

export default async function AdminJobDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/jobs');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { id } = await params;
  let job;
  try {
    job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: { select: { id: true, companyName: true, contactEmail: true, contactName: true } },
        applications: {
          include: { student: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });
  } catch (e) {
    console.error('[admin/jobs/[id]] load failed', e);
    return <AdminDataLoadError title="Job review unavailable" message="We could not load this job. Try again shortly." />;
  }

  if (!job) notFound();

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <PageHeader
        breadcrumbs={[{ label: 'Jobs', href: '/admin/jobs' }, { label: 'Job Review' }]}
        title={job.title}
      />
      <AdminJobReview job={job} />
    </DesignSurface>
  );
}
