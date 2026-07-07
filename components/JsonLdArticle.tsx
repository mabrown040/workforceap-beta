import { SITE_URL } from '@/app/seo';

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  category: string | null;
}

export default function JsonLdArticle({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.coverImage?.trim() || `${SITE_URL}/images/AdobeStock_78118914.webp`;
  const datePublished = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
  const dateModified = post.updatedAt ? new Date(post.updatedAt).toISOString() : datePublished;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    image,
    url,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: post.authorName || 'Workforce Advancement Project',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Workforce Advancement Project',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/wap_logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(post.category ? { articleSection: post.category } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
