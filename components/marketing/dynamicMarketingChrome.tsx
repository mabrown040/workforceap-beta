import dynamic from 'next/dynamic';

/** Below-the-fold footer chrome — async chunk vs static client imports on marketing routes. */
export const DynamicFooter = dynamic(() => import('@/components/Footer'));

export const DynamicMobileBottomNav = dynamic(() => import('@/components/MobileBottomNav'));
