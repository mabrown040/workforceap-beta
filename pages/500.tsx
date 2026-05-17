/**
 * Pages Router fallback so static export tooling can synthesize `.next/server/pages`.
 * Returning `null` has historically prevented some Next versions from emitting the
 * `/500` Pages route module in hybrid setups; keep one real DOM placeholder.
 */
export default function PagesRouter500Fallback() {
  return <span aria-hidden="true" />;
}
