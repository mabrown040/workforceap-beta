import { SITE_URL } from '@/app/seo';

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLdOrganization() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Workforce Advancement Project',
    url: SITE_URL,
    logo: `${SITE_URL}/images/wap_logo.png`,
    description:
      'Occupational and career training, industry certifications, and support in Technology, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
    email: 'info@workforceap.org',
    telephone: '+1-512-777-1808',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
    },
    sameAs: ['https://www.linkedin.com/company/workforceap'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(organizationSchema) }}
    />
  );
}
