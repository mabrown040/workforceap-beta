import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.workforceap.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/invite/',
        '/dashboard/',
        '/employer/',
        '/partner/',
        '/counselor/',
        '/account/',
        '/applications/',
        '/certifications/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/setup-mfa',
        '/verify-mfa',
        '/apply/create-account',
        '/apply/confirmation',
        '/apply/results',
        '/apply/status',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
