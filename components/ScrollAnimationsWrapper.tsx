'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ScrollAnimations = dynamic(() => import('@/components/ScrollAnimations'), { ssr: false });

export default function ScrollAnimationsWrapper() {
  const pathname = usePathname() ?? '';
  const [allowAnimations, setAllowAnimations] = useState(false);
  const isPortalOrAdmin =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employer') ||
    pathname.startsWith('/partner') ||
    pathname.startsWith('/counselor') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  useEffect(() => {
    if (isPortalOrAdmin) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setAllowAnimations(true);
    };
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(enable, 1);
    }
    return () => {
      cancelled = true;
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [isPortalOrAdmin]);

  if (isPortalOrAdmin) return null;
  if (!allowAnimations) return null;
  return <ScrollAnimations />;
}
