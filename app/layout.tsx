import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TopBanner from '@/components/TopBanner';
import MainNav from '@/components/MainNav';
import ScrollAnimations from '@/components/ScrollAnimations';
import '@/css/main.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '⭐ Virtual and Hybrid Occupation and Career Programs • Workforce Advancement Project',
    template: '%s - Workforce Advancement Project',
  },
  description:
    'Occupational and career training, industry certifications, and support in Technology, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="site-football-wrapper">
          <TopBanner />
          <MainNav />
          {children}
          <ScrollAnimations />
        </div>
      </body>
    </html>
  );
}
