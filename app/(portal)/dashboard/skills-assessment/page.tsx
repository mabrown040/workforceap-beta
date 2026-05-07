import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'AI Toolkit',
    description: 'Explore AI-powered career tools — resume help, interview practice, skill mapping, and more.',
    path: '/dashboard/ai-tools',
  });
}

export default function SkillsAssessmentRedirectPage() {
  redirect('/dashboard/ai-tools?toast=Skills+Assessment+has+moved+to+the+AI+Toolkit');
}
