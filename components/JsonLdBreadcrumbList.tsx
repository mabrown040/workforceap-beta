import { SITE_URL } from '@/app/seo';

export type BreadcrumbListItem = {
  name: string;
  path: string;
};

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLdBreadcrumbList({ items }: { items: BreadcrumbListItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
