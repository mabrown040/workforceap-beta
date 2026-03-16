import type { NextConfig } from 'next';

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
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-insights.com",
              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://va.vercel-insights.com https://vitals.vercel-insights.com",
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
    ];
  },
};

export default nextConfig;
