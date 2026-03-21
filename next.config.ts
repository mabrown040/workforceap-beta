import { createRequire } from 'module';
import type { NextConfig } from 'next';

// Same POSTGRES_* defaults as scripts/prisma-env.js so `next build` can run Prisma without errors
const require = createRequire(import.meta.url);
require('./scripts/ensure-prisma-env.cjs');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-insights.com`,
              "connect-src 'self' https://*.supabase.co https://api.zippopotam.us https://www.google-analytics.com https://www.googletagmanager.com https://va.vercel-insights.com https://vitals.vercel-insights.com",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src https://www.googletagmanager.com",
              "form-action 'self' https://formspree.io",
            ].join('; '),
          },
        ],
      },
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      // Legacy .html redirects
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/apply.html', destination: '/apply', permanent: true },
      { source: '/programs.html', destination: '/programs', permanent: true },
      { source: '/what-we-do.html', destination: '/what-we-do', permanent: true },
      { source: '/how-it-works.html', destination: '/how-it-works', permanent: true },
      { source: '/faq.html', destination: '/faq', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
      { source: '/leadership.html', destination: '/leadership', permanent: true },
      { source: '/salary-guide.html', destination: '/salary-guide', permanent: true },
      { source: '/program-comparison.html', destination: '/program-comparison', permanent: true },

      // CompTIA slug redirects: slugify() drops '+' from program names.
      // 301s ensure any links with "plus" in the URL still resolve correctly.
      { source: '/programs/comptia-a-plus-professional-certificate', destination: '/programs/comptia-a-professional-certificate', permanent: true },
      { source: '/programs/comptia-network-plus-professional-certificate', destination: '/programs/comptia-network-professional-certificate', permanent: true },
      { source: '/programs/comptia-security-plus-professional-certificate', destination: '/programs/comptia-security-professional-certificate', permanent: true },

      // Short-form alternates that may appear in external links or social shares
      { source: '/programs/comptia-aplus', destination: '/programs/comptia-a-professional-certificate', permanent: true },
      { source: '/programs/comptia-network-plus', destination: '/programs/comptia-network-professional-certificate', permanent: true },
      { source: '/programs/comptia-security-plus', destination: '/programs/comptia-security-professional-certificate', permanent: true },

      // Employer dashboard canonical redirect
      { source: '/employer/dashboard', destination: '/employer', permanent: true },

      // Member portal: AI Tools, Career Brief, Learning, Weekly Recap live under /dashboard/*
      { source: '/ai-tools', destination: '/dashboard/ai-tools', permanent: true },
      { source: '/ai-tools/:path*', destination: '/dashboard/ai-tools/:path*', permanent: true },
      { source: '/career-brief', destination: '/dashboard/career-brief', permanent: true },
      { source: '/career-brief/:path*', destination: '/dashboard/career-brief/:path*', permanent: true },
      { source: '/learning', destination: '/dashboard/learning', permanent: true },
      { source: '/weekly-recap', destination: '/dashboard/weekly-recap', permanent: true },
    ];
  },
};

export default nextConfig;