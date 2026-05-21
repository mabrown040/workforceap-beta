import { formatTrustStripLine, loadTrustStripMetrics } from '@/lib/marketing/trustStripMetrics';

type TrustStripVariant = 'home' | 'apply';

type TrustStripProps = {
  variant?: TrustStripVariant;
};

export default async function TrustStrip({ variant = 'home' }: TrustStripProps) {
  const metrics = await loadTrustStripMetrics();
  const line = formatTrustStripLine(metrics);

  return (
    <section
      className={`trust-strip trust-strip--${variant}`}
      aria-label="Program outcomes"
    >
      <p className="trust-strip__line">{line}</p>
    </section>
  );
}
