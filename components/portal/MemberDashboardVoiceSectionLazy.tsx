'use client';

import dynamic from 'next/dynamic';
import VoiceSectionErrorBoundary from '@/components/portal/VoiceSectionErrorBoundary';

/**
 * Load voice panels only on the client so a bad ElevenLabs bundle / CSP edge case
 * cannot take down the entire dashboard shell.
 */
const MemberDashboardVoiceSection = dynamic(
  () => import('@/components/portal/MemberDashboardVoiceSection'),
  { ssr: false, loading: () => null }
);

export default function MemberDashboardVoiceSectionLazy() {
  return (
    <VoiceSectionErrorBoundary>
      <MemberDashboardVoiceSection />
    </VoiceSectionErrorBoundary>
  );
}
