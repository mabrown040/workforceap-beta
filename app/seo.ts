import type { Metadata } from 'next';

export const SITE_URL = 'https://www.workforceap.org';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-people.jpg`;

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  robots?: { index?: boolean; follow?: boolean };
};

export function buildPageMetadata({ title, description, path, image, robots }: PageSeoInput): Metadata {
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const fullUrl = path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: `${title} — Workforce Advancement Project`,
      description,
      url: fullUrl,
      siteName: 'Workforce Advancement Project | Austin, TX',
      locale: 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Workforce Advancement Project' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Workforce Advancement Project`,
      description,
      images: [ogImage],
    },
  };
  if (robots) {
    meta.robots = robots;
  }
  return meta;
}
