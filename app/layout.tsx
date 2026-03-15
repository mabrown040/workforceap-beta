import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import TopBanner from '@/components/TopBanner';
import MainNav from '@/components/MainNav';
import ScrollAnimations from '@/components/ScrollAnimations';
import '@/css/main.css';

const GTM_ID = 'GTM-53JCT6WN';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.workforceap.org'),
  title: {
    default: '⭐ Virtual and Hybrid Occupation and Career Programs • Workforce Advancement Project',
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
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <TopBanner />
        <MainNav />
        <main id="main-content">{children}</main>
        <ScrollAnimations />
        <Analytics />
      </body>
    </html>
  );
}
