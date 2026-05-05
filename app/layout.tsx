import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, WAP_LOCALE_HEADER, isAppLocale } from '@/lib/i18n/config';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import SafeVercelMetrics from '@/components/SafeVercelMetrics';
import JsonLd from '@/components/JsonLd';
import ConditionalMarketingNav from '@/components/ConditionalMarketingNav';
import ChunkLoadRecovery from '@/components/ChunkLoadRecovery';
import ScrollAnimationsWrapper from '@/components/ScrollAnimationsWrapper';
import ConversionMetrics from '@/components/analytics/ConversionMetrics';
import PortalMetrics from '@/components/analytics/PortalMetrics';
import OrgBrandingStyle from '@/components/platform/OrgBrandingStyle';
import ThemeInitScript from '@/components/theme/ThemeInitScript';
import { getDefaultOrgBranding } from '@/lib/platform/defaultOrgTheme';
import '@/css/main.css';
import '@/css/marketing.css';
import '@/css/portal.css';
import '@/app/globals-onboarding.css';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.workforceap.org'),
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
    images: [{ url: '/images/hero-people.jpg', width: 1200, height: 630, alt: 'Workforce Advancement Project' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const orgBranding = await getDefaultOrgBranding();
  const h = await headers();
  const rawLang = h.get(WAP_LOCALE_HEADER);
  const htmlLang = rawLang && isAppLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const messages = await getMessages();
  return (
    <html lang={htmlLang}>
      <head>
        <ThemeInitScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var KEY='wap:chunk-reload-once';var shouldRecover=function(input){var text='';if(typeof input==='string')text=input;else if(input&&typeof input==='object'){text=[input.name,input.message,input.reason,input.request].filter(Boolean).join(' ');}text=String(text||'').toLowerCase();return text.includes('chunkloaderror')||text.includes('loading chunk')||text.includes('failed to fetch dynamically imported module');};var reloadOnce=function(){try{if(sessionStorage.getItem(KEY)==='1')return;sessionStorage.setItem(KEY,'1');}catch(_e){}window.location.reload();};window.addEventListener('error',function(event){var err=event&&event.error?event.error:null;var message=(event&&event.message)|| (err&&err.message) || err; if(shouldRecover(message)) reloadOnce();},{capture:true});window.addEventListener('unhandledrejection',function(event){var reason=event&&'reason' in event?event.reason:null; if(shouldRecover(reason)){if(event&&event.preventDefault)event.preventDefault();reloadOnce();}},{capture:true});}catch(_e){}})();`,
          }}
        />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WorkforceAP" />
        <meta name="theme-color" content="#ad2c4d" />
        <link rel="apple-touch-icon" href="/images/wap_logo.png" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* Material Symbols Outlined is self-hosted via @font-face in main.css */}
        {/* Register service worker — updateViaCache:'none' ensures browser always fetches fresh sw.js */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})}` }} />
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
            <script
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
        <ChunkLoadRecovery />
        <NextIntlClientProvider messages={messages}>
        <ConditionalMarketingNav />
        <main id="main-content">{children}</main>
        </NextIntlClientProvider>
        <ScrollAnimationsWrapper />
        <ConversionMetrics />
        <PortalMetrics />
        <SafeVercelMetrics />
      </body>
    </html>
  );
}
