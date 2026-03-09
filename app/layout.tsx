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
    default: 'Workforce Advancement Project',
    template: '%s - Workforce Advancement Project',
  },
  description:
    'Career training and industry certifications in technology, data, AI, and skilled trades for Austin-area learners.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <TopBanner />
        <MainNav />
        {children}
        <ScrollAnimations />
      </body>
    </html>
  );
}
