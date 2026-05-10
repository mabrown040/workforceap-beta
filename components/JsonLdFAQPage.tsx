import { SITE_URL } from '@/app/seo';
import { FAQ_DATA } from '@/lib/content/faqData';

/**
 * Server-rendered FAQPage schema for the /faq page. Pulls every Q/A
 * from the same `FAQ_DATA` source the client component renders, so the
 * structured data and the visible page can never drift.
 *
 * Renders inside an `<script type="application/ld+json">` tag — invisible
 * to users, indexed by Google for rich-snippet eligibility.
 */
function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLdFAQPage() {
  const allItems = Object.values(FAQ_DATA).flat();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}/faq`,
    mainEntity: allItems.map((item) => ({
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
