import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import CareerCounselor from '@/components/portal/tools/CareerCounselor';
import { studentCounselorVoiceSurface } from '@/lib/portal/voice';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Counselor',
  description: 'A private voice conversation with an AI career counselor. Leave with a personalized action plan.',
  path: '/dashboard/counselor',
  robots: { index: false, follow: false },
});

export default async function CounselorPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/counselor');

  const firstName = user.user_metadata?.full_name?.split(' ')[0] as string | undefined;

  return (
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
      <PageHeader
        title="AI Career Counselor"
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
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
          <VoiceAgentSurface {...studentCounselorVoiceSurface}>
            <CareerCounselor firstName={firstName} />
          </VoiceAgentSurface>
        </div>
      </div>
    </div>
  );
}
