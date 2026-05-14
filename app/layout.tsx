import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, WAP_LOCALE_HEADER, isAppLocale, isRtlLocale } from '@/lib/i18n/config';
import type { AbstractIntlMessages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import JsonLd from '@/components/JsonLd';
import ConditionalMarketingNav from '@/components/ConditionalMarketingNav';
import ScrollAnimationsWrapper from '@/components/ScrollAnimationsWrapper';
import OrgBrandingStyle from '@/components/platform/OrgBrandingStyle';
import ThemeInitScript from '@/components/theme/ThemeInitScript';
import { getRequestOrgBranding } from '@/lib/platform/defaultOrgTheme';
import { WAP_RESERVE_MOBILE_BOTTOM_NAV_HEADER } from '@/lib/nav/mobileBottomNavLayout';
import {
  gucContextStorage,
  buildGucContext,
  ANONYMOUS_GUC_CONTEXT,
} from '@/lib/db/gucContext';
import { getProfileRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/auth/server';
import '@/css/main.css';
import '@/css/marketing.css';
import '@/css/language-toggle.css';
import DeferredAnalytics from '@/components/DeferredAnalytics';

const WAP_USER_ID_HEADER = 'x-wap-user-id';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/** Matches every `useTranslations('…')` namespace used under this provider (omit server-only bundles). */
function pickRootClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  type MsgRecord = Record<string, unknown>;
  const m = messages as MsgRecord;
  const mk = m.marketing as MsgRecord | undefined;
  const out: MsgRecord = {
    nav: m.nav,
    cta: m.cta,
    footer: m.footer,
    form: m.form,
    common: m.common,
    dashboard: m.dashboard,
    messages: m.messages,
    profile: m.profile,
    jobs: m.jobs,
    workspace: m.workspace,
    courseraProgress: m.courseraProgress,
    partner: m.partner,
    group: m.group,
    apply: m.apply,
  };
  if (mk && mk.programs !== undefined) {
    out.marketing = { programs: mk.programs };
  }
  return out as AbstractIntlMessages;
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.workforceap.org'),
  /** Default member-portal manifest; counselor routes override via `manifest` in `(portal)/counselor/layout.tsx`. */
  manifest: '/manifest.json',
  title: {
    default: 'Career Training at No Cost to Members | Workforce Advancement Project',
    template: '%s - Workforce Advancement Project',
  },
  description:
    'Occupational and career training, industry certifications, and support in Technology, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Workforce Advancement Project',
    description:
      'Career training and industry certifications in Technology, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
    url: '/',
    siteName: 'Workforce Advancement Project',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/images/hero-people.webp', width: 1200, height: 630, alt: 'Workforce Advancement Project' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();

  // Build GUC context from the verified user ID forwarded by middleware.
  // Middleware strips any client-supplied x-wap-user-id and only re-adds it
  // after cryptographically verifying the Supabase session.
  const forwardedUserId = h.get(WAP_USER_ID_HEADER);
  const resolvedUserId = forwardedUserId ?? (await getUser())?.id ?? null;
  let gucCtx = ANONYMOUS_GUC_CONTEXT;
  if (resolvedUserId) {
    const profileRole = await getProfileRole(resolvedUserId);
    gucCtx = buildGucContext({ userId: resolvedUserId, orgId: null, profileRole });
  }

  const orgBranding = await getRequestOrgBranding(h);
  const rawLang = h.get(WAP_LOCALE_HEADER);
  const htmlLang = rawLang && isAppLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const htmlDir = isRtlLocale(htmlLang) ? 'rtl' : 'ltr';
  const messages = pickRootClientMessages(await getMessages());
  const reserveMobileBottomNav = h.get(WAP_RESERVE_MOBILE_BOTTOM_NAV_HEADER) === '1';
  const htmlClassName = reserveMobileBottomNav ? 'wap-reserve-mobile-bottom-nav' : undefined;

  return await gucContextStorage.run(gucCtx, async () => (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className={`${inter.variable}${htmlClassName ? ' ' + htmlClassName : ''}`}>
      <head>
        <ThemeInitScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var KEY='wap:chunk-reload-once';try{sessionStorage.removeItem(KEY);}catch(_s){}var shouldRecover=function(input){var text='';if(typeof input==='string')text=input;else if(input&&typeof input==='object'){text=[input.name,input.message,input.reason,input.request].filter(Boolean).join(' ');}text=String(text||'').toLowerCase();return text.includes('chunkloaderror')||text.includes('loading chunk')||text.includes('failed to fetch dynamically imported module');};var reloadOnce=function(){try{if(sessionStorage.getItem(KEY)==='1')return;sessionStorage.setItem(KEY,'1');}catch(_e){}window.location.reload();};window.addEventListener('error',function(event){var err=event&&event.error?event.error:null;var message=(event&&event.message)|| (err&&err.message) || err; if(shouldRecover(message)) reloadOnce();},{capture:true});window.addEventListener('unhandledrejection',function(event){var reason=event&&'reason' in event?event.reason:null; if(shouldRecover(reason)){if(event&&event.preventDefault)event.preventDefault();reloadOnce();}},{capture:true});}catch(_e){}})();`,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WorkforceAP" />
        <meta name="theme-color" content="#ad2c4d" />
        <link rel="apple-touch-icon" href="/images/wap_logo.png" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {/* Material Symbols Outlined is self-hosted via @font-face in main.css */}
        {/* Register service worker — updateViaCache:'none' ensures browser always fetches fresh sw.js */}
        <Script id="sw-register" strategy="lazyOnload">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})}`}
        </Script>
      </head>
      <body>
        <OrgBrandingStyle branding={orgBranding} />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {/* Second skip link for keyboard users on portal pages with a fixed
            mobile bottom nav (audit #146). The nav is far from the
            top tab order; this lets a tab-only user reach it directly. */}
        <a href="#mobile-bottom-nav" className="skip-link">
          Skip to navigation
        </a>
        {GTM_ID && (
          <>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
            <Script
              id="gtm"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
              }}
            />
          </>
        )}
        <JsonLd />
        <NextIntlClientProvider messages={messages}>
        <ConditionalMarketingNav />
        <main id="main-content">{children}</main>
        </NextIntlClientProvider>
        <ScrollAnimationsWrapper />
        <DeferredAnalytics />
      </body>
    </html>
  ));
}
