'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const ScrollAnimations = dynamic(() => import('@/components/ScrollAnimations'), { ssr: false });

export default function ScrollAnimationsWrapper() {
  const pathname = usePathname() ?? '';
  const isPortalOrAdmin =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employer') ||
    pathname.startsWith('/partner') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  if (isPortalOrAdmin) return null;
  return <ScrollAnimations />;
}
