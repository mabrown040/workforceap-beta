/**
 * Pages Router fallback so `next build` can produce `export/500.html` during the
 * hybrid export step (App Router + static optimization). Body is unused at runtime
 * for normal App Router flows — satisfies the build-time rename into `.next/server/pages`.
 *
 * Important: Returning `null` alone can prevent Next.js from emitting `500.js`,
 * which breaks the "Collecting page data" step (manifest requires the module path).
 */
export default function PagesRouter500() {
  return <span aria-hidden="true" />;
}
