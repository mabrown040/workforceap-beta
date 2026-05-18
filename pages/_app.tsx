import type { AppProps } from 'next/app';

/**
 * Minimal Pages Router shell — required so hybrid App Router + `/pages/**` bundles
 * have a stable root App component tree during `next build` page synthesis.
 */
export default function MinimalPagesRoot({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
