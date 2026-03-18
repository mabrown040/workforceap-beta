import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import AssessmentsTable from '@/components/admin/AssessmentsTable';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Skills assessments',
  description: 'View and export member skills assessment results.',
  path: '/admin/assessments',
});

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; minScore?: string; maxScore?: string; userId?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/assessments');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const params = await searchParams;
  const programFilter = params.program?.trim() || undefined;
  const minScore = params.minScore ? parseInt(params.minScore, 10) : undefined;
  const maxScore = params.maxScore ? parseInt(params.maxScore, 10) : undefined;
  const highlightUserId = params.userId?.trim() || undefined;

  const andConditions: Array<Record<string, unknown>> = [];
  if (minScore !== undefined && !Number.isNaN(minScore)) {
    andConditions.push({ assessmentScorePct: { gte: minScore } });
  }
  if (maxScore !== undefined && !Number.isNaN(maxScore)) {
    andConditions.push({ assessmentScorePct: { lte: maxScore } });
  }

  const where = {
    assessmentCompleted: true,
    assessmentCompletedAt: { not: null } as const,
    ...(programFilter && { programInterest: { contains: programFilter, mode: 'insensitive' as const } }),
    ...(andConditions.length > 0 && { AND: andConditions }),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { assessmentCompletedAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      programInterest: true,
      assessmentScore: true,
      assessmentScorePct: true,
      assessmentCompletedAt: true,
      assessmentAnswers: true,
    },
  });

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Skills assessments</h1>
            <p>View member assessment results and export for counselor review.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/admin" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Admin
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <Suspense fallback={<p>Loading...</p>}>
            <AssessmentsTable
              users={users}
              highlightUserId={highlightUserId}
              programFilter={programFilter}
              minScore={minScore}
              maxScore={maxScore}
            />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
