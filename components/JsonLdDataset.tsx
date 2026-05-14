import { SITE_URL } from '@/app/seo';

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

interface StatRow {
  label: string;
  value: string;
}

export default function JsonLdDataset({ stats }: { stats: StatRow[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Workforce Advancement Project Public Impact Stats',
    description:
      'Live WorkforceAP outcomes: members served, training completion, job placement, program results, and employer partnership statistics.',
    url: `${SITE_URL}/impact`,
    creator: {
      '@type': 'Organization',
      name: 'Workforce Advancement Project',
      url: SITE_URL,
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: '2020/..',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Austin / Central Texas',
    },
    variableMeasured: stats.map((s) => s.label),
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'HTML',
      contentUrl: `${SITE_URL}/impact`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
