import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AssessmentsTable from '@/components/admin/AssessmentsTable';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import { TableSkeleton } from '@/components/ui/Skeleton';
import PageHeader from '@/components/portal/PageHeader';
// Server-only: holds the answer key. Used here to pre-compute per-question
// correctness so AssessmentsTable (client) doesn't need to ship the key.
import { ASSESSMENT_QUESTIONS, type QuestionChoice } from '@/lib/assessment/answer-key';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Skills assessments',
  description: 'View and export member skills assessment results.',
  path: '/admin/assessments',
});
}

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

  let users;
  try {
    users = await prisma.user.findMany({
      take: 5000,
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
  } catch (e) {
    console.error('[admin/assessments] load failed', e);
    return <AdminDataLoadError title="Assessments unavailable" />;
  }

  // Pre-compute per-question correctness on the server so the client
  // bundle never receives the answer key (AUDIT §C-B3 defense-in-depth).
  const correctnessByUserId: Record<string, Record<number, boolean>> = {};
  for (const u of users) {
    const map: Record<number, boolean> = {};
    const raw = u.assessmentAnswers;
    if (raw && typeof raw === 'object') {
      const recorded = raw as Record<string | number, string | undefined>;
      for (const q of ASSESSMENT_QUESTIONS) {
        const ans = recorded[q.id] ?? recorded[String(q.id)];
        map[q.id] = ans === (q.correct as QuestionChoice);
      }
    }
    correctnessByUserId[u.id] = map;
  }

  return (
    <div>
      <PageHeader title="Skills assessments" subtitle="View member assessment results and export for counselor review." />

      <div>
          <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
            <AssessmentsTable
              users={users}
              correctnessByUserId={correctnessByUserId}
              highlightUserId={highlightUserId}
              programFilter={programFilter}
              minScore={minScore}
              maxScore={maxScore}
            />
          </Suspense>
      </div>
    </div>
  );
}
