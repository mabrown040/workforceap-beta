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
  return (
    <div className="mdx">
      <section className="mdx-stage">
        <span className="mdx-pill">Become a Mentor</span>
        <h1>
          Mentor with <span className="mdx-grad-accent">WorkforceAP</span>
        </h1>
        <p>
          Help members build careers in technology, healthcare, manufacturing, and more.
        </p>
      </section>
      <MentorApplyForm />
    </div>
  );
}
