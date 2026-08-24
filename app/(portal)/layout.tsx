import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalLayoutClient from '@/components/portal/PortalLayoutClient';
import LegacyViewNotice from '@/components/portal/LegacyViewNotice';
import { pickPortalClientMessages } from '@/lib/i18n/pickRootClientMessages';
import '@/css/portal.css';
import '@/css/portal-a11y.css';
import '@/css/counselor.css';
import '@/css/language-toggle.css';
import '@/css/mobile-dashboard-fixes.css';

export const metadata: Metadata = {
  title: 'Portal',
  robots: {
    index: false,
    follow: false,
  },
};

// Authenticated portal pages do heavy per-request server work (auth + member
// state + several DB reads + best-effort Coursera). Under the default function
// limit a cold-start render could exceed the budget and 504 ("Vercel Runtime
// Timeout" → the portal error boundary). Give the segment ample headroom so a
// slow render completes instead of erroring. Applies to all (portal) pages.
export const maxDuration = 60;

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = pickPortalClientMessages(await getMessages());
  return (
    <NextIntlClientProvider messages={messages}>
      <PartnerExclusiveServerGate />
      <LegacyViewNotice />
      <PortalLayoutClient>{children}</PortalLayoutClient>
    </NextIntlClientProvider>
  );
}
