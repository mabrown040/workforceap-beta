import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope } from '@/lib/tenant/adminPageScope';
import AdminJobReview from '@/components/admin/AdminJobReview';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PageHeader from '@/components/portal/PageHeader';
import { DesignSurface } from '@/components/portal/kit';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const user = await getUser();
    const scope = user ? await resolveAdminPageTenant(user.id) : { ok: false as const };
    const job = scope.ok
      ? await withAdminPageScope(scope, (db) => db.job.findFirst({ where: { id }, select: { title: true } }))
      : null;
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
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const { id } = await params;
  let job;
  try {
    // findFirst (not findUnique): withTenantScope injects organizationId,
    // which is not a Job unique-where field.
    job = await withAdminPageScope(scope, (db) =>
      db.job.findFirst({
        where: { id },
        include: {
          employer: { select: { id: true, companyName: true, contactEmail: true, contactName: true } },
          applications: {
            include: { student: { select: { id: true, fullName: true, email: true } } },
          },
        },
      }),
    );
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
