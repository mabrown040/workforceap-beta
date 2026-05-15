/**
 * Pages Router fallback so `next build` can produce `export/500.html` during the
 * hybrid export step (App Router + static optimization). Body is unused at runtime
 * for normal App Router flows — satisfies the build-time rename into `.next/server/pages`.
 */
export default function PagesRouter500() {
  return null;
}
