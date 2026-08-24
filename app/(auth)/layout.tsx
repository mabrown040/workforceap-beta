import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { heroPhotoForKey } from '@/lib/marketing/heroPhotos';
import { pickAuthClientMessages } from '@/lib/i18n/pickRootClientMessages';
import '@/css/auth-depth.css';

/**
 * (auth) route-group layout — VISUAL ONLY.
 *
 * Wraps every auth screen (login, signup, forgot/reset password, MFA
 * setup + verify) in a `.auth-depth` light-lock container so the forms
 * render in the light crimson "depth" look that matches the marketing
 * site, regardless of the user's dark-mode preference.
 *
 * The light lock is CSS-driven (css/auth-depth.css redefines the
 * surface/neutral tokens on this wrapper), so there is no post-paint
 * <html> class flip and therefore no dark→light flash. No auth logic,
 * redirects, Supabase calls, or handlers are touched here. Client i18n
 * is scoped to chrome + `auth` so public HTML does not carry this catalog.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const loginHero = heroPhotoForKey('/login');
  const messages = pickAuthClientMessages(await getMessages());
  return (
    <NextIntlClientProvider messages={messages}>
    <div
      className="auth-depth mdx"
      style={{ ['--wap-hero-photo-url' as string]: `url('${loginHero}')` }}
    >
      {children}
    </div>
    </NextIntlClientProvider>
  );
}
