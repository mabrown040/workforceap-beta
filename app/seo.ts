import type { Metadata } from 'next';

export const SITE_URL = 'https://www.workforceap.org';

const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-people.jpg`;

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function buildPageMetadata({ title, description, path, image }: PageSeoInput): Metadata {
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'Workforce Advancement Project',
      locale: 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Workforce Advancement Project' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
