'use client';

import dynamic from 'next/dynamic';

const DeferredAnalytics = dynamic(() => import('@/components/DeferredAnalytics'), { ssr: false });
const CookieConsentBanner = dynamic(() => import('@/components/CookieConsentBanner'), { ssr: false });
const ScrollAnimationsWrapper = dynamic(() => import('@/components/ScrollAnimationsWrapper'), { ssr: false });

/** Analytics, cookie UI, and scroll observers — loaded after the shell (no SSR). */
export default function DeferredRootChrome({ suppressAnalytics = false }: { suppressAnalytics?: boolean }) {
  return (
    <>
      <ScrollAnimationsWrapper />
      {!suppressAnalytics ? <DeferredAnalytics /> : null}
      <CookieConsentBanner />
    </>
  );
}
