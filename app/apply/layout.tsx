import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickApplyClientMessages } from '@/lib/i18n/pickRootClientMessages';
// apply-funnel-depth.css reads --wa-* kit tokens with no fallbacks; the apply routes render under the
// root marketing layout, which never loads the token layer (only css/portal.css does).
import '@/css/portal-tokens.css';

/** Attach apply catalog here so the root layout does not ship it on every HTML response. */
export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const messages = pickApplyClientMessages(await getMessages());
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
