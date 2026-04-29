import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { i18n } from './next-i18next.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same POSTGRES_* defaults as scripts/prisma-env.js so `next build` can run Prisma without errors
const require = createRequire(import.meta.url);
require('./scripts/ensure-prisma-env.cjs');

const nextConfig: NextConfig = {
  i18n,
  // When a lockfile exists outside this repo (e.g. user home), Next may pick the wrong root — breaks tracing + route collection.
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // Vercel build SIGKILL/OOM was hitting "Linting and checking validity
  // of types" with 8GB available — the project's grown past what
  // tsc-in-build can do on the standard build machine. Skipping these
  // here is safe because tsc --noEmit is run on every PR locally and
  // ESLint runs the same way; build-time check was redundant. If we
  // ever move to enhanced build machines this can be re-enabled.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera=(self) so mock-interview / practice video can use getUserMedia; mic already (self)
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com`,
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.zippopotam.us https://www.google-analytics.com https://www.googletagmanager.com https://va.vercel-insights.com https://vitals.vercel-insights.com https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://api.elevenlabs.io wss://api.elevenlabs.io https://livekit.rtc.elevenlabs.io wss://livekit.rtc.elevenlabs.io wss://*.livekit.cloud wss://*.elevenlabs.io https://*.elevenlabs.io",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' https://www.googletagmanager.com https://challenges.cloudflare.com",
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
    qualities: [85],
    localPatterns: [
      {
        pathname: '/images/**',
        search: '',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/images/logo-tight.svg' }];
  },
  async redirects() {
    return [
      // Legacy blog slug redirects (slug changes, old URLs must resolve)
      { source: '/blog/why-we-started-workforceap', destination: '/blog/our-mission', permanent: true },
      { source: '/blog/getting-started-guide', destination: '/blog/new-member-guide', permanent: true },
      { source: '/blog/career-change-2024', destination: '/blog/career-change-guide', permanent: true },
      { source: '/blog/it-certifications-explained', destination: '/blog/it-certifications-guide', permanent: true },
      { source: '/blog/remote-work-tips', destination: '/blog/remote-work-guide', permanent: true },

      // Legacy .html redirects
      { source: '/index.html', destination: '/', permanent: true },

      // Public marketing route aliases restored after responsive merge
      { source: '/about', destination: '/what-we-do', permanent: true },
      { source: '/about/', destination: '/what-we-do', permanent: true },
      { source: '/services', destination: '/what-we-do', permanent: true },
      { source: '/services/', destination: '/what-we-do', permanent: true },
      { source: '/careers', destination: '/find-your-path', permanent: true },
      { source: '/careers/', destination: '/find-your-path', permanent: true },
      { source: '/confirmation', destination: '/apply/confirmation', permanent: false },
      { source: '/confirmation/', destination: '/apply/confirmation', permanent: false },
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

      // Short portal entry → sign-in + destination chooser (avoids 404 on shared links)
      { source: '/portal', destination: '/login', permanent: false },
      { source: '/portal/', destination: '/login', permanent: false },

      // Sign-in aliases (avoids 404 for users typing /signin or /sign-in)
      { source: '/signin', destination: '/login', permanent: true },
      { source: '/signin/:path*', destination: '/login', permanent: true },
      { source: '/sign-in', destination: '/login', permanent: true },
      { source: '/sign-in/:path*', destination: '/login', permanent: true },

      // Supabase default sign-in path → actual login page (avoids 404 on magic-link redirects)
      { source: '/auth/sign-in', destination: '/login', permanent: false },
      { source: '/auth/sign-in/:path*', destination: '/login', permanent: false },

      // Subgroup "my group" portal removed — send to member dashboard
      { source: '/my-group', destination: '/dashboard', permanent: false },
      { source: '/my-group/:path*', destination: '/dashboard', permanent: false },

      // Employer dashboard canonical redirect
      { source: '/employer/dashboard', destination: '/employer', permanent: true },

      // Admin WIOA queue — short / legacy URLs
      { source: '/admin/wioa', destination: '/admin/wioa-screening', permanent: false },
      { source: '/admin/wioa/', destination: '/admin/wioa-screening', permanent: false },

      // Member workspace canonical URLs (legacy paths → /dashboard/*)
      { source: '/resources', destination: '/dashboard/career-library', permanent: false },
      { source: '/resources/', destination: '/dashboard/career-library', permanent: false },
      { source: '/help', destination: '/dashboard/help', permanent: false },
      { source: '/help/', destination: '/dashboard/help', permanent: false },
      { source: '/account', destination: '/dashboard/account', permanent: false },
      { source: '/account/', destination: '/dashboard/account', permanent: false },

      // Member portal: AI Tools, Career Brief, Learning, Weekly Recap live under /dashboard/*
      { source: '/ai-tools', destination: '/dashboard/ai-tools', permanent: true },
      { source: '/ai-tools/:path*', destination: '/dashboard/ai-tools/:path*', permanent: true },
      { source: '/career-brief', destination: '/dashboard/career-brief', permanent: true },
      { source: '/career-brief/:path*', destination: '/dashboard/career-brief/:path*', permanent: true },
      { source: '/learning', destination: '/dashboard/learning', permanent: true },
      { source: '/weekly-recap', destination: '/dashboard/weekly-recap', permanent: true },

      // Member portal legacy route fixes (QA-ISSUE-001)
      { source: '/dashboard/plan', destination: '/dashboard/career-brief', permanent: true },
      { source: '/dashboard/weekly-focus', destination: '/dashboard/weekly-recap', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
