import { SITE_URL } from '@/app/seo';
import { APPLY_FAQ_ITEMS } from '@/lib/content/applyFaqData';

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLdApplyFAQPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}/apply`,
    mainEntity: APPLY_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
