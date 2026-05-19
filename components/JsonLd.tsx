import { SITE_URL } from '@/app/seo';

function safeJsonLdStringify(data: any) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLd() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Workforce Advancement Project',
    url: SITE_URL,
    description:
      'Career training and industry certifications designed to launch careers in Technology, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
    publisher: {
      '@type': 'Organization',
      name: 'Workforce Advancement Project',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/wap_logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/programs?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(websiteSchema) }}
    />
  );
}
