import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getScoreBreakdownSafe } from '@/lib/readiness/score';
import PageHeader from '@/components/portal/PageHeader';
import ReadinessMemberClient from './ReadinessMemberClient';
import ReadinessMobileScoreCard from '@/components/portal/ReadinessMobileScoreCard';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { readinessVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';
import { getMemberReadinessSections } from '@/lib/readiness/memberReadinessSections';
import '@/css/counselor.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Readiness Checklist',
  description: 'Track your progress toward being job-ready.',
  path: '/dashboard/readiness',
});

/**
 * Map the 10-item score breakdown into 4 mobile-friendly categories.
 */
function buildCategories(breakdown: Awaited<ReturnType<typeof getScoreBreakdownSafe>>) {
  const pct = (earned: number, max: number) => (max > 0 ? Math.round((earned / max) * 100) : 0);

  // Resume: buildResume (20) + completeProfile (5) = 25 max
  const resumeEarned = breakdown.buildResume.earned + breakdown.completeProfile.earned;
  const resumeMax = breakdown.buildResume.max + breakdown.completeProfile.max;

  // Certificates & Training: trackCertifications (5) + complete2Resources (10) + completePathwaySteps (15) + startPathway (5) = 35 max
  const certEarned = breakdown.trackCertifications.earned + breakdown.complete2Resources.earned + breakdown.completePathwaySteps.earned + breakdown.startPathway.earned;
  const certMax = breakdown.trackCertifications.max + breakdown.complete2Resources.max + breakdown.completePathwaySteps.max + breakdown.startPathway.max;

  // Interview Prep: practiceInterview (15) + addApplications (15) = 30 max
  const interviewEarned = breakdown.practiceInterview.earned + breakdown.addApplications.earned;
  const interviewMax = breakdown.practiceInterview.max + breakdown.addApplications.max;

  // Engagement: setGoals (10) + weeklyConsistency (5) = 15 max
  const engagementEarned = breakdown.setGoals.earned + breakdown.weeklyConsistency.earned;
  const engagementMax = breakdown.setGoals.max + breakdown.weeklyConsistency.max;

  return [
    { label: 'Resume & Profile', pct: pct(resumeEarned, resumeMax), icon: 'description', color: 'var(--color-blue, #3b82f6)' },
    { label: 'Training & Certs', pct: pct(certEarned, certMax), icon: 'workspace_premium', color: 'var(--color-accent)' },
    { label: 'Interview & Jobs', pct: pct(interviewEarned, interviewMax), icon: 'record_voice_over', color: 'var(--color-green, #22c55e)' },
    { label: 'Engagement', pct: pct(engagementEarned, engagementMax), icon: 'trending_up', color: 'var(--color-gold, #f59e0b)' },
  ];
}

function getPriorityAction(breakdown: Awaited<ReturnType<typeof getScoreBreakdownSafe>>) {
  // Find highest-impact incomplete item
  const priorities: { key: keyof typeof breakdown; label: string; href: string; weight: number }[] = [
    { key: 'buildResume', label: 'Build or upload your resume to boost your score.', href: '/dashboard/profile#resume', weight: 20 },
    { key: 'practiceInterview', label: 'Practice a mock interview to sharpen your skills.', href: '/dashboard/ai-tools/interview-practice', weight: 15 },
    { key: 'addApplications', label: 'Apply to at least 3 jobs to show employer readiness.', href: '/dashboard/jobs', weight: 15 },
    { key: 'completePathwaySteps', label: 'Complete more pathway steps in your training program.', href: '/dashboard/training', weight: 15 },
    { key: 'setGoals', label: 'Set career goals to stay on track.', href: '/dashboard/career-brief', weight: 10 },
    { key: 'complete2Resources', label: 'Complete 2+ learning resources.', href: '/dashboard/resources', weight: 10 },
    { key: 'completeProfile', label: 'Fill in your profile details for employer visibility.', href: '/dashboard/profile', weight: 5 },
    { key: 'trackCertifications', label: 'Add your certificates to showcase your skills.', href: '/dashboard/certifications', weight: 5 },
  ];

  for (const p of priorities) {
    if (!breakdown[p.key].done) {
      return { label: p.label, href: p.href };
    }
  }
  return null;
}

export default async function DashboardReadinessPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/readiness');

  const [breakdown, checklistSections] = await Promise.all([
    getScoreBreakdownSafe(user.id),
    getMemberReadinessSections(user.id).catch((e) => {
      console.error('[dashboard/readiness] checklist load failed', e);
      return null;
    }),
  ]);
  const overallScore = Math.min(100, Object.values(breakdown).reduce((sum, b) => sum + b.earned, 0));
  const categories = buildCategories(breakdown);
  const priorityAction = getPriorityAction(breakdown);

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.25rem' }}>
            Career Readiness
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Your readiness score across 4 key categories.
          </p>
        </div>

        <div style={{ padding: '0 1rem 1rem' }}>
          <VoiceAgentSurface {...readinessVoiceSurface}>
            <PortalVoiceSession
              sessionEndpoint="/api/member/readiness/voice-session"
              title="Talk through your readiness plan"
              description="Ask about interviews, certifications, LinkedIn, or your next milestone."
              accent="#0d9488"
              accentDark="#0f766e"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — share where you are"
            />
          </VoiceAgentSurface>
        </div>

        <ReadinessMobileScoreCard
          overallScore={overallScore}
          categories={categories}
          priorityAction={priorityAction}
        />

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div>
          <PageHeader
            title="Job Readiness Checklist"
            subtitle="Track your progress from training to landing a job. Your counselor updates this as you hit milestones."
            breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Job Readiness' }]}
          />
          <div style={{ marginBottom: '1.5rem' }}>
            <VoiceAgentSurface {...readinessVoiceSurface}>
              <PortalVoiceSession
                sessionEndpoint="/api/member/readiness/voice-session"
                title="Talk through your readiness plan"
                description="Ask about interviews, certifications, LinkedIn, or your next milestone."
                accent="#0d9488"
                accentDark="#0f766e"
                speakingLabel="Coach is speaking…"
                listeningLabel="Listening — share where you are"
              />
            </VoiceAgentSurface>
          </div>
          <ReadinessMemberClient
            initialSections={checklistSections ?? []}
            loadError={checklistSections === null ? 'We could not load your counselor checklist. Refresh the page or try again shortly.' : null}
          />
        </div>
      </div>
    </>
  );
}
