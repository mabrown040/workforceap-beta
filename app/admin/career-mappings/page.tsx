import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import CareerMappingsClient from './CareerMappingsClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Career mappings (O*NET)',
  description: 'Manage WorkforceAP role mappings and O*NET alignment for admin workflows.',
  path: '/admin/career-mappings',
});
}

export default function AdminCareerMappingsPage() {
  return <CareerMappingsClient />;
}
