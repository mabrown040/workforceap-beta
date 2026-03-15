import { SITE_URL } from '@/app/seo';

export default function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Workforce Advancement Project',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
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
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/programs?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
