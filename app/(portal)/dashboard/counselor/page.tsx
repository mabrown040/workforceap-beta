import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import Link from 'next/link';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import CareerCounselor from '@/components/portal/tools/CareerCounselor';
import { studentCounselorVoiceSurface } from '@/lib/portal/voice';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { makeServerT } from '@/lib/i18n/serverLabels';
import { getLocale } from '@/lib/i18n/serverLocale';

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
  title: 'AI Career Counselor',
  description: 'A private voice conversation with an AI career counselor. Leave with a personalized action plan.',
  path: '/dashboard/counselor',
  robots: { index: false, follow: false },
});
}

export default async function CounselorPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/counselor');
  const locale = await getLocale();
  const t = makeServerT(locale);

  const dbProfile = await prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true } });
  const metaName = user.user_metadata?.full_name as string | undefined;
  const firstName = (dbProfile?.fullName ?? metaName)?.split(' ')[0];

  const pastSessions = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'career_counselor' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, output: true, createdAt: true },
  });

  const historySection = pastSessions.length > 0 ? (
    <section style={{ padding: '1.5rem 1rem 2rem' }}>
      <h2 className="portal-section-heading" style={{ marginBottom: '1rem' }}>{t('Past sessions')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pastSessions.map((session) => {
          const steps = parseActionPlan(session.output as string | null);
          return (
            <Link
              key={session.id}
              href={`/dashboard/counselor/${session.id}`}
              className="counselor-history-card"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--surface-container)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: steps.length > 0 ? '0.5rem' : 0 }}>
                {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {steps.length > 0 && (
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {steps.map((step, i) => (
                    <li key={i} style={{ fontSize: '0.875rem' }}>{step}</li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .counselor-history-card:hover {
          background: var(--surface-container-high) !important;
          border-color: var(--color-accent) !important;
        }
      `}} />
    </section>
  ) : null;

  return (
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
      <PageHeader
        title={t('AI Career Counselor')}
        subtitle="Your session is private. Speak naturally — I'm here to help."
        breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'AI Career Counselor' }]}
      />

      {/* Mobile */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '0 1rem 1.5rem' }}>
          <VoiceAgentSurface {...studentCounselorVoiceSurface}>
            <CareerCounselor firstName={firstName} />
          </VoiceAgentSurface>
        </div>
        {historySection}
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
          <VoiceAgentSurface {...studentCounselorVoiceSurface}>
            <CareerCounselor firstName={firstName} />
          </VoiceAgentSurface>
          {historySection}
        </div>
      </div>
    </div>
  );
}
