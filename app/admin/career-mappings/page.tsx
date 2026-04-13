import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import CareerMappingsClient from './CareerMappingsClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career mappings (O*NET)',
  description: 'Manage WorkforceAP role mappings and O*NET alignment for admin workflows.',
  path: '/admin/career-mappings',
});

export default function AdminCareerMappingsPage() {
  return <CareerMappingsClient />;
}
