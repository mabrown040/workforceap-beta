import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
// Core Astryx CSS (reset + astryx-base layers) is imported globally in
// app/layout.tsx. This lab additionally mounts the neutral theme provider to
// demo `@astryxdesign/theme-neutral` on top of the core defaults.
import AstryxThemeProvider from './theme-provider';

export const metadata = {
  title: 'Astryx Lab — Dev Proof',
  robots: { index: false, follow: false },
};

export default function DevAstryxLayout({ children }: { children: ReactNode }) {
  // Dev proof only — hidden in production like the other /dev routes.
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <AstryxThemeProvider>{children}</AstryxThemeProvider>;
}
