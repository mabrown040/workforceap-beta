import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
