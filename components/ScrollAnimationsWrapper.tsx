'use client';

import dynamic from 'next/dynamic';

const ScrollAnimations = dynamic(() => import('@/components/ScrollAnimations'), { ssr: false });

export default function ScrollAnimationsWrapper() {
  return <ScrollAnimations />;
}
