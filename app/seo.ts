import type { Metadata } from 'next';

export const SITE_URL = 'https://www.workforceap.org';

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({ title, description, path }: PageSeoInput): Metadata {
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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
