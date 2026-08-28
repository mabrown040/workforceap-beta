import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { studentCounselorVoiceSurface } from '@/lib/portal/voice';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from 'next-intl/server';
import { MemberCounselorKit } from '@/components/portal/kit/pages/member/MemberCounselorKit';

const CareerCounselor = dynamic(() => import('@/components/portal/tools/CareerCounselor'), {
  loading: () => (
    <div className="wa-kit-card" style={{ padding: '2rem' }}>
      <p style={{ margin: 0, color: 'var(--wa-muted)' }}>Loading Lilley…</p>
    </div>
  ),
});

function parseActionPlan(output: string | null): string[] {
  if (!output) return [];
  const lines = output.split('\n');
  const steps: string[] = [];
  let inPlan = false;
  for (const line of lines) {
    if (line === 'Action plan') { inPlan = true; continue; }
    if (inPlan && line.startsWith('Transcript')) break;
    if (inPlan) {
      const m = line.match(/^\d+\.\s+(.+)/);
      if (m) steps.push(m[1]);
    }
  }
  return steps;
}

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Lilley, Your AI Career Coach',
  description: 'Talk with Lilley about training, your job search, or your next step, then leave with a personalized action plan.',
  path: '/dashboard/counselor',
  robots: { index: false, follow: false },
});
}

export default async function CounselorPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/counselor');
  const tCounselor = await getTranslations('counselor');
  const tCommon = await getTranslations('marketing.common');

  const dbProfile = await prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true } });
  const metaName = user.user_metadata?.full_name as string | undefined;
  const firstName = (dbProfile?.fullName ?? metaName)?.split(' ')[0];

  const pastSessions = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'career_counselor' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, output: true, createdAt: true },
  });

  const sessionSummaries = pastSessions.map((session) => ({
    id: session.id,
    dateLabel: new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    steps: parseActionPlan(session.output as string | null),
  }));

  return (
    <MemberCounselorKit
      title={tCommon('aiCounselor')}
      subtitle="Talk through your training, job search, or next step."
      pastSessionsLabel={tCounselor('pastSessions')}
      pastSessions={sessionSummaries}
      voiceSurface={
        <VoiceAgentSurface {...studentCounselorVoiceSurface}>
          <CareerCounselor firstName={firstName} />
        </VoiceAgentSurface>
      }
    />
  );
}
