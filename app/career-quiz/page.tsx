import type { Metadata } from 'next';
import { buildPageMetadataAsync, SITE_URL } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import PublicCareerQuizClient from '@/components/public/PublicCareerQuizClient';
import { typeSlugToLabel } from '@/lib/career/careerQuizRules';

// When someone shares their result (…/career-quiz?type=investigative-social&c=Registered+Nurse)
// the link gets a personalized title AND a custom share card (the dynamic /api/og/career-quiz
// PNG) so the social preview reads as a "what's your type?" hook, not a generic page.
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ type?: string; c?: string }> }
): Promise<Metadata> {
  const sp = await searchParams;
  const typeLabel = typeSlugToLabel(sp?.type);
  if (typeLabel) {
    const og = new URL(`${SITE_URL}/api/og/career-quiz`);
    if (sp.type) og.searchParams.set('type', sp.type);
    if (sp.c) og.searchParams.set('c', sp.c);
    return buildPageMetadataAsync({
      title: `My career type is ${typeLabel} — what's yours?`,
      description:
        'Take this free 6-question quiz and see the careers and no-cost WorkforceAP training that fit you. No account required.',
      path: '/career-quiz',
      image: og.toString(),
    });
  }
  return buildPageMetadataAsync({
    title: 'Free Career Quiz — Find Careers That Fit You',
    description:
      'Answer 6 quick questions and see careers and free WorkforceAP training that fit your interests. No account required.',
    path: '/career-quiz',
  });
}

export default async function PublicCareerQuizPage(
  { searchParams }: { searchParams: Promise<{ type?: string; c?: string }> }
) {
  const friendType = typeSlugToLabel((await searchParams)?.type);
  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(var(--nav-height-default, 80px) + 1.5rem) 1rem 3rem' }}>
        <PublicCareerQuizClient friendType={friendType} />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
