'use client';

import dynamic from 'next/dynamic';
import VoiceSectionErrorBoundary from '@/components/portal/VoiceSectionErrorBoundary';

const PortalVoiceSession = dynamic(
  () => import('@/components/portal/PortalVoiceSession'),
  { ssr: false, loading: () => null }
);

export default function PortalVoiceSessionLazy(props: React.ComponentProps<typeof PortalVoiceSession>) {
  return (
    <VoiceSectionErrorBoundary>
      <PortalVoiceSession {...props} />
    </VoiceSectionErrorBoundary>
  );
}
