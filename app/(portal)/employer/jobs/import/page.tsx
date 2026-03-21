import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import ImportJobClient from './ImportJobClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Import jobs',
  description: 'Import job postings from URLs, LinkedIn, or careers pages as editable drafts.',
  path: '/employer/jobs/import',
});

export default async function ImportJobPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/import');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { companyName: true },
  });

  return (
    <ImportJobClient
      companyName={employer?.companyName ?? ''}
      programSlugs={PROGRAMS.map((p) => p.slug)}
    />
  );
}
