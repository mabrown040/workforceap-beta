import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import ImportJobClient from './ImportJobClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Import jobs',
  description: 'Import job postings from URLs, LinkedIn, or careers pages as editable drafts.',
  path: '/employer/jobs/import',
});
}

export default async function ImportJobPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/import');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { companyName: true },
  });

  const active = await getActivePrograms();
  const programSlugs = active.map((p) => p.slug);

  return (
    <ImportJobClient
      companyName={employer?.companyName ?? ''}
      programSlugs={programSlugs}
    />
  );
}
