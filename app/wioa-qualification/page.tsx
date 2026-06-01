import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Apply to WorkforceAP',
    description:
      'Start the WorkforceAP application and complete the screening questions staff need for funded pathway review.',
    path: '/wioa-qualification',
  });
}

export default function PublicWioaQualificationPage() {
  redirect('/apply');
}
