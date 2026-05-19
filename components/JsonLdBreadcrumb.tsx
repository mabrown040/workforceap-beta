import { SITE_URL } from '@/app/seo';

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export type BreadcrumbItem = {
  /** Display name for the breadcrumb (e.g. "Programs"). */
  name: string;
  /** Site-relative path (e.g. "/programs"). Omit for the current/last item. */
  path?: string;
};

/**
 * Server-rendered BreadcrumbList schema (schema.org/BreadcrumbList).
 * Inserted as a `<script type="application/ld+json">` tag — invisible
 * to users, parsed by Google for breadcrumb rich results.
 *
 * Pass items in order, root-first. The last entry can omit `path` to
 * mark itself as the current page; we still emit a self-referencing
 * `item` URL so the schema validates either way.
 */
export default function JsonLdBreadcrumb({
  items,
  /** Path of the current page; used when the last item has no explicit path. */
  currentPath,
}: {
  items: BreadcrumbItem[];
  currentPath?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const resolvedPath = item.path ?? (index === items.length - 1 ? currentPath : undefined);
      const url = resolvedPath ? `${SITE_URL}${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}` : undefined;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(url ? { item: url } : {}),
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
