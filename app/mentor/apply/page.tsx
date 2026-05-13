import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import MentorApplyForm from './MentorApplyForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Mentor Application',
    description:
      'Apply to mentor with WorkforceAP. Help members build careers in technology, healthcare, manufacturing, and more.',
    path: '/mentor/apply',
  });
}

export default function MentorApplyPage() {
  return <MentorApplyForm />;
}
