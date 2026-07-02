import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/siteEnvironment';

export const PRODUCTION_DISALLOW_PATHS = [
  '/admin/',
  '/api/',
  '/invite/',
  // Internal funder document (TWC/EdVera price list & bid letter) — unlisted
  // by design; the page also carries a noindex meta.
  '/programs/price-list',
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
] as const;

export const PRODUCTION_ALLOW_PATHS = ['/account/privacy'] as const;

export function buildProductionRobots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', ...PRODUCTION_ALLOW_PATHS],
        disallow: [...PRODUCTION_DISALLOW_PATHS],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

export function buildStagingRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
